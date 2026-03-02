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
        """Check if the nori tokenizer plugin is installed.

        First tries cat.plugins (works for self-hosted OpenSearch), then
        falls back to the analyze API (works for Amazon OpenSearch Service
        where nori is installed as an associated package).
        """
        if cls._nori_available is not None:
            return cls._nori_available
        try:
            plugins = await client.cat.plugins(format="json")
            cls._nori_available = any(
                p.get("component") == "analysis-nori" for p in plugins
            )
        except Exception:
            cls._nori_available = False

        # Fallback: try the analyze API (catches Amazon OpenSearch Service packages)
        if not cls._nori_available:
            try:
                await client.indices.analyze(
                    body={"tokenizer": "nori_tokenizer", "text": "테스트"}
                )
                cls._nori_available = True
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
                        # Completion suggester field for fast autocomplete
                        "suggest": {
                            "type": "completion",
                            "analyzer": "standard",
                            "search_analyzer": "standard",
                            "preserve_separators": True,
                            "preserve_position_increments": True,
                            "max_input_length": 50,
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
            # Build completion suggester input array
            # Include all searchable text for autocomplete (both English and Korean)
            suggest_inputs = []

            # Add all non-empty text fields
            for field in ["display_name", "city", "state", "country",
                         "display_name_ko", "city_ko", "state_ko", "country_ko"]:
                value = loc.get(field, "").strip()
                if value:
                    suggest_inputs.append(value)

            # Add tokenized words from display names for partial matching
            display_name = loc.get("display_name", "").strip()
            if display_name:
                # Split on common separators and add individual words
                words = [w.strip() for w in display_name.replace(',', ' ').split() if w.strip()]
                suggest_inputs.extend(words)

            display_name_ko = loc.get("display_name_ko", "").strip()
            if display_name_ko:
                # Korean text tokenization
                words = [w.strip() for w in display_name_ko.replace(',', ' ').split() if w.strip()]
                suggest_inputs.extend(words)

            # Remove duplicates while preserving order
            seen = set()
            unique_inputs = []
            for item in suggest_inputs:
                if item.lower() not in seen:
                    seen.add(item.lower())
                    unique_inputs.append(item)

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
                # Completion suggester field
                "suggest": {
                    "input": unique_inputs if unique_inputs else [""],
                    "weight": 1,
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
                logger.error(
                    "Bulk index had %d failures out of %d documents",
                    len(failed), len(locations)
                )
                # Log details of first 5 failures for debugging
                for idx, item in enumerate(failed[:5]):
                    error_info = item.get("index", {})
                    doc_id = error_info.get("_id", "unknown")
                    status = error_info.get("status", "unknown")
                    error_detail = error_info.get("error", {})
                    logger.error(
                        "  Failed document %d: id=%s, status=%s, error=%s",
                        idx + 1, doc_id, status, error_detail
                    )
                if len(failed) > 5:
                    logger.error("  ... and %d more failures", len(failed) - 5)

            return success_count
        except Exception as e:
            logger.error("Bulk index failed: %s", e, exc_info=True)
            emit_external_api_failure("OpenSearch")
            return 0

    @classmethod
    async def suggest_locations(cls, query: str, size: int = 10) -> list[dict]:
        """Get autocomplete suggestions using OpenSearch completion suggester.

        Args:
            query: Partial text to autocomplete.
            size: Max number of suggestions.

        Returns:
            List of location dicts with locationId and metadata, ordered by relevance.
        """
        client = await cls.get_client()
        if not client:
            return []

        try:
            body = {
                "suggest": {
                    "location-suggest": {
                        "prefix": query,
                        "completion": {
                            "field": "suggest",
                            "size": size,
                            "skip_duplicates": True,
                        }
                    }
                }
            }

            response = await client.search(index=cls.INDEX_NAME, body=body)
            suggestions = response.get("suggest", {}).get("location-suggest", [])

            results = []
            if suggestions:
                for suggestion in suggestions[0].get("options", []):
                    source = suggestion.get("_source", {})
                    results.append({
                        "locationId": source.get("locationId"),
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
                        "score": suggestion.get("_score", 0),
                    })

            return results
        except Exception as e:
            logger.error("OpenSearch suggest failed: %s", e)
            emit_external_api_failure("OpenSearch")
            return []

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
                # Ensure nori availability is known before building the query
                if cls._nori_available is None:
                    await cls._check_nori_available(client)
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
        """Build Korean search query using nori analyzer if available."""
        ko_phrase: dict = {
            "query": query,
            "fields": [
                "display_name_ko^5",
                "city_ko^3",
                "state_ko^2",
                "country_ko",
            ],
            "type": "phrase",
            "boost": 3,
        }
        ko_cross: dict = {
            "query": query,
            "fields": [
                "display_name_ko^3",
                "city_ko^2",
                "state_ko",
                "country_ko",
            ],
            "type": "cross_fields",
            "operator": "and",
        }

        # Only reference korean_analyzer when nori plugin is installed
        if cls._nori_available:
            ko_phrase["analyzer"] = "korean_analyzer"
            ko_cross["analyzer"] = "korean_analyzer"

        return {
            "size": size,
            "query": {
                "bool": {
                    "should": [
                        {"multi_match": ko_phrase},
                        {"multi_match": ko_cross},
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
    async def get_all_location_ids(cls) -> set[str]:
        """Get all locationIds currently in the OpenSearch index.

        Returns:
            Set of locationId strings, or empty set on error.
        """
        client = await cls.get_client()
        if not client:
            return set()

        try:
            exists = await client.indices.exists(index=cls.INDEX_NAME)
            if not exists:
                return set()

            location_ids = set()
            # Use scroll API to get all documents efficiently
            response = await client.search(
                index=cls.INDEX_NAME,
                body={
                    "_source": ["locationId"],
                    "size": 1000,
                    "query": {"match_all": {}},
                },
                scroll="2m"
            )

            scroll_id = response.get("_scroll_id")
            hits = response.get("hits", {}).get("hits", [])

            while hits:
                for hit in hits:
                    location_id = hit.get("_source", {}).get("locationId")
                    if location_id:
                        location_ids.add(location_id)

                # Get next batch
                response = await client.scroll(scroll_id=scroll_id, scroll="2m")
                hits = response.get("hits", {}).get("hits", [])

            # Clear scroll
            if scroll_id:
                try:
                    await client.clear_scroll(scroll_id=scroll_id)
                except Exception:
                    pass

            return location_ids
        except Exception as e:
            logger.error("Failed to get all locationIds: %s", e)
            return set()

    @classmethod
    async def find_missing_location_ids(
        cls, expected_location_ids: set[str]
    ) -> tuple[set[str], set[str]]:
        """Compare expected locationIds with what's actually in OpenSearch.

        Args:
            expected_location_ids: Set of locationIds that should be in the index.

        Returns:
            Tuple of (missing_ids, extra_ids):
            - missing_ids: locationIds in DynamoDB but not in OpenSearch
            - extra_ids: locationIds in OpenSearch but not in DynamoDB
        """
        indexed_ids = await cls.get_all_location_ids()

        missing_ids = expected_location_ids - indexed_ids
        extra_ids = indexed_ids - expected_location_ids

        if missing_ids:
            logger.error(
                "Found %d locationIds in DynamoDB but NOT in OpenSearch: %s",
                len(missing_ids),
                sorted(list(missing_ids))[:10]  # Show first 10
            )
        if extra_ids:
            logger.warning(
                "Found %d locationIds in OpenSearch but NOT in DynamoDB: %s",
                len(extra_ids),
                sorted(list(extra_ids))[:10]  # Show first 10
            )

        return missing_ids, extra_ids

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

    @classmethod
    async def scan_and_index_from_dynamodb(cls, dynamodb_table_name: str) -> dict:
        """Scan DynamoDB locations table and bulk index into OpenSearch.

        This is the canonical method for indexing locations from DynamoDB.
        Used by both server startup and reindex API to ensure consistency.

        Performs comprehensive validation:
        1. Scans all items from DynamoDB
        2. Bulk indexes into OpenSearch
        3. Verifies OpenSearch document count matches DynamoDB count
        4. Identifies any missing locationIds

        Returns:
            dict with keys:
            - scanned_count: Number of items scanned from DynamoDB
            - indexed_count: Number of documents bulk API reported as indexed
            - opensearch_count: Actual document count from OpenSearch
            - failed_count: Number of documents that failed to index
            - missing_ids: List of locationIds missing from OpenSearch
            - success: True if all validations pass
        """
        import aioboto3
        from botocore.config import Config
        from app.config import settings

        session = aioboto3.Session(region_name=settings.aws_region)
        endpoint_url = settings.ddb_endpoint_url if settings.ddb_endpoint_url else None
        config = Config(
            retries={"max_attempts": 3, "mode": "adaptive"},
            connect_timeout=5,
            read_timeout=10,
        )

        try:
            # Step 1: Scan all items from DynamoDB locations table
            async with session.client("dynamodb", endpoint_url=endpoint_url, config=config) as client:
                all_items: list[dict] = []
                params: dict = {"TableName": dynamodb_table_name}
                while True:
                    response = await client.scan(**params)
                    all_items.extend(response.get("Items", []))
                    if "LastEvaluatedKey" not in response:
                        break
                    params["ExclusiveStartKey"] = response["LastEvaluatedKey"]

            scanned_count = len(all_items)
            if scanned_count == 0:
                logger.warning("DynamoDB table '%s' is empty, no locations to index.", dynamodb_table_name)
                return {
                    "scanned_count": 0,
                    "indexed_count": 0,
                    "opensearch_count": 0,
                    "failed_count": 0,
                    "missing_ids": [],
                    "success": True
                }

            logger.info("Scanned %d locations from DynamoDB table '%s'.", scanned_count, dynamodb_table_name)

            # Step 2: Transform DynamoDB items to OpenSearch document format
            # and collect expected locationIds
            locations: list[dict] = []
            expected_location_ids: set[str] = set()

            for item in all_items:
                location_id = item["locationId"]["S"]
                expected_location_ids.add(location_id)

                locations.append({
                    "locationId": location_id,
                    "lat": float(item.get("lat", {}).get("N", "0")),
                    "lon": float(item.get("lon", {}).get("N", "0")),
                    "display_name": item.get("displayName", {}).get("S", ""),
                    "city": item.get("city", {}).get("S", ""),
                    "state": item.get("state", {}).get("S", ""),
                    "country": item.get("country", {}).get("S", ""),
                    "display_name_ko": item.get("displayNameKo", {}).get("S", "") or item.get("displayNameKr", {}).get("S", ""),
                    "city_ko": item.get("cityKo", {}).get("S", "") or item.get("cityKr", {}).get("S", ""),
                    "state_ko": item.get("stateKo", {}).get("S", "") or item.get("stateKr", {}).get("S", ""),
                    "country_ko": item.get("countryKo", {}).get("S", "") or item.get("countryKr", {}).get("S", ""),
                })

            # Step 3: Bulk index into OpenSearch
            indexed_count = await cls.bulk_index_locations(locations)

            # Step 4: Verify actual OpenSearch document count
            # Wait briefly for OpenSearch to finish indexing (refresh=True should handle this)
            import asyncio
            await asyncio.sleep(0.5)  # Brief delay to ensure index refresh completes

            opensearch_count = await cls.get_document_count()
            if opensearch_count < 0:
                logger.error("Failed to get OpenSearch document count for validation")
                opensearch_count = indexed_count  # Fallback to bulk API result

            # Step 5: Find missing locationIds if counts don't match
            missing_ids: list[str] = []
            if opensearch_count != scanned_count:
                logger.warning(
                    "Count mismatch: DynamoDB=%d, BulkAPI=%d, OpenSearch=%d",
                    scanned_count, indexed_count, opensearch_count
                )
                missing_set, _ = await cls.find_missing_location_ids(expected_location_ids)
                missing_ids = sorted(list(missing_set))

            # Step 6: Validate results
            failed_count = scanned_count - indexed_count
            validation_failed = (
                failed_count > 0 or
                opensearch_count != scanned_count or
                len(missing_ids) > 0
            )

            if validation_failed:
                logger.error(
                    "Indexing validation failed: DynamoDB=%d, BulkAPI=%d, OpenSearch=%d, Missing=%d",
                    scanned_count, indexed_count, opensearch_count, len(missing_ids)
                )
                if missing_ids:
                    logger.error("Missing locationIds (first 10): %s", missing_ids[:10])

                return {
                    "scanned_count": scanned_count,
                    "indexed_count": indexed_count,
                    "opensearch_count": opensearch_count,
                    "failed_count": failed_count,
                    "missing_ids": missing_ids,
                    "success": False
                }

            logger.info(
                "Successfully indexed and validated all %d locations (OpenSearch count: %d)",
                scanned_count, opensearch_count
            )
            return {
                "scanned_count": scanned_count,
                "indexed_count": indexed_count,
                "opensearch_count": opensearch_count,
                "failed_count": 0,
                "missing_ids": [],
                "success": True
            }

        except Exception as e:
            logger.error("Failed to scan and index from DynamoDB: %s", e, exc_info=True)
            return {
                "scanned_count": 0,
                "indexed_count": 0,
                "opensearch_count": 0,
                "failed_count": 0,
                "missing_ids": [],
                "success": False,
                "error": str(e)
            }
