"""Admin endpoints for internal management operations."""

import logging

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

    # 4. Use the canonical indexing method to ensure consistency with startup flow
    result = await OpenSearchService.scan_and_index_from_dynamodb(settings.dynamodb_locations_table)

    if result["success"]:
        logger.info(
            "Re-indexed %d/%d locations into OpenSearch.",
            result["indexed_count"], result["scanned_count"]
        )
        return {
            "status": "ok",
            "scanned_count": result["scanned_count"],
            "indexed_count": result["indexed_count"],
            "failed_count": result["failed_count"],
            "nori_available": OpenSearchService._nori_available,
        }
    else:
        logger.error(
            "OpenSearch reindex incomplete: %d/%d indexed, %d failed. Error: %s",
            result["indexed_count"], result["scanned_count"], result["failed_count"],
            result.get("error", "Unknown error")
        )
        return {
            "status": "error",
            "message": result.get("error", "Indexing failed"),
            "scanned_count": result["scanned_count"],
            "indexed_count": result["indexed_count"],
            "failed_count": result["failed_count"],
        }
