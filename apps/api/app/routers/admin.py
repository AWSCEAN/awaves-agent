"""Admin endpoints for internal management operations."""

import logging

import aioboto3
from botocore.config import Config
from fastapi import APIRouter

from app.config import settings
from app.services.opensearch_service import OpenSearchService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/opensearch/reindex")
async def reindex_opensearch() -> dict:
    """Delete and recreate the OpenSearch locations index from DynamoDB.

    Scans the DynamoDB locations table and bulk-indexes all documents
    into a fresh OpenSearch index with the latest analyzer settings.
    """
    # 1. Delete old index
    deleted = await OpenSearchService.delete_index()
    if not deleted:
        return {"status": "error", "message": "Failed to delete OpenSearch index"}

    # 2. Reset nori detection so it re-checks after plugin install
    OpenSearchService._nori_available = None

    # 3. Recreate index (will detect nori and configure korean_analyzer)
    created = await OpenSearchService.create_index_if_not_exists()
    if not created:
        return {"status": "error", "message": "Failed to create OpenSearch index"}

    # 4. Scan DynamoDB locations table
    session = aioboto3.Session(region_name=settings.aws_region)
    endpoint_url = settings.ddb_endpoint_url if settings.ddb_endpoint_url else None
    config = Config(
        retries={"max_attempts": 3, "mode": "adaptive"},
        connect_timeout=5,
        read_timeout=10,
    )

    try:
        async with session.client("dynamodb", endpoint_url=endpoint_url, config=config) as client:
            all_items: list[dict] = []
            params: dict = {"TableName": settings.dynamodb_locations_table}
            while True:
                response = await client.scan(**params)
                all_items.extend(response.get("Items", []))
                if "LastEvaluatedKey" not in response:
                    break
                params["ExclusiveStartKey"] = response["LastEvaluatedKey"]

        if not all_items:
            return {"status": "ok", "indexed_count": 0, "message": "No items in DynamoDB locations table"}

        # 5. Transform DynamoDB items to OpenSearch document format
        locations: list[dict] = []
        for item in all_items:
            locations.append({
                "locationId": item["locationId"]["S"],
                "lat": float(item.get("lat", {}).get("N", "0")),
                "lon": float(item.get("lon", {}).get("N", "0")),
                "display_name": item.get("displayName", {}).get("S", ""),
                "city": item.get("city", {}).get("S", ""),
                "state": item.get("state", {}).get("S", ""),
                "country": item.get("country", {}).get("S", ""),
                "display_name_ko": item.get("displayNameKo", {}).get("S", ""),
                "city_ko": item.get("cityKo", {}).get("S", ""),
                "state_ko": item.get("stateKo", {}).get("S", ""),
                "country_ko": item.get("countryKo", {}).get("S", ""),
            })

        # 6. Bulk index into OpenSearch
        indexed = await OpenSearchService.bulk_index_locations(locations)
        logger.info("Re-indexed %d/%d locations into OpenSearch.", indexed, len(locations))

        return {
            "status": "ok",
            "indexed_count": indexed,
            "total_locations": len(locations),
            "nori_available": OpenSearchService._nori_available,
        }

    except Exception as e:
        logger.error("OpenSearch reindex failed: %s", e)
        return {"status": "error", "message": str(e)}
