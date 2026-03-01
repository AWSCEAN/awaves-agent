"""Shared prediction service used by both REST and GraphQL endpoints.

Flow:
  1. Check Redis cache
  2. Call SageMaker endpoint (localhost:8080/invocations)
  3. Fallback to mock if SageMaker is unavailable
  4. Cache result in Redis
  5. Add week info + spot name
"""

import hashlib
import json
import logging
import random
import time as _time
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

import aioboto3
import httpx
from botocore.config import Config as BotoConfig

from app.config import settings
from app.middleware.metrics import emit_ml_inference_latency, emit_external_api_failure
from app.services.cache import InferenceCacheService as CacheService
from app.repositories.surf_data_repository import SurfDataRepository


@contextmanager
def _sagemaker_subsegment():
    """Wrap a block in an X-Ray subsegment for SageMaker calls."""
    try:
        from app.core.tracing import get_xray_recorder
        recorder = get_xray_recorder()
    except Exception:
        recorder = None

    if recorder is None:
        yield
        return

    subsegment = recorder.begin_subsegment("SageMaker_Invoke")
    if subsegment is None:
        yield
        return
    try:
        yield
    except Exception as exc:
        subsegment.add_exception(exc, stack=True)
        raise
    finally:
        recorder.end_subsegment()

logger = logging.getLogger(__name__)


async def get_surf_prediction(
    location_id: str,
    surf_date: str,
    surfer_level: str,
) -> dict:
    """Core prediction logic shared by REST and GraphQL.

    Returns full prediction dict ready for API response.
    """
    # 1. Check Redis cache
    cached = await CacheService.get_inference_prediction(location_id, surf_timestamp=surf_date)
    if cached:
        prediction = cached
    else:
        # Parse location
        parts = location_id.split("#")
        lat = float(parts[0]) if len(parts) >= 2 else 0.0
        lng = float(parts[1]) if len(parts) >= 2 else 0.0

        # 2. Call SageMaker endpoint
        sagemaker_result = await _call_sagemaker(
            location_id, surf_date, surfer_level, lat, lng
        )

        if sagemaker_result:
            prediction = _build_prediction(
                location_id, surf_date, lat, lng, surfer_level, sagemaker_result
            )
        else:
            # 3. Fallback to mock if SageMaker unavailable
            prediction = _generate_mock_prediction(
                location_id, surf_date, surfer_level, lat, lng
            )

        # 4. Cache the result
        await CacheService.store_inference_prediction(
            location_id, surf_timestamp=surf_date, data=prediction
        )

    # 5. Add week info + spot name
    _add_week_info(prediction, surf_date)
    await _add_spot_name(prediction, location_id)

    return prediction


async def _call_sagemaker(
    location_id: str,
    surf_date: str,
    surfer_level: str,
    lat: float,
    lng: float,
) -> dict | None:
    """Call SageMaker endpoint and return inference result.

    Uses AWS SageMaker Runtime when sagemaker_endpoint_name is configured,
    otherwise falls back to local HTTP endpoint (for local dev).

    Returns dict with surfGrade, surfScore, etc. or None on failure.
    """
    if settings.sagemaker_endpoint_name and settings.env != "local":
        return await _call_sagemaker_aws(location_id, surf_date, surfer_level, lat, lng)
    return await _call_sagemaker_local(location_id, surf_date, surfer_level, lat, lng)


async def _call_sagemaker_aws(
    location_id: str,
    surf_date: str,
    surfer_level: str,
    lat: float,
    lng: float,
) -> dict | None:
    """Call AWS SageMaker endpoint via boto3 sagemaker-runtime."""
    payload = {
        "location": location_id,
        "current_date": surf_date,
        "target_date": surf_date,
        "level": surfer_level,
        "lat": lat,
        "lon": lng,
    }

    session = aioboto3.Session(region_name=settings.aws_region or "us-east-1")
    config = BotoConfig(
        retries={"max_attempts": 2, "mode": "adaptive"},
        connect_timeout=5,
        read_timeout=30,
    )

    start = _time.perf_counter()
    try:
        with _sagemaker_subsegment():
            async with session.client("sagemaker-runtime", config=config) as client:
                response = await client.invoke_endpoint(
                    EndpointName=settings.sagemaker_endpoint_name,
                    ContentType="application/json",
                    Body=json.dumps(payload),
                )
                body = await response["Body"].read()
                result = json.loads(body.decode("utf-8"))
                latency_ms = (_time.perf_counter() - start) * 1000
                emit_ml_inference_latency(latency_ms)
                return result
    except Exception as e:
        logger.warning("SageMaker AWS endpoint call failed: %s", e)
        emit_external_api_failure("SageMaker")
        return None


