"""Surf spots cache service."""

import json
import logging
from typing import Optional

from app.config import settings
from app.services.cache.base import BaseCacheService

logger = logging.getLogger(__name__)


class SurfSpotsCacheService(BaseCacheService):
    """Cache service for surf spot data."""

    SURF_ALL_KEY = "awaves:surf:all_spots"

    @classmethod
    async def get_all_surf_spots(cls) -> Optional[list[dict]]:
        """Get all surf spots from cache."""
        client = await cls.get_client()
        if not client:
            return None

        try:
            value = await client.get(cls.SURF_ALL_KEY)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.warning(f"Failed to get surf spots from cache: {e}")

        return None

    @classmethod
    async def store_all_surf_spots(cls, spots: list[dict]) -> None:
        """Store all surf spots in cache."""
        client = await cls.get_client()
        if not client:
            return

        try:
            await client.setex(
                cls.SURF_ALL_KEY,
                settings.cache_ttl_surf_spots,
                json.dumps(spots),
            )
        except Exception as e:
            logger.warning(f"Failed to store surf spots in cache: {e}")

    @classmethod
    async def invalidate_surf_spots(cls) -> None:
        """Invalidate surf spots cache."""
        client = await cls.get_client()
        if not client:
            return

        try:
            await client.delete(cls.SURF_ALL_KEY)
        except Exception as e:
            logger.warning(f"Failed to invalidate surf spots cache: {e}")
