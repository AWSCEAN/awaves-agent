"""Cache services package.

Domain-specific cache services with a shared Redis client.
"""

from app.services.cache.base import BaseCacheService
from app.services.cache.auth_cache import AuthCacheService
from app.services.cache.saved_cache import SavedItemsCacheService
from app.services.cache.surf_cache import SurfSpotsCacheService
from app.services.cache.inference_cache import InferenceCacheService
from app.services.cache.llm_cache import LlmCacheService


class CacheService(
    AuthCacheService,
    SavedItemsCacheService,
    SurfSpotsCacheService,
    InferenceCacheService,
    LlmCacheService,
):
    """Unified cache service (backward compatible).

    Combines all domain-specific cache services into one class
    so existing `from app.services.cache import CacheService` imports
    continue to work without changes.
    """

    pass


__all__ = [
    "BaseCacheService",
    "AuthCacheService",
    "SavedItemsCacheService",
    "SurfSpotsCacheService",
    "InferenceCacheService",
    "LlmCacheService",
    "CacheService",
]
