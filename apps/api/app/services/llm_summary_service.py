"""Bedrock LLM summary service with async Lambda invocation."""

import asyncio
import hashlib
import json
import logging

import aioboto3
from botocore.config import Config

from app.config import settings
from app.services.cache.llm_cache import LlmCacheService

logger = logging.getLogger(__name__)

# Track in-flight Lambda invocations to avoid duplicate calls
_inflight: dict[str, asyncio.Task] = {}

# Mock responses for local development (when Lambda is unavailable)
_MOCK_RESPONSES = [
    {
        "ko": "상급자에게 딱이에요. 오버헤드급 묵직한 너울이 꾸준히 밀려오니 실력 발휘하기 최적이네요.",
        "en": "Perfect for advanced riders. Those overhead swells with consistent power are ideal for showing off your skills.",
    },
    {
        "ko": "초급자에게 적당한 무릎~허리 사이즈 파도예요. 바람이 조금 세니 안전에 주의하세요.",
        "en": "Suitable knee-to-waist high waves for beginners. Wind is picking up, so stay cautious and aware of your surroundings.",
    },
]


def _task_key(location_id: str, surf_timestamp: str, level: str) -> str:
    return f"{location_id}:{surf_timestamp}:{level}"


def _pick_mock(location_id: str, surf_timestamp: str, level: str) -> dict:
    """Deterministically pick a mock response based on the input."""
    seed = hashlib.md5(f"{location_id}:{surf_timestamp}:{level}".encode()).hexdigest()
    idx = int(seed, 16) % len(_MOCK_RESPONSES)
    return _MOCK_RESPONSES[idx]


async def get_or_trigger_llm_summary(
    location_id: str, surf_timestamp: str, surfing_level: str
) -> dict:
    """Return cached LLM summary or trigger a background Lambda invocation.

    Returns:
        {"status": "success", "advice": {"ko": "...", "en": "..."}}
        {"status": "loading"}
        {"status": "failed"}
    """
    level = surfing_level.upper()

    # 1. Check Redis cache
    cached = await LlmCacheService.get_llm_summary(location_id, surf_timestamp, level)
    if cached:
        return cached

    # 2. Check if a background task is already running
    key = _task_key(location_id, surf_timestamp, level)
    task = _inflight.get(key)
    if task and not task.done():
        return {"status": "loading"}

    # 3. Spawn background task
    task = asyncio.create_task(
        _invoke_and_cache(location_id, surf_timestamp, level)
    )
    _inflight[key] = task
    task.add_done_callback(lambda _: _inflight.pop(key, None))

    return {"status": "loading"}


async def _invoke_and_cache(
    location_id: str, surf_timestamp: str, level: str
) -> None:
    """Invoke Lambda (or return mock in local env) and cache the result."""
    if settings.env == "local":
        await _mock_and_cache(location_id, surf_timestamp, level)
    else:
        await _invoke_lambda_and_cache(location_id, surf_timestamp, level)


async def _mock_and_cache(
    location_id: str, surf_timestamp: str, level: str
) -> None:
    """Simulate Lambda latency and return mock data for local development."""
    await asyncio.sleep(2)  # simulate Bedrock latency
    advice = _pick_mock(location_id, surf_timestamp, level)
    cache_data = {"status": "success", "advice": advice}
    await LlmCacheService.store_llm_summary(
        location_id, surf_timestamp, level, cache_data
    )
    logger.info("LLM summary (mock) cached for %s/%s/%s", location_id, surf_timestamp, level)


async def _invoke_lambda_and_cache(
    location_id: str, surf_timestamp: str, level: str
) -> None:
    """Invoke the Bedrock summary Lambda and cache the result."""
    session = aioboto3.Session(
        region_name=settings.aws_region or "us-east-1"
    )
    config = Config(
        retries={"max_attempts": 2, "mode": "adaptive"},
        connect_timeout=5,
        read_timeout=30,
    )

    try:
        payload = {
            "location_id": location_id,
            "surf_timestamp": surf_timestamp,
            "surfing_level": level,
        }

        async with session.client("lambda", config=config) as client:
            response = await client.invoke(
                FunctionName=settings.llm_summary_lambda_name,
                InvocationType="RequestResponse",
                Payload=json.dumps(payload),
            )

            response_payload = await response["Payload"].read()
            result = json.loads(response_payload.decode("utf-8"))

        # Lambda may return either:
        #   1. {"statusCode": 200, "body": "{\"advice\":{...}}"}  (API Gateway format)
        #   2. {"advice": {"ko": "...", "en": "..."}, ...}         (direct invocation)
        advice = None
        if result.get("statusCode") == 200:
            body = result.get("body")
            if isinstance(body, str):
                body = json.loads(body)
            advice = body.get("advice") if body else None
        elif "advice" in result:
            advice = result["advice"]

        if advice:
            cache_data = {"status": "success", "advice": advice}
            await LlmCacheService.store_llm_summary(
                location_id, surf_timestamp, level, cache_data
            )
            logger.info("LLM summary cached for %s/%s/%s", location_id, surf_timestamp, level)
            return

        # Non-200 or missing advice
        logger.warning("Lambda returned unexpected result: %s", result)
        await LlmCacheService.store_llm_summary(
            location_id, surf_timestamp, level,
            {"status": "failed"}, ttl=60,
        )

    except Exception as e:
        logger.error("Lambda invocation failed for %s: %s", location_id, e)
        await LlmCacheService.store_llm_summary(
            location_id, surf_timestamp, level,
            {"status": "failed"}, ttl=60,
        )
