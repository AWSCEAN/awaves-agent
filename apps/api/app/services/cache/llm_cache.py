"""LLM summary cache service."""

import json
import logging
from typing import Optional

from app.config import settings
from app.services.cache.base import BaseCacheService, _redis_subsegment
from app.middleware.metrics import emit_cache_hit, emit_cache_miss

logger = logging.getLogger(__name__)


class LlmCacheService(BaseCacheService):
    """Cache service for Bedrock LLM summaries."""

    LLM_PREFIX = "awaves:surf:llm-summary"

    @classmethod
    def _llm_key(cls, location_id: str, surf_timestamp: str, level: str) -> str:
        """Generate cache key for LLM summary."""
        return f"{cls.LLM_PREFIX}:{location_id}:{surf_timestamp}:{level}"

    @classmethod
    async def get_llm_summary(
        cls, location_id: str, surf_timestamp: str, level: str
    ) -> Optional[dict]:
        """Get cached LLM summary."""
        client = await cls.get_client()
        if not client:
            return None

        try:
            with _redis_subsegment("Redis_Get"):
                value = await client.get(cls._llm_key(location_id, surf_timestamp, level))
            if value:
                emit_cache_hit("llm_summary")
                return json.loads(value)
            emit_cache_miss("llm_summary")
        except Exception as e:
            logger.warning(f"Failed to get LLM summary from cache: {e}")

        return None

    @classmethod
    async def store_llm_summary(
        cls, location_id: str, surf_timestamp: str, level: str, data: dict, ttl: int = 0
    ) -> None:
        """Store LLM summary in cache."""
        client = await cls.get_client()
        if not client:
            return

        try:
            await client.setex(
                cls._llm_key(location_id, surf_timestamp, level),
                ttl or settings.redis_ttl_seconds,
                json.dumps(data, ensure_ascii=False),
            )
        except Exception as e:
            logger.warning(f"Failed to store LLM summary in cache: {e}")
