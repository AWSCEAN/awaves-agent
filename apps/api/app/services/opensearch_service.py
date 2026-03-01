"""OpenSearch service for location keyword search."""

import logging
import re
from typing import Optional

from opensearchpy import AsyncOpenSearch

from app.config import settings
from app.middleware.metrics import emit_external_api_failure

logger = logging.getLogger(__name__)

# Regex to detect Korean (Hangul) characters
_KOREAN_PATTERN = re.compile("[\uAC00-\uD7A3]")


def detect_language(text: str) -> str:
    """Detect if text contains Korean characters."""
    if _KOREAN_PATTERN.search(text):
        return "ko"
    return "en"


class OpenSearchService:
    """Service for OpenSearch operations on the locations index."""

    INDEX_NAME = "locations"
    _client: Optional[AsyncOpenSearch] = None
    _available: bool = True
    _nori_available: Optional[bool] = None

    @classmethod
    async def get_client(cls) -> Optional[AsyncOpenSearch]:
        """Get or create async OpenSearch client."""
        if not cls._available:
            return None

        if cls._client is None:
            try:
                host = settings.opensearch_host
                use_ssl = settings.opensearch_port == 443
                if host.startswith("https://"):
                    host = host[len("https://"):]
                    use_ssl = True
                elif host.startswith("http://"):
                    host = host[len("http://"):]

                cls._client = AsyncOpenSearch(
                    hosts=[{
                        "host": host,
                        "port": settings.opensearch_port,
                    }],
                    use_ssl=use_ssl,
                    verify_certs=False,
                    ssl_show_warn=False,
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
                emit_external_api_failure("OpenSearch")
                cls._available = False
                if cls._client:
                    await cls._client.close()
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
    async def _check_nori_available(cls, client: AsyncOpenSearch) -> bool:
        """Check if the nori tokenizer plugin is installed."""
        if cls._nori_available is not None:
            return cls._nori_available
        try:
            plugins = await client.cat.plugins(format="json")
            cls._nori_available = any(
                p.get("component") == "analysis-nori" for p in plugins
            )
        except Exception:
            cls._nori_available = False
        if not cls._nori_available:
            logger.warning(
                "nori_tokenizer plugin not installed. "
                "Korean fields will use standard analyzer."
            )
        return cls._nori_available

    @classmethod
    def _korean_analyzer_settings(cls, use_nori: bool) -> dict:
        """Return analyzer config based on nori availability."""
        if use_nori:
            return {
                "type": "custom",
                "tokenizer": "nori_tokenizer",
                "filter": ["lowercase", "nori_part_of_speech"],
            }
        return {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase"],
        }

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

            use_nori = await cls._check_nori_available(client)
            ko_analyzer = "korean_analyzer" if use_nori else "standard"

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
                        "display_name_ko": {
                            "type": "text",
                            "analyzer": ko_analyzer,
                            "fields": {"keyword": {"type": "keyword"}},
                        },
                        "city_ko": {
                            "type": "text",
                            "analyzer": ko_analyzer,
                            "fields": {"keyword": {"type": "keyword"}},
                        },
                        "state_ko": {
                            "type": "text",
                            "analyzer": ko_analyzer,
                            "fields": {"keyword": {"type": "keyword"}},
                        },
                        "country_ko": {
                            "type": "text",
                            "analyzer": ko_analyzer,
                            "fields": {"keyword": {"type": "keyword"}},
                        },
                    }
                },
            }

            # Add korean_analyzer settings only if nori is available
            if use_nori:
                mapping["settings"]["analysis"] = {
                    "analyzer": {
                        "korean_analyzer": cls._korean_analyzer_settings(True)
                    }
                }

            await client.indices.create(index=cls.INDEX_NAME, body=mapping)
            logger.info(
                "OpenSearch index '%s' created (nori=%s).",
                cls.INDEX_NAME, use_nori,
            )
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
                # Korean fields
                "display_name_ko": location_data.get("display_name_ko", ""),
                "city_ko": location_data.get("city_ko", ""),
                "state_ko": location_data.get("state_ko", ""),
                "country_ko": location_data.get("country_ko", ""),
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
                # Korean fields
                "display_name_ko": loc.get("display_name_ko", ""),
                "city_ko": loc.get("city_ko", ""),
                "state_ko": loc.get("state_ko", ""),
                "country_ko": loc.get("country_ko", ""),
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
            emit_external_api_failure("OpenSearch")
            return 0

    @classmethod
    async def search_locations(
        cls, query: str, size: int = 50, language: Optional[str] = None
    ) -> list[dict]:
        """Search locations by keyword using multi_match.

        Args:
            query: Search query string.
            size: Max number of results.
            language: Language hint ('en', 'ko', or None for auto-detect).

        Returns list of dicts with locationId and location metadata.
        """
        client = await cls.get_client()
        if not client:
            return []

        # Auto-detect language if not provided
        if language is None:
            language = detect_language(query)

        try:
            if language == "ko":
                body = cls._build_korean_query(query, size)
            else:
                body = cls._build_english_query(query, size)

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
                    "display_name_ko": source.get("display_name_ko", ""),
                    "city_ko": source.get("city_ko", ""),
                    "state_ko": source.get("state_ko", ""),
                    "country_ko": source.get("country_ko", ""),
                    "lat": source.get("location", {}).get("lat"),
                    "lon": source.get("location", {}).get("lon"),
                    "score": hit.get("_score", 0),
                })

            return results
        except Exception as e:
            logger.error("OpenSearch search failed: %s", e)
            emit_external_api_failure("OpenSearch")
            return []

    @classmethod
    def _build_english_query(cls, query: str, size: int) -> dict:
        """Build the existing English search query (unchanged logic)."""
        return {
            "size": size,
            "query": {
                "bool": {
                    "should": [
                        # Exact phrase match (highest priority)
                        {
                            "multi_match": {
                                "query": query,
                                "fields": [
                                    "display_name^5",
                                    "city^3",
                                    "state^2",
                                    "country",
                                ],
                                "type": "phrase",
                                "boost": 3,
                            }
                        },
                        # All terms must appear (cross-field)
                        {
                            "multi_match": {
                                "query": query,
                                "fields": [
                                    "display_name^3",
                                    "city^2",
                                    "state",
                                    "country",
                                ],
                                "type": "cross_fields",
                                "operator": "and",
                            }
                        },
                    ],
                    "minimum_should_match": 1,
                }
            },
        }

    @classmethod
    def _build_korean_query(cls, query: str, size: int) -> dict:
        """Build Korean search query using nori analyzer."""
        return {
            "size": size,
            "query": {
                "bool": {
                    "should": [
                        # Exact phrase match on Korean fields
                        {
                            "multi_match": {
                                "query": query,
                                "fields": [
                                    "display_name_ko^5",
                                    "city_ko^3",
                                    "state_ko^2",
                                    "country_ko",
                                ],
                                "type": "phrase",
                                "boost": 3,
                                "analyzer": "korean_analyzer",
                            }
                        },
                        # Cross-field match on Korean fields
                        {
                            "multi_match": {
                                "query": query,
                                "fields": [
                                    "display_name_ko^3",
                                    "city_ko^2",
                                    "state_ko",
                                    "country_ko",
                                ],
                                "type": "cross_fields",
                                "operator": "and",
                                "analyzer": "korean_analyzer",
                            }
                        },
                        # Also search English fields for mixed queries
                        {
                            "multi_match": {
                                "query": query,
                                "fields": [
                                    "display_name^3",
                                    "city^2",
                                    "state",
                                    "country",
                                ],
                                "type": "cross_fields",
                                "operator": "and",
                            }
                        },
                    ],
                    "minimum_should_match": 1,
                }
            },
        }

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
