"""Repository for surf_info DynamoDB table operations."""

import logging
import math
import time as _time
from typing import Optional

from app.config import settings
from app.repositories.base_repository import BaseDynamoDBRepository, dynamodb_subsegment
from app.services.cache import SurfSpotsCacheService as CacheService

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


class SurfDataRepository(BaseDynamoDBRepository):
    """Repository for surf forecast data (surf_info table)."""

    TABLE_NAME = settings.dynamodb_surf_data_table

    @classmethod
    async def create_table_if_not_exists(cls) -> bool:
        """Create surf_info table if it doesn't exist.

        If the table exists but has an old key schema (e.g. PascalCase),
        it is dropped and recreated with the correct camelCase keys.
        """
        if not cls.TABLE_NAME:
            logger.warning("DYNAMODB_SURF_DATA_TABLE is not configured, skipping table creation")
            return False

        expected_pk, expected_sk = "locationId", "surfTimestamp"

        try:
            async with await cls.get_client() as client:
                need_create = False
                try:
                    desc = await client.describe_table(TableName=cls.TABLE_NAME)
                    key_schema = desc["Table"]["KeySchema"]
                    pk = next(k["AttributeName"] for k in key_schema if k["KeyType"] == "HASH")
                    sk = next(k["AttributeName"] for k in key_schema if k["KeyType"] == "RANGE")

                    if pk == expected_pk and sk == expected_sk:
                        return True

                    logger.info(
                        f"Table {cls.TABLE_NAME} has old key schema ({pk}/{sk}). "
                        f"Recreating with {expected_pk}/{expected_sk}..."
                    )
                    await client.delete_table(TableName=cls.TABLE_NAME)
                    waiter = client.get_waiter("table_not_exists")
                    await waiter.wait(TableName=cls.TABLE_NAME)
                    need_create = True

                except client.exceptions.ResourceNotFoundException:
                    need_create = True

                if need_create:
                    logger.info(f"Creating DynamoDB table {cls.TABLE_NAME}")
                    await client.create_table(
                        TableName=cls.TABLE_NAME,
                        KeySchema=[
                            {"AttributeName": expected_pk, "KeyType": "HASH"},
                            {"AttributeName": expected_sk, "KeyType": "RANGE"},
                        ],
                        AttributeDefinitions=[
                            {"AttributeName": expected_pk, "AttributeType": "S"},
                            {"AttributeName": expected_sk, "AttributeType": "S"},
                        ],
                        BillingMode="PAY_PER_REQUEST",
                    )
                    logger.info(f"DynamoDB table {cls.TABLE_NAME} created")
                    return True
        except Exception as e:
            logger.warning(f"Failed to create table {cls.TABLE_NAME}: {e}")
            return False

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
                with dynamodb_subsegment("DynamoDB_Scan"):
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
                    ts = item["surfTimestamp"]["S"]
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
    async def _enrich_with_korean(cls, spots: list[dict]) -> list[dict]:
        """Enrich spots with location metadata from locations table.

        Fills in Korean address fields and also backfills English fields
        (name, city, region, country, address) when they are missing from
        the surf_info data.
        """
        if not spots:
            return spots

        try:
            loc_ids = [s["locationId"] for s in spots]
            # BatchGetItem: max 100 keys per request
            loc_map: dict[str, dict] = {}
            for i in range(0, len(loc_ids), 100):
                batch_ids = loc_ids[i:i + 100]
                keys = [{"locationId": {"S": lid}} for lid in batch_ids]
                async with await cls.get_client() as client:
                    resp = await client.batch_get_item(
                        RequestItems={
                            settings.dynamodb_locations_table: {
                                "Keys": keys,
                            }
                        }
                    )
                for item in resp.get("Responses", {}).get(settings.dynamodb_locations_table, []):
                    lid = item["locationId"]["S"]

                    def _get(field: str, *fallbacks: str) -> str | None:
                        """Read a DDB string attr, trying camelCase then fallback names."""
                        val = item.get(field, {}).get("S", "") or ""
                        if not val:
                            for fb in fallbacks:
                                val = item.get(fb, {}).get("S", "") or ""
                                if val:
                                    break
                        return val or None

                    loc_map[lid] = {
                        # English fields (camelCase → snake_case fallback)
                        "display_name": _get("displayName", "display_name"),
                        "city": _get("city"),
                        "region": _get("state"),
                        "country": _get("country"),
                        # Korean fields (camelCase → snake_case fallback)
                        "nameKo": _get("displayNameKo", "display_name_ko"),
                        "cityKo": _get("cityKo", "city_ko"),
                        "regionKo": _get("stateKo", "state_ko"),
                        "countryKo": _get("countryKo", "country_ko"),
                        "addressKo": _get("displayNameKo", "display_name_ko"),
                    }

            for spot in spots:
                loc = loc_map.get(spot["locationId"])
                if not loc:
                    continue
                # Backfill English fields when missing from surf_info data
                if not spot.get("name") or spot["name"] == f"{spot['geo']['lat']}, {spot['geo']['lng']}":
                    if loc.get("display_name"):
                        spot["name"] = loc["display_name"]
                if not spot.get("address") and loc.get("display_name"):
                    spot["address"] = loc["display_name"]
                if not spot.get("city") and loc.get("city"):
                    spot["city"] = loc["city"]
                if not spot.get("region") and loc.get("region"):
                    spot["region"] = loc["region"]
                if not spot.get("country") and loc.get("country"):
                    spot["country"] = loc["country"]
                # Always set Korean fields
                for key in ("nameKo", "cityKo", "regionKo", "countryKo", "addressKo"):
                    if loc.get(key):
                        spot[key] = loc[key]
        except Exception as e:
            logger.warning(f"Failed to enrich spots with location data: {e}")

        return spots

    @classmethod
    async def _get_all_spots_raw(cls) -> list[dict]:
        """Get all unique locations with latest forecast. Uses Redis cache."""
        cached = await CacheService.get_all_surf_spots()
        if cached is not None:
            return cached

        all_items = await cls._scan_all_items()
        location_map: dict[str, dict] = {}
        for item in all_items:
            loc_id = item["locationId"]["S"]
            ts = item["surfTimestamp"]["S"]
            if loc_id not in location_map or ts > location_map[loc_id]["surfTimestamp"]["S"]:
                location_map[loc_id] = item

        spots = [cls._to_surf_info(item) for item in location_map.values()]
        spots = await cls._enrich_with_korean(spots)
        spots.sort(
            key=lambda s: s["derivedMetrics"].get("INTERMEDIATE", {}).get("surfScore", 0), reverse=True
        )

        await CacheService.store_all_surf_spots(spots)

        return spots

    @classmethod
    async def get_spots_for_date(
        cls, date: Optional[str] = None, time: Optional[str] = None
    ) -> list[dict]:
        """Get one spot per location filtered by date and optionally time."""
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
            # Calculate 3-hour range from selected time slot
            # Example: time="03:00" → hours [3, 4, 5]
            #          time="21:00" → hours [21, 22, 23]
            try:
                start_hour = int(time.split(":")[0])

                # Generate timestamp prefixes for 3-hour window
                # Use "HH:" prefix to match any minute/second in that hour
                time_prefixes = []
                for offset in range(3):
                    hour = start_hour + offset
                    # Don't wrap past midnight (next day is different date partition)
                    if hour <= 23:
                        time_prefixes.append(f"{date}T{hour:02d}:")

                # Filter items matching any hour in the 3-hour range
                time_matched = [
                    item for item in filtered
                    if any(item["surfTimestamp"]["S"].startswith(prefix) for prefix in time_prefixes)
                ]

                if time_matched:
                    filtered = time_matched
            except (ValueError, IndexError):
                # Invalid time format - fall back to no time filtering
                pass

        # Pick one item per location: prefer closest to requested time
        location_map: dict[str, dict] = {}
        for item in filtered:
            loc_id = item["locationId"]["S"]
            ts = item["surfTimestamp"]["S"]
            if loc_id not in location_map:
                location_map[loc_id] = item
            else:
                existing_ts = location_map[loc_id]["surfTimestamp"]["S"]
                if time:
                    target = f"{date}T{time}"
                    ts_time = ts[11:16] if len(ts) > 15 else ts[11:]
                    ex_time = existing_ts[11:16] if len(existing_ts) > 15 else existing_ts[11:]
                    tg_time = target[11:16] if len(target) > 15 else target[11:]
                    if abs(int(ts_time.replace(":", "")) - int(tg_time.replace(":", ""))) < abs(int(ex_time.replace(":", "")) - int(tg_time.replace(":", ""))):
                        location_map[loc_id] = item
                else:
                    if ts > existing_ts:
                        location_map[loc_id] = item

        spots = [cls._to_surf_info(item) for item in location_map.values()]
        spots = await cls._enrich_with_korean(spots)
        spots.sort(
            key=lambda s: s["derivedMetrics"].get("INTERMEDIATE", {}).get("surfScore", 0), reverse=True
        )

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
                key_expr = "locationId = :lid"
                expr_values: dict = {":lid": {"S": location_id}}

                if date:
                    key_expr += " AND begins_with(surfTimestamp, :d)"
                    expr_values[":d"] = {"S": date}

                with dynamodb_subsegment("DynamoDB_Query"):
                    response = await client.query(
                        TableName=cls.TABLE_NAME,
                        KeyConditionExpression=key_expr,
                        ExpressionAttributeValues=expr_values,
                    )
                spots = [cls._to_surf_info(item) for item in response.get("Items", [])]
                return await cls._enrich_with_korean(spots)
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
        return [s for s in spots if query_lower in s["locationId"].lower()]

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
        loc_id = item["locationId"]["S"]
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

        # Parse per-level derivedMetrics (new format)
        derived_metrics = {}
        for level in ("BEGINNER", "INTERMEDIATE", "ADVANCED"):
            level_data = derived.get(level, {}).get("M", {})
            if level_data:
                raw_grade = level_data.get("surfGrade", {}).get("S", "0")
                try:
                    grade_numeric = float(raw_grade)
                except (ValueError, TypeError):
                    grade_numeric = 0.0
                derived_metrics[level] = {
                    "surfScore": float(level_data.get("surfScore", {}).get("N", "0")),
                    "surfGrade": cls._numeric_grade_to_letter(raw_grade),
                    "surfGradeNumeric": grade_numeric,
                }
        # Fallback for old flat format
        if not derived_metrics:
            raw_grade = derived.get("surfGrade", {}).get("S", "D")
            letter_grade = cls._numeric_grade_to_letter(raw_grade)
            try:
                grade_numeric = float(raw_grade)
            except (ValueError, TypeError):
                grade_numeric = 0.0
            flat_score = float(derived.get("surfScore", {}).get("N", "0"))
            for level in ("BEGINNER", "INTERMEDIATE", "ADVANCED"):
                derived_metrics[level] = {
                    "surfScore": flat_score,
                    "surfGrade": letter_grade,
                    "surfGradeNumeric": grade_numeric,
                }

        display_name = location.get("displayName", {}).get("S", "")
        name = display_name if display_name else f"{lat}, {lng}"

        # Korean address fields (from location nested object if present)
        display_name_ko = location.get("displayNameKo", {}).get("S", "")
        city_ko = location.get("cityKo", {}).get("S", "")
        state_ko = location.get("stateKo", {}).get("S", "")
        country_ko = location.get("countryKo", {}).get("S", "")

        return {
            "locationId": loc_id,
            "surfTimestamp": item["surfTimestamp"]["S"],
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
            "derivedMetrics": derived_metrics,
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
            "nameKo": display_name_ko or None,
            "city": city,
            "cityKo": city_ko or None,
            "region": state,
            "regionKo": state_ko or None,
            "country": country,
            "countryKo": country_ko or None,
            "address": display_name,
            "addressKo": display_name_ko or None,
            "waveType": "Beach Break",
            "bestSeason": [],
        }
