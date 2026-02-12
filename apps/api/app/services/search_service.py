"""Search service combining OpenSearch, Redis cache, and DynamoDB."""

import json
import logging
from typing import Optional

from app.config import settings
from app.services.cache import CacheService
from app.services.opensearch_service import OpenSearchService
from app.services.surf_info_service import SurfInfoService

logger = logging.getLogger(__name__)

SURF_CACHE_PREFIX = "awaves:surf:latest"


class SearchService:
    """Orchestrates keyword search via OpenSearch and surf_info retrieval."""

    @classmethod
    async def search(
        cls,
        query: str,
        size: int = 50,
        date: Optional[str] = None,
        time: Optional[str] = None,
        surfer_level: Optional[str] = None,
    ) -> list[dict]:
        """Search locations by keyword and return enriched surf_info results.

        Flow:
        1. Query OpenSearch for matching locations (keyword search only)
        2. For each locationId, query DynamoDB with date/time filter
        3. Filter by surfer_level if specified
        4. Return aggregated results enriched with location metadata
        """
        # Step 1: Search OpenSearch (location keyword search only)
        os_results = await OpenSearchService.search_locations(query, size=size)
        if not os_results:
            return []

        # Build cache key suffix for date/time-specific caching
        cache_suffix = ""
        if date:
            cache_suffix += f":{date}"
        if time:
            cache_suffix += f":{time}"

        # Step 2: Get surf_info for each locationId with date/time filter
        results = []
        for os_result in os_results:
            location_id = os_result["locationId"]

            surf_data = None

            if date or time:
                # Date/time specified: query DynamoDB directly (skip cache)
                surf_data = await SurfInfoService.get_surf_info_by_location_id(
                    location_id, date=date, time=time
                )
            else:
                # No date/time filter: use cache
                surf_data = await cls._get_cached_surf_info(location_id)
                if surf_data is None:
                    surf_data = await SurfInfoService.get_surf_info_by_location_id(
                        location_id
                    )
                    if surf_data:
                        await cls._set_cached_surf_info(location_id, surf_data)

            if surf_data:
                # Step 3: Filter by surfer_level if specified
                if surfer_level:
                    item_level = surf_data.get("derivedMetrics", {}).get(
                        "surfingLevel", ""
                    ).upper()
                    if item_level and item_level != surfer_level.upper():
                        continue

                # Enrich with location metadata from OpenSearch
                surf_data["display_name"] = os_result.get("display_name", "")
                surf_data["city"] = os_result.get("city", "")
                surf_data["state"] = os_result.get("state", "")
                surf_data["country"] = os_result.get("country", "")
                results.append(surf_data)
            else:
                # No surf data found but location exists, return location info
                results.append({
                    "LocationId": location_id,
                    "SurfTimestamp": "",
                    "geo": {
                        "lat": os_result.get("lat", 0),
                        "lng": os_result.get("lon", 0),
                    },
                    "conditions": {
                        "waveHeight": 0,
                        "wavePeriod": 0,
                        "windSpeed": 0,
                        "waterTemperature": 0,
                    },
                    "derivedMetrics": {
                        "surfScore": 0,
                        "surfGrade": "D",
                        "surfingLevel": "BEGINNER",
                    },
                    "metadata": {
                        "modelVersion": "",
                        "dataSource": "",
                        "predictionType": "",
                        "createdAt": "",
                    },
                    "name": os_result.get("display_name", f"{os_result.get('lat', 0)}, {os_result.get('lon', 0)}"),
                    "region": os_result.get("state", ""),
                    "country": os_result.get("country", ""),
                    "address": os_result.get("display_name", ""),
                    "display_name": os_result.get("display_name", ""),
                    "city": os_result.get("city", ""),
                    "state": os_result.get("state", ""),
                    "difficulty": "intermediate",
                    "waveType": "Beach Break",
                    "bestSeason": [],
                })

        return results

    @classmethod
    async def _get_cached_surf_info(cls, location_id: str) -> Optional[dict]:
        """Get surf info from Redis cache."""
        client = await CacheService.get_client()
        if not client:
            return None

        try:
            key = f"{SURF_CACHE_PREFIX}:{location_id}"
            value = await client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.warning("Failed to get surf info from cache: %s", e)

        return None

    @classmethod
    async def _set_cached_surf_info(cls, location_id: str, data: dict) -> None:
        """Store surf info in Redis cache."""
        client = await CacheService.get_client()
        if not client:
            return

        try:
            key = f"{SURF_CACHE_PREFIX}:{location_id}"
            await client.setex(
                key,
                settings.redis_ttl_seconds,
                json.dumps(data),
            )
        except Exception as e:
            logger.warning("Failed to store surf info in cache: %s", e)
