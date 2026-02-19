"""Inference prediction cache service."""

import json
import logging
from typing import Optional

from app.config import settings
from app.services.cache.base import BaseCacheService

logger = logging.getLogger(__name__)


class InferenceCacheService(BaseCacheService):
    """Cache service for ML inference predictions."""

    INFERENCE_PREFIX = "awaves:search:inference"

    @classmethod
    def _inference_key(cls, location_id: str, surf_date: str) -> str:
        """Generate cache key for inference prediction."""
        return f"{cls.INFERENCE_PREFIX}:{location_id}:{surf_date}"

    @classmethod
    async def get_inference_prediction(
        cls, location_id: str, surf_date: str
    ) -> Optional[dict]:
        """Get cached inference prediction."""
        client = await cls.get_client()
        if not client:
            return None

        try:
            value = await client.get(cls._inference_key(location_id, surf_date))
            if value:
                return json.loads(value)
        except Exception as e:
            logger.warning(f"Failed to get inference prediction from cache: {e}")

        return None

    @classmethod
    async def store_inference_prediction(
        cls, location_id: str, surf_date: str, data: dict
    ) -> None:
        """Store inference prediction in cache."""
        client = await cls.get_client()
        if not client:
            return

        try:
            await client.setex(
                cls._inference_key(location_id, surf_date),
                settings.cache_ttl_inference,
                json.dumps(data),
            )
        except Exception as e:
            logger.warning(f"Failed to store inference prediction in cache: {e}")
