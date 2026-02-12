"""DynamoDB service for surf_info table operations."""

import logging
import math
import time as _time
from typing import Optional

import aioboto3
from botocore.config import Config

from app.config import settings
from app.services.cache import CacheService

logger = logging.getLogger(__name__)

# In-memory cache for full DynamoDB scan (avoids repeated full-table scans)
_scan_cache: list[dict] = []
_scan_cache_time: float = 0.0
_SCAN_CACHE_TTL: float = 300.0  # 5 minutes

# Pre-indexed date cache: date_str -> list of raw DDB items for that date
_date_index: dict[str, list[dict]] = {}
_date_index_time: float = 0.0

# Result cache for get_spots_for_date: "date|time" -> processed spots list
_spots_for_date_cache: dict[str, list[dict]] = {}
_spots_for_date_cache_time: float = 0.0


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two coordinates in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class SurfDynamoDBService:
    """Service for DynamoDB operations on surf_info table."""

    _session: Optional[aioboto3.Session] = None
    TABLE_NAME = settings.dynamodb_surf_data_table

    @classmethod
    def _get_session(cls) -> aioboto3.Session:
        if cls._session is None:
            cls._session = aioboto3.Session(
                aws_access_key_id=settings.aws_access_key_id or "dummy",
                aws_secret_access_key=settings.aws_secret_access_key or "dummy",
                region_name=settings.aws_region,
            )
        return cls._session

    @classmethod
    async def get_client(cls):
        session = cls._get_session()
        config = Config(
            retries={"max_attempts": 3, "mode": "adaptive"},
            connect_timeout=5,
            read_timeout=10,
        )
        endpoint_url = settings.ddb_endpoint_url if settings.ddb_endpoint_url else None
        return session.client("dynamodb", endpoint_url=endpoint_url, config=config)

    @classmethod
    async def _scan_all_items(cls) -> list[dict]:
        """Scan all items from DynamoDB. Uses in-memory cache to avoid repeated scans."""
        global _scan_cache, _scan_cache_time, _date_index, _date_index_time, _spots_for_date_cache, _spots_for_date_cache_time

        if _scan_cache and (_time.monotonic() - _scan_cache_time) < _SCAN_CACHE_TTL:
            return _scan_cache

        try:
            async with await cls.get_client() as client:
                all_items: list[dict] = []
                params: dict = {"TableName": cls.TABLE_NAME}
                while True:
                    response = await client.scan(**params)
                    all_items.extend(response.get("Items", []))
                    if "LastEvaluatedKey" not in response:
                        break
                    params["ExclusiveStartKey"] = response["LastEvaluatedKey"]

                _scan_cache = all_items
                _scan_cache_time = _time.monotonic()

                # Build date index for fast date-filtered lookups
                new_index: dict[str, list[dict]] = {}
                for item in all_items:
                    ts = item["SurfTimestamp"]["S"]
                    date_key = ts[:10]  # "YYYY-MM-DD"
                    if date_key not in new_index:
                        new_index[date_key] = []
                    new_index[date_key].append(item)
                _date_index = new_index
                _date_index_time = _scan_cache_time
                # Clear processed result cache since underlying data changed
                _spots_for_date_cache = {}
                _spots_for_date_cache_time = 0.0

                logger.info(f"DynamoDB scan cached: {len(all_items)} items, {len(new_index)} dates indexed")
                return all_items
        except Exception as e:
            logger.error(f"Failed to scan all items: {e}")
            return _scan_cache if _scan_cache else []

    @classmethod
    async def _get_all_spots_raw(cls) -> list[dict]:
        """Get all unique locations with latest forecast. Uses Redis cache."""
        cached = await CacheService.get_all_surf_spots()
        if cached is not None:
            return cached

        all_items = await cls._scan_all_items()
        location_map: dict[str, dict] = {}
        for item in all_items:
            loc_id = item["LocationId"]["S"]
            ts = item["SurfTimestamp"]["S"]
            if loc_id not in location_map or ts > location_map[loc_id]["SurfTimestamp"]["S"]:
                location_map[loc_id] = item

        spots = [cls._to_surf_info(item) for item in location_map.values()]
        spots.sort(
            key=lambda s: s["derivedMetrics"]["surfScore"], reverse=True
        )

        await CacheService.store_all_surf_spots(spots)

        return spots

    @classmethod
    async def get_spots_for_date(
        cls, date: Optional[str] = None, time: Optional[str] = None
    ) -> list[dict]:
        """Get one spot per location filtered by date and optionally time.

        Args:
            date: Date string in YYYY-MM-DD format.
            time: Time string in HH:MM format (e.g. '06:00').
        """
        global _spots_for_date_cache, _spots_for_date_cache_time

        if not date:
            return await cls._get_all_spots_raw()

        # Check result cache (invalidated when scan cache expires)
        cache_key = f"{date}|{time or ''}"
        if (
            _spots_for_date_cache_time >= _scan_cache_time
            and _scan_cache_time > 0
            and cache_key in _spots_for_date_cache
        ):
            return _spots_for_date_cache[cache_key]

        # Ensure scan cache and date index are built
        await cls._scan_all_items()

        # Use pre-indexed date lookup (O(1)) instead of scanning all items
        filtered = _date_index.get(date, [])

        if not filtered:
            return []

        if time:
            # Try to find items matching the exact time (e.g. "2026-02-14T06:00")
            datetime_prefix = f"{date}T{time}"
            time_matched = [
                item for item in filtered
                if item["SurfTimestamp"]["S"].startswith(datetime_prefix)
            ]
            if time_matched:
                filtered = time_matched
            # If no exact time match, fall back to closest time per location below

        # Pick one item per location: prefer closest to requested time
        location_map: dict[str, dict] = {}
        for item in filtered:
            loc_id = item["LocationId"]["S"]
            ts = item["SurfTimestamp"]["S"]
            if loc_id not in location_map:
                location_map[loc_id] = item
            else:
                existing_ts = location_map[loc_id]["SurfTimestamp"]["S"]
                if time:
                    target = f"{date}T{time}"
                    # Compare full time portion (HH:MM) for proper closest-time selection
                    ts_time = ts[11:16] if len(ts) > 15 else ts[11:]
                    ex_time = existing_ts[11:16] if len(existing_ts) > 15 else existing_ts[11:]
                    tg_time = target[11:16] if len(target) > 15 else target[11:]
                    if abs(int(ts_time.replace(":", "")) - int(tg_time.replace(":", ""))) < abs(int(ex_time.replace(":", "")) - int(tg_time.replace(":", ""))):
                        location_map[loc_id] = item
                else:
                    # Without time, keep latest for the day
                    if ts > existing_ts:
                        location_map[loc_id] = item

        spots = [cls._to_surf_info(item) for item in location_map.values()]
        spots.sort(
            key=lambda s: s["derivedMetrics"]["surfScore"], reverse=True
        )

        # Cache the processed result
        _spots_for_date_cache[cache_key] = spots
        _spots_for_date_cache_time = _time.monotonic()

        return spots

    @classmethod
    async def get_all_spots(
        cls, page: int = 1, page_size: int = 20
    ) -> tuple[list[dict], int]:
        """Get all unique locations with their latest forecast data."""
        spots = await cls._get_all_spots_raw()
        total = len(spots)
        start = (page - 1) * page_size
        end = start + page_size
        return spots[start:end], total

    @classmethod
    async def get_all_spots_unpaginated(cls) -> list[dict]:
        """Return all spots without pagination, for map marker display."""
        return await cls._get_all_spots_raw()

    @classmethod
    async def get_spot_data(
        cls, location_id: str, date: Optional[str] = None
    ) -> list[dict]:
        """Get forecast data for a specific location."""
        try:
            async with await cls.get_client() as client:
                key_expr = "LocationId = :lid"
                expr_values: dict = {":lid": {"S": location_id}}

                if date:
                    key_expr += " AND begins_with(SurfTimestamp, :d)"
                    expr_values[":d"] = {"S": date}

                response = await client.query(
                    TableName=cls.TABLE_NAME,
                    KeyConditionExpression=key_expr,
                    ExpressionAttributeValues=expr_values,
                )
                return [cls._to_surf_info(item) for item in response.get("Items", [])]
        except Exception as e:
            logger.error(f"Failed to get spot data: {e}")
            return []

    @classmethod
    async def search_spots(
        cls, query: str, date: Optional[str] = None, time: Optional[str] = None
    ) -> list[dict]:
        """Search spots by coordinate substring in LocationId."""
        spots = await cls.get_spots_for_date(date, time)
        query_lower = query.lower()
        return [s for s in spots if query_lower in s["LocationId"].lower()]

    @classmethod
    async def get_nearby_spots(
        cls, lat: float, lng: float, limit: int = 25,
        date: Optional[str] = None, time: Optional[str] = None,
    ) -> list[dict]:
        """Get spots sorted by distance from given coordinates."""
        spots = await cls.get_spots_for_date(date, time)

        spots_with_distance = []
        for spot in spots:
            spot_copy = {**spot}
            spot_copy["distance"] = round(
                _haversine(lat, lng, spot["geo"]["lat"], spot["geo"]["lng"]), 2
            )
            spots_with_distance.append(spot_copy)

        spots_with_distance.sort(key=lambda s: s["distance"])
        return spots_with_distance[:limit]

    @classmethod
    def _numeric_grade_to_letter(cls, grade_str: str) -> str:
        """Convert numeric grade (e.g. '3.0') to letter grade, or pass through."""
        try:
            val = float(grade_str)
            if val >= 3.0:
                return "A+"
            elif val >= 2.5:
                return "A"
            elif val >= 2.0:
                return "B"
            elif val >= 1.0:
                return "C"
            else:
                return "D"
        except (ValueError, TypeError):
            return grade_str

    @classmethod
    def _surfing_level_to_difficulty(cls, level: str) -> str:
        """Map surfingLevel to difficulty."""
        mapping = {
            "BEGINNER": "beginner",
            "INTERMEDIATE": "intermediate",
            "ADVANCED": "advanced",
        }
        return mapping.get(level, "intermediate")

    @classmethod
    def _to_surf_info(cls, item: dict) -> dict:
        """Convert DynamoDB item to SurfInfo dict matching FE type."""
        loc_id = item["LocationId"]["S"]
        parts = loc_id.split("#")
        lat = float(parts[0]) if len(parts) >= 2 else 0.0
        lng = float(parts[1]) if len(parts) >= 2 else 0.0

        geo = item.get("geo", {}).get("M", {})
        conditions = item.get("conditions", {}).get("M", {})
        derived = item.get("derivedMetrics", {}).get("M", {})
        metadata = item.get("metadata", {}).get("M", {})

        location = item.get("location", {}).get("M", {})
        display_name = location.get("displayName", {}).get("S", "")
        city = location.get("city", {}).get("S", "")
        state = location.get("state", {}).get("S", "")
        country = location.get("country", {}).get("S", "")

        raw_grade = derived.get("surfGrade", {}).get("S", "D")
        surf_grade = cls._numeric_grade_to_letter(raw_grade)
        surfing_level = derived.get("surfingLevel", {}).get("S", "BEGINNER")

        display_name = location.get("displayName", {}).get("S", "")
        name = display_name if display_name else f"{lat}, {lng}"

        return {
            "LocationId": loc_id,
            "SurfTimestamp": item["SurfTimestamp"]["S"],
            "geo": {
                "lat": float(geo.get("lat", {}).get("N", str(lat))),
                "lng": float(geo.get("lng", {}).get("N", str(lng))),
            },
            "conditions": {
                "waveHeight": float(conditions.get("waveHeight", {}).get("N", "0")),
                "wavePeriod": float(conditions.get("wavePeriod", {}).get("N", "0")),
                "windSpeed": float(conditions.get("windSpeed", {}).get("N", "0")),
                "waterTemperature": float(
                    conditions.get("waterTemperature", {}).get("N", "0")
                ),
            },
            "derivedMetrics": {
                "surfScore": float(derived.get("surfScore", {}).get("N", "0")),
                "surfGrade": surf_grade,
                "surfingLevel": surfing_level,
            },
            "metadata": {
                "modelVersion": metadata.get("modelVersion", {}).get(
                    "S", "sagemaker-awaves-v1.2"
                ),
                "dataSource": metadata.get("dataSource", {}).get("S", "open-meteo"),
                "predictionType": metadata.get("predictionType", {}).get(
                    "S", "FORECAST"
                ),
                "createdAt": metadata.get("createdAt", {}).get("S", ""),
            },
            "name": name,
            "city": city,
            "region": state,
            "country": country,
            "address": display_name,
            "waveType": "Beach Break",
            "bestSeason": [],
        }
