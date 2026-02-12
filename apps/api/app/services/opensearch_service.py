"""OpenSearch service for location keyword search."""

import logging
from typing import Optional

from opensearchpy import AsyncOpenSearch

from app.config import settings

logger = logging.getLogger(__name__)


class OpenSearchService:
    """Service for OpenSearch operations on the locations index."""

    INDEX_NAME = "locations"
    _client: Optional[AsyncOpenSearch] = None
    _available: bool = True

    @classmethod
    async def get_client(cls) -> Optional[AsyncOpenSearch]:
        """Get or create async OpenSearch client."""
        if not cls._available:
            return None

        if cls._client is None:
            try:
                cls._client = AsyncOpenSearch(
                    hosts=[{
                        "host": settings.opensearch_host,
                        "port": settings.opensearch_port,
                    }],
                    use_ssl=False,
                    verify_certs=False,
                    timeout=10,
                    max_retries=3,
                    retry_on_timeout=True,
                )
                info = await cls._client.info()
                logger.info(
                    "OpenSearch connected: %s",
                    info.get("version", {}).get("number", "unknown"),
                )
            except Exception as e:
                logger.error("OpenSearch connection failed: %s", e)
                cls._available = False
                cls._client = None
                return None

        return cls._client

    @classmethod
    async def close(cls) -> None:
        """Close OpenSearch connection."""
        if cls._client:
            await cls._client.close()
            cls._client = None

    @classmethod
    async def create_index_if_not_exists(cls) -> bool:
        """Create the locations index with proper mappings if it doesn't exist."""
        client = await cls.get_client()
        if not client:
            return False

        try:
            exists = await client.indices.exists(index=cls.INDEX_NAME)
            if exists:
                logger.info("OpenSearch index '%s' already exists.", cls.INDEX_NAME)
                return True

            mapping = {
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0,
                },
                "mappings": {
                    "properties": {
                        "locationId": {"type": "keyword"},
                        "display_name": {"type": "text", "analyzer": "standard"},
                        "city": {"type": "text", "analyzer": "standard", "fields": {"keyword": {"type": "keyword"}}},
                        "state": {"type": "keyword"},
                        "country": {"type": "keyword"},
                        "location": {"type": "geo_point"},
                    }
                },
            }

            await client.indices.create(index=cls.INDEX_NAME, body=mapping)
            logger.info("OpenSearch index '%s' created.", cls.INDEX_NAME)
            return True
        except Exception as e:
            logger.error("Failed to create OpenSearch index: %s", e)
            return False

    @classmethod
    async def index_location(cls, location_data: dict) -> bool:
        """Index a single location document."""
        client = await cls.get_client()
        if not client:
            return False

        try:
            doc = {
                "locationId": location_data["locationId"],
                "display_name": location_data.get("display_name", ""),
                "city": location_data.get("city", ""),
                "state": location_data.get("state", ""),
                "country": location_data.get("country", ""),
                "location": {
                    "lat": location_data["lat"],
                    "lon": location_data["lon"],
                },
            }

            await client.index(
                index=cls.INDEX_NAME,
                id=location_data["locationId"],
                body=doc,
                refresh=False,
            )
            return True
        except Exception as e:
            logger.error("Failed to index location %s: %s", location_data.get("locationId"), e)
            return False

    @classmethod
    async def bulk_index_locations(cls, locations: list[dict]) -> int:
        """Bulk index location documents. Returns count of successfully indexed docs."""
        client = await cls.get_client()
        if not client:
            return 0

        actions = []
        for loc in locations:
            actions.append({"index": {"_index": cls.INDEX_NAME, "_id": loc["locationId"]}})
            actions.append({
                "locationId": loc["locationId"],
                "display_name": loc.get("display_name", ""),
                "city": loc.get("city", ""),
                "state": loc.get("state", ""),
                "country": loc.get("country", ""),
                "location": {
                    "lat": loc["lat"],
                    "lon": loc["lon"],
                },
            })

        if not actions:
            return 0

        try:
            response = await client.bulk(body=actions, refresh=True)
            errors = response.get("errors", False)
            items = response.get("items", [])
            success_count = sum(1 for item in items if item.get("index", {}).get("status") in (200, 201))

            if errors:
                failed = [
                    item for item in items
                    if item.get("index", {}).get("status") not in (200, 201)
                ]
                logger.warning("Bulk index had %d failures", len(failed))

            return success_count
        except Exception as e:
            logger.error("Bulk index failed: %s", e)
            return 0

    @classmethod
    async def search_locations(cls, query: str, size: int = 50) -> list[dict]:
        """Search locations by keyword using multi_match.

        Returns list of dicts with locationId and location metadata.
        """
        client = await cls.get_client()
        if not client:
            return []

        try:
            body = {
                "size": size,
                "query": {
                    "multi_match": {
                        "query": query,
                        "fields": [
                            "display_name^3",
                            "city^2",
                            "state",
                            "country",
                        ],
                        "type": "best_fields",
                        "fuzziness": "AUTO",
                    }
                },
            }

            response = await client.search(index=cls.INDEX_NAME, body=body)
            hits = response.get("hits", {}).get("hits", [])

            results = []
            for hit in hits:
                source = hit["_source"]
                results.append({
                    "locationId": source["locationId"],
                    "display_name": source.get("display_name", ""),
                    "city": source.get("city", ""),
                    "state": source.get("state", ""),
                    "country": source.get("country", ""),
                    "lat": source.get("location", {}).get("lat"),
                    "lon": source.get("location", {}).get("lon"),
                    "score": hit.get("_score", 0),
                })

            return results
        except Exception as e:
            logger.error("OpenSearch search failed: %s", e)
            return []

    @classmethod
    async def get_document_count(cls) -> int:
        """Get the number of documents in the locations index."""
        client = await cls.get_client()
        if not client:
            return -1

        try:
            exists = await client.indices.exists(index=cls.INDEX_NAME)
            if not exists:
                return 0

            response = await client.count(index=cls.INDEX_NAME)
            return response.get("count", 0)
        except Exception as e:
            logger.error("Failed to get document count: %s", e)
            return -1

    @classmethod
    async def delete_index(cls) -> bool:
        """Delete the locations index (for re-ingestion)."""
        client = await cls.get_client()
        if not client:
            return False

        try:
            exists = await client.indices.exists(index=cls.INDEX_NAME)
            if exists:
                await client.indices.delete(index=cls.INDEX_NAME)
                logger.info("Deleted OpenSearch index '%s'.", cls.INDEX_NAME)
            return True
        except Exception as e:
            logger.error("Failed to delete index: %s", e)
            return False
