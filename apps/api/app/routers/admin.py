"""Admin endpoints for internal management operations."""

import logging

from fastapi import APIRouter

from app.config import settings
from app.services.opensearch_service import OpenSearchService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/opensearch/validate")
async def validate_opensearch_index() -> dict:
    """Validate OpenSearch index completeness without reindexing.

    Compares DynamoDB locations table with OpenSearch index and reports
    any missing locationIds.
    """
    import aioboto3
    from botocore.config import Config

    session = aioboto3.Session(region_name=settings.aws_region)
    endpoint_url = settings.ddb_endpoint_url if settings.ddb_endpoint_url else None
    config = Config(
        retries={"max_attempts": 3, "mode": "adaptive"},
        connect_timeout=5,
        read_timeout=10,
    )

    try:
        # Scan DynamoDB to get all locationIds
        async with session.client("dynamodb", endpoint_url=endpoint_url, config=config) as client:
            all_items: list[dict] = []
            params: dict = {"TableName": settings.dynamodb_locations_table, "ProjectionExpression": "locationId"}
            while True:
                response = await client.scan(**params)
                all_items.extend(response.get("Items", []))
                if "LastEvaluatedKey" not in response:
                    break
                params["ExclusiveStartKey"] = response["LastEvaluatedKey"]

        dynamodb_ids = {item["locationId"]["S"] for item in all_items}
        dynamodb_count = len(dynamodb_ids)

        # Get OpenSearch count and all locationIds
        opensearch_count = await OpenSearchService.get_document_count()
        missing_ids, extra_ids = await OpenSearchService.find_missing_location_ids(dynamodb_ids)

        return {
            "status": "ok",
            "dynamodb_count": dynamodb_count,
            "opensearch_count": opensearch_count,
            "missing_count": len(missing_ids),
            "extra_count": len(extra_ids),
            "missing_ids": sorted(list(missing_ids))[:50],  # First 50
            "extra_ids": sorted(list(extra_ids))[:50],  # First 50
            "valid": len(missing_ids) == 0 and dynamodb_count == opensearch_count,
        }

    except Exception as e:
        logger.error("OpenSearch validation failed: %s", e)
        return {"status": "error", "message": str(e)}


@router.get("/opensearch/location/{location_id:path}")
async def check_location_in_opensearch(location_id: str) -> dict:
    """Check if a specific locationId exists in OpenSearch and return its document.

    Useful for debugging missing records.
    """
    client = await OpenSearchService.get_client()
    if not client:
        return {"status": "error", "message": "OpenSearch client unavailable"}

    try:
        # Try to get the document by ID
        try:
            response = await client.get(index=OpenSearchService.INDEX_NAME, id=location_id)
            return {
                "status": "found",
                "locationId": location_id,
                "exists": True,
                "document": response.get("_source", {}),
            }
        except Exception:
            # Document not found by ID, try searching
            response = await client.search(
                index=OpenSearchService.INDEX_NAME,
                body={
                    "query": {"term": {"locationId": location_id}},
                    "size": 1,
                }
            )
            hits = response.get("hits", {}).get("hits", [])
            if hits:
                return {
                    "status": "found",
                    "locationId": location_id,
                    "exists": True,
                    "document": hits[0].get("_source", {}),
                }
            else:
                return {
                    "status": "not_found",
                    "locationId": location_id,
                    "exists": False,
                    "message": "LocationId not found in OpenSearch index",
                }

    except Exception as e:
        logger.error("Failed to check location in OpenSearch: %s", e)
        return {"status": "error", "message": str(e)}


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

    # 4. Use the canonical indexing method to ensure consistency with startup flow
    result = await OpenSearchService.scan_and_index_from_dynamodb(settings.dynamodb_locations_table)

    if result["success"]:
        logger.info(
            "Re-indexed and validated all %d locations (OpenSearch count: %d)",
            result["scanned_count"], result["opensearch_count"]
        )
        return {
            "status": "ok",
            "scanned_count": result["scanned_count"],
            "indexed_count": result["indexed_count"],
            "opensearch_count": result["opensearch_count"],
            "failed_count": result["failed_count"],
            "missing_count": len(result.get("missing_ids", [])),
            "nori_available": OpenSearchService._nori_available,
        }
    else:
        logger.error(
            "OpenSearch reindex incomplete: DynamoDB=%d, BulkAPI=%d, OpenSearch=%d, Failed=%d, Missing=%d",
            result["scanned_count"],
            result["indexed_count"],
            result["opensearch_count"],
            result["failed_count"],
            len(result.get("missing_ids", []))
        )
        missing_ids = result.get("missing_ids", [])
        return {
            "status": "error",
            "message": result.get("error", "Indexing validation failed"),
            "scanned_count": result["scanned_count"],
            "indexed_count": result["indexed_count"],
            "opensearch_count": result["opensearch_count"],
            "failed_count": result["failed_count"],
            "missing_count": len(missing_ids),
            "missing_ids": missing_ids[:50],  # Return first 50 missing IDs
        }
