"""Saved items cache service."""

import json
import logging
from typing import Optional

from app.config import settings
from app.services.cache.base import BaseCacheService

logger = logging.getLogger(__name__)


class SavedItemsCacheService(BaseCacheService):
    """Cache service for user saved items."""

    SAVED_PREFIX = "awaves:saved"

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
                settings.cache_ttl_saved_items,
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
