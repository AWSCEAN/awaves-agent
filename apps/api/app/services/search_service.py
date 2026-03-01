"""Search service combining OpenSearch, Redis cache, and DynamoDB."""

import logging
import time as _time
from typing import Optional

from app.middleware.metrics import emit_external_api_failure
from app.services.opensearch_service import OpenSearchService
from app.repositories.surf_data_repository import SurfDataRepository

logger = logging.getLogger(__name__)


class SearchService:
    """Orchestrates keyword search via OpenSearch and surf_info retrieval."""

    @classmethod
    async def _text_search_fallback(
        cls,
        query: str,
        size: int = 50,
        date: Optional[str] = None,
        time: Optional[str] = None,
        surfer_level: Optional[str] = None,
    ) -> list[dict]:
        """Text-search fallback used when OpenSearch is unavailable.

        Loads all DynamoDB spots for the requested date/time and filters
        them by matching the query string against name, address, region,
        country and their Korean equivalents.
        """
        spots = await SurfDataRepository.get_spots_for_date(date, time)
        query_lower = query.lower()
        results: list[dict] = []
        for spot in spots:
            searchable = " ".join(filter(None, [
                spot.get("name", ""),
                spot.get("address", ""),
                spot.get("region", ""),
                spot.get("country", ""),
                spot.get("nameKo", ""),
                spot.get("addressKo", ""),
                spot.get("regionKo", ""),
                spot.get("countryKo", ""),
                spot.get("locationId", ""),
            ])).lower()
            if query_lower not in searchable:
                continue
            results.append(spot)
            if len(results) >= size:
                break
        logger.info(
            "OpenSearch unavailable; DynamoDB fallback returned %d results for query '%s'.",
            len(results), query,
        )
        return results

    @classmethod
    async def search(
        cls,
        query: str,
        size: int = 50,
        date: Optional[str] = None,
        time: Optional[str] = None,
        surfer_level: Optional[str] = None,
        language: Optional[str] = None,
    ) -> list[dict]:
        """Search locations by keyword and return enriched surf_info results.

        Flow:
        1. Query OpenSearch for matching locations (keyword search only).
        2. If OpenSearch is unavailable or returns nothing, fall back to
           DynamoDB text search against in-memory cached spot data.
        3. Batch-fetch surf data for the date/time from in-memory cache.
        4. Filter by surfer_level if specified.
        5. Return aggregated results enriched with location metadata.
        """
        t_total = _time.monotonic()

        # Step 1: Search OpenSearch (location keyword search only)
        t0 = _time.monotonic()
        os_results = await OpenSearchService.search_locations(
            query, size=size, language=language
        )
        logger.info("[search] OpenSearch took %.0fms, %d hits", (_time.monotonic() - t0) * 1000, len(os_results or []))
        if not os_results:
            # OpenSearch unavailable or returned nothing — fall back to DynamoDB text search
            emit_external_api_failure("OpenSearch")
            return await cls._text_search_fallback(
                query, size=size, date=date, time=time, surfer_level=surfer_level
            )

        # Step 2: Batch-fetch all spots for the date/time (uses in-memory cache)
        # This is a single call instead of N individual DynamoDB queries
        t0 = _time.monotonic()
        all_spots = await SurfDataRepository.get_spots_for_date(date, time)
        logger.info("[search] get_spots_for_date took %.0fms, %d spots", (_time.monotonic() - t0) * 1000, len(all_spots))
        spots_by_id: dict[str, dict] = {s["locationId"]: s for s in all_spots}

        # Step 3: Match OpenSearch results with surf data
        results = []
        for os_result in os_results:
            location_id = os_result["locationId"]
            surf_data = spots_by_id.get(location_id)

            if surf_data:
                # Copy to avoid mutating cached data
                result = {**surf_data}

                # Enrich with location metadata from OpenSearch
                os_display = os_result.get("display_name", "")
                result["display_name"] = os_display
                result["city"] = os_result.get("city", "")
                result["state"] = os_result.get("state", "")
                result["country"] = os_result.get("country", "")

                # Korean address fields from OpenSearch
                result["display_name_ko"] = os_result.get("display_name_ko", "")
                result["city_ko"] = os_result.get("city_ko", "")
                result["state_ko"] = os_result.get("state_ko", "")
                result["country_ko"] = os_result.get("country_ko", "")

                # Fill name/address from OpenSearch if DynamoDB didn't have them
                if os_display:
                    if not result.get("name") or result["name"] == f"{result['geo']['lat']}, {result['geo']['lng']}":
                        result["name"] = os_display
                    if not result.get("address"):
                        result["address"] = os_display

                # Set Korean name/address
                os_display_ko = os_result.get("display_name_ko", "")
                if os_display_ko:
                    if not result.get("nameKo"):
                        result["nameKo"] = os_display_ko
                    if not result.get("addressKo"):
                        result["addressKo"] = os_display_ko

                # Set Korean region/country
                if os_result.get("state_ko"):
                    result["regionKo"] = os_result["state_ko"]
                if os_result.get("country_ko"):
                    result["countryKo"] = os_result["country_ko"]
                if os_result.get("city_ko"):
                    result["cityKo"] = os_result["city_ko"]

                results.append(result)
            else:
                # No surf data found but location exists, return location info
                results.append({
                    "locationId": location_id,
                    "surfTimestamp": "",
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
                        "BEGINNER": {"surfScore": 0, "surfGrade": "D"},
                        "INTERMEDIATE": {"surfScore": 0, "surfGrade": "D"},
                        "ADVANCED": {"surfScore": 0, "surfGrade": "D"},
                    },
                    "metadata": {
                        "modelVersion": "",
                        "dataSource": "",
                        "predictionType": "",
                        "createdAt": "",
                    },
                    "name": os_result.get("display_name", f"{os_result.get('lat', 0)}, {os_result.get('lon', 0)}"),
                    "nameKo": os_result.get("display_name_ko", ""),
                    "region": os_result.get("state", ""),
                    "regionKo": os_result.get("state_ko", ""),
                    "country": os_result.get("country", ""),
                    "countryKo": os_result.get("country_ko", ""),
                    "address": os_result.get("display_name", ""),
                    "addressKo": os_result.get("display_name_ko", ""),
                    "display_name": os_result.get("display_name", ""),
                    "city": os_result.get("city", ""),
                    "cityKo": os_result.get("city_ko", ""),
                    "state": os_result.get("state", ""),
                    "waveType": "Beach Break",
                    "bestSeason": [],
                })

        logger.info("[search] total search took %.0fms, %d results", (_time.monotonic() - t_total) * 1000, len(results))
        return results
