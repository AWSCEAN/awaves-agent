"""Search service combining OpenSearch, Redis cache, and DynamoDB."""

import logging
from typing import Optional

from app.services.opensearch_service import OpenSearchService
from app.services.surf_dynamodb import SurfDynamoDBService

logger = logging.getLogger(__name__)


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
        language: Optional[str] = None,
    ) -> list[dict]:
        """Search locations by keyword and return enriched surf_info results.

        Flow:
        1. Query OpenSearch for matching locations (keyword search only)
        2. Batch-fetch surf data for the date/time from in-memory cache
        3. Filter by surfer_level if specified
        4. Return aggregated results enriched with location metadata
        """
        # Step 1: Search OpenSearch (location keyword search only)
        os_results = await OpenSearchService.search_locations(
            query, size=size, language=language
        )
        if not os_results:
            return []

        # Step 2: Batch-fetch all spots for the date/time (uses in-memory cache)
        # This is a single call instead of N individual DynamoDB queries
        all_spots = await SurfDynamoDBService.get_spots_for_date(date, time)
        spots_by_id: dict[str, dict] = {s["LocationId"]: s for s in all_spots}

        # Step 3: Match OpenSearch results with surf data
        results = []
        for os_result in os_results:
            location_id = os_result["locationId"]
            surf_data = spots_by_id.get(location_id)

            if surf_data:
                # Filter by surfer_level if specified
                if surfer_level:
                    item_level = surf_data.get("derivedMetrics", {}).get(
                        "surfingLevel", ""
                    ).upper()
                    if item_level and item_level != surfer_level.upper():
                        continue

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
                # No surf data: skip if surfer_level filter is active
                if surfer_level:
                    continue

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
                        "surfingLevel": "",
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

        return results