async def _call_sagemaker_local(
    location_id: str,
    surf_date: str,
    surfer_level: str,
    lat: float,
    lng: float,
) -> dict | None:
    """Call SageMaker local Docker container endpoint via HTTP."""
    endpoint = settings.sagemaker_local_endpoint
    if not endpoint:
        logger.warning("No SageMaker endpoint configured (local or AWS)")
        return None

    payload = {
        "location": location_id,
        "date": surf_date,
        "level": surfer_level,
        "lat": lat,
        "lng": lng,
    }

    start = _time.perf_counter()
    try:
        with _sagemaker_subsegment():
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    endpoint,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                resp.raise_for_status()
                latency_ms = (_time.perf_counter() - start) * 1000
                emit_ml_inference_latency(latency_ms)
                return resp.json()
    except httpx.ConnectError:
        logger.warning("SageMaker endpoint not reachable at %s", endpoint)
        emit_external_api_failure("SageMaker")
        return None
    except httpx.HTTPStatusError as e:
        logger.warning("SageMaker endpoint returned error: %s", e)
        emit_external_api_failure("SageMaker")
        return None
    except Exception as e:
        logger.warning("SageMaker call failed: %s", e)
        emit_external_api_failure("SageMaker")
        return None


def _build_prediction(
    location_id: str,
    surf_date: str,
    lat: float,
    lng: float,
    surfer_level: str,
    sagemaker_result: dict,
) -> dict:
    """Build prediction response from SageMaker inference result."""
    # SageMaker returns surfGrade + surfScore
    surf_score = sagemaker_result.get("surfScore", 0)
    surf_grade = sagemaker_result.get("surfGrade", "D")

    level_map = {
        "beginner": "BEGINNER",
        "intermediate": "INTERMEDIATE",
        "advanced": "ADVANCED",
    }
    surfing_level = level_map.get(surfer_level.lower(), "INTERMEDIATE")

    return {
        "locationId": location_id,
        "surfTimestamp": f"{surf_date}T06:00:00Z",
        "geo": {"lat": lat, "lng": lng},
        "derivedMetrics": {
            "surfScore": surf_score,
            "surfGrade": surf_grade,
            "surfingLevel": surfing_level,
        },
        "metadata": {
            "modelVersion": sagemaker_result.get("modelVersion", "sagemaker-awaves-v1.0"),
            "dataSource": "open-meteo",
            "predictionType": "FORECAST",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "cacheSource": "SEARCH_INFERENCE",
        },
    }


def _generate_mock_prediction(
    location_id: str,
    surf_date: str,
    surfer_level: str,
    lat: float,
    lng: float,
) -> dict:
    """Generate deterministic mock prediction (fallback when SageMaker is down)."""
    seed_str = f"{location_id}-{surf_date}-{surfer_level}"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)

    surf_score = round(rng.uniform(30, 95), 1)
    grade = (
        "A"
        if surf_score >= 80
        else "B" if surf_score >= 60 else "C" if surf_score >= 40 else "D"
    )
    level_map = {
        "beginner": "BEGINNER",
        "intermediate": "INTERMEDIATE",
        "advanced": "ADVANCED",
    }
    surfing_level = level_map.get(surfer_level, "INTERMEDIATE")

    return {
        "locationId": location_id,
        "surfTimestamp": f"{surf_date}T06:00:00Z",
        "geo": {"lat": lat, "lng": lng},
        "derivedMetrics": {
            "surfScore": surf_score,
            "surfGrade": grade,
            "surfingLevel": surfing_level,
        },
        "metadata": {
            "modelVersion": "mock-v1.0",
            "dataSource": "mock",
            "predictionType": "FORECAST",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "cacheSource": "SEARCH_INFERENCE",
        },
    }


def _add_week_info(prediction: dict, surf_date: str) -> None:
    """Add week number and range to prediction dict."""
    dt = datetime.strptime(surf_date, "%Y-%m-%d")
    days_since_sunday = (dt.weekday() + 1) % 7
    week_start = dt - timedelta(days=days_since_sunday)
    week_end = week_start + timedelta(days=6)
    jan1 = datetime(dt.year, 1, 1)
    days_since_jan1_sunday = (jan1.weekday() + 1) % 7
    first_sunday = jan1 - timedelta(days=days_since_jan1_sunday)
    week_number = ((week_start - first_sunday).days // 7) + 1

    prediction["weekNumber"] = week_number
    prediction["weekRange"] = (
        f"{week_start.strftime('%b %d')} - {week_end.strftime('%b %d')}"
    )


async def _add_spot_name(prediction: dict, location_id: str) -> None:
    """Look up spot name from DynamoDB."""
    all_spots = await SurfDataRepository.get_all_spots_unpaginated()
    spot_name = location_id
    spot_name_ko = None
    for spot in all_spots:
        if spot.get("locationId") == location_id:
            spot_name = spot.get("name", location_id)
            spot_name_ko = spot.get("nameKo")
            break

    prediction["spotName"] = spot_name
    prediction["spotNameKo"] = spot_name_ko
