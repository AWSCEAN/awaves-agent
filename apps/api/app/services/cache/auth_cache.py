"""Auth token cache service."""

import json
import logging
from datetime import datetime
from typing import Optional

from app.services.cache.base import BaseCacheService, _redis_subsegment
from app.middleware.metrics import emit_cache_hit, emit_cache_miss

logger = logging.getLogger(__name__)


class AuthCacheService(BaseCacheService):
    """Cache service for refresh token management."""

    KEY_PREFIX = "awaves:refresh"

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
            return

        try:
            key = cls._get_key(user_id)
            value = json.dumps({
                "token": token,
                "expiresAt": expires_at.isoformat(),
            })
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
            return None

        try:
            key = cls._get_key(user_id)
            with _redis_subsegment("Redis_Get"):
                value = await client.get(key)
            if value:
                emit_cache_hit("auth_token")
                return json.loads(value)
            emit_cache_miss("auth_token")
        except Exception as e:
            logger.warning(f"Failed to get refresh token: {e}")

        return None

    @classmethod
    async def validate_refresh_token(cls, user_id: int, token: str) -> bool:
        """Validate if the provided refresh token matches the cached one."""
        if not cls._available:
            return True

        cached = await cls.get_refresh_token(user_id)
        if not cached:
            return not cls._available

        return cached.get("token") == token

    @classmethod
    async def invalidate_refresh_token(cls, user_id: int) -> None:
        """Remove refresh token from cache (logout/rotation)."""
        client = await cls.get_client()
        if not client:
            return

        try:
            key = cls._get_key(user_id)
            await client.delete(key)
        except Exception as e:
            logger.warning(f"Failed to invalidate refresh token: {e}")
