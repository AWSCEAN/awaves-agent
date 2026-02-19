"""Base cache service with shared Redis client."""

import logging
from typing import Optional

import redis.asyncio as redis

from app.config import settings

logger = logging.getLogger(__name__)


class BaseCacheService:
    """Base service providing shared Redis client singleton."""

    _client: Optional[redis.Redis] = None
    _available: bool = True

    @classmethod
    async def get_client(cls) -> Optional[redis.Redis]:
        """Get or create Redis client."""
        if not cls._available:
            return None

        if cls._client is None:
            cache_url = settings.cache_url
            if not cache_url:
                logger.warning("CACHE_URL is not configured, session caching disabled")
                cls._available = False
                return None

            # Parse the cache URL
            if not cache_url.startswith(("redis://", "rediss://")):
                cache_url = f"redis://{cache_url}"

            try:
                cls._client = redis.from_url(
                    cache_url,
                    encoding="utf-8",
                    decode_responses=True,
                )
                # Test connection
                await cls._client.ping()
                logger.info("Redis cache connected successfully")
            except Exception as e:
                logger.warning(f"Redis cache unavailable: {e}. Session caching disabled.")
                cls._available = False
                cls._client = None
                return None

        return cls._client

    @classmethod
    async def close(cls) -> None:
        """Close Redis connection."""
        if cls._client:
            await cls._client.close()
            cls._client = None
