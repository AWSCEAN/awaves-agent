"""Redis cache service for session management."""

import json
import logging
from datetime import datetime
from typing import Optional

import redis.asyncio as redis

from app.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """Service for Redis-based session cache management."""

    _client: Optional[redis.Redis] = None
    _available: bool = True
    KEY_PREFIX = "awaves:refresh"

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
            if not cache_url.startswith("redis://"):
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

    @classmethod
    def _get_key(cls, user_id: int) -> str:
        """Generate cache key for user refresh token."""
        return f"{cls.KEY_PREFIX}:{user_id}"

    @classmethod
    async def store_refresh_token(
        cls,
        user_id: int,
        token: str,
        expires_at: datetime,
    ) -> None:
        """Store refresh token in cache."""
        client = await cls.get_client()
        if not client:
            return  # Cache not available, skip

        try:
            key = cls._get_key(user_id)
            value = json.dumps({
                "token": token,
                "expiresAt": expires_at.isoformat(),
            })
            # Calculate TTL in seconds
            ttl = int((expires_at - datetime.utcnow()).total_seconds())
            if ttl > 0:
                await client.setex(key, ttl, value)
        except Exception as e:
            logger.warning(f"Failed to store refresh token: {e}")

    @classmethod
    async def get_refresh_token(cls, user_id: int) -> Optional[dict]:
        """Get refresh token from cache."""
        client = await cls.get_client()
        if not client:
            return None  # Cache not available

        try:
            key = cls._get_key(user_id)
            value = await client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.warning(f"Failed to get refresh token: {e}")

        return None

    @classmethod
    async def validate_refresh_token(cls, user_id: int, token: str) -> bool:
        """Validate if the provided refresh token matches the cached one."""
        # If cache is not available, we can't validate against cache
        # In this case, return True to allow JWT-only validation
        if not cls._available:
            return True

        cached = await cls.get_refresh_token(user_id)
        if not cached:
            # No cached token - if cache is available, this means invalid
            # But we need to check if we actually couldn't connect
            return not cls._available

        return cached.get("token") == token

    @classmethod
    async def invalidate_refresh_token(cls, user_id: int) -> None:
        """Remove refresh token from cache (logout/rotation)."""
        client = await cls.get_client()
        if not client:
            return  # Cache not available, skip

        try:
            key = cls._get_key(user_id)
            await client.delete(key)
        except Exception as e:
            logger.warning(f"Failed to invalidate refresh token: {e}")

    # --- Saved items cache ---

    SAVED_PREFIX = "awaves:saved"
    SAVED_TTL = 600  # 10 minutes

    @classmethod
    def _saved_key(cls, user_id: str) -> str:
        """Generate cache key for user's saved items."""
        return f"{cls.SAVED_PREFIX}:{user_id}"

    @classmethod
    async def get_saved_items(cls, user_id: str) -> Optional[list[dict]]:
        """Get saved items from cache."""
        client = await cls.get_client()
        if not client:
            return None

        try:
            value = await client.get(cls._saved_key(user_id))
            if value:
                return json.loads(value)
        except Exception as e:
            logger.warning(f"Failed to get saved items from cache: {e}")

        return None

    @classmethod
    async def store_saved_items(cls, user_id: str, items: list[dict]) -> None:
        """Store saved items in cache."""
        client = await cls.get_client()
        if not client:
            return

        try:
            await client.setex(
                cls._saved_key(user_id),
                cls.SAVED_TTL,
                json.dumps(items),
            )
        except Exception as e:
            logger.warning(f"Failed to store saved items in cache: {e}")

    @classmethod
    async def invalidate_saved_items(cls, user_id: str) -> None:
        """Invalidate saved items cache."""
        client = await cls.get_client()
        if not client:
            return

        try:
            await client.delete(cls._saved_key(user_id))
        except Exception as e:
            logger.warning(f"Failed to invalidate saved items cache: {e}")
