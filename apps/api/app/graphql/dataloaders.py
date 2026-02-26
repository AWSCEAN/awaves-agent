"""DataLoaders for batching and caching GraphQL queries."""

from datetime import datetime
from typing import Optional
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feedback import Feedback


class FeedbackDataLoader:
    """DataLoader for batching feedback queries by user."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self._cache: dict[int, dict[str, str]] = {}

    async def load_feedback_map(self, user_id: int) -> dict[str, str]:
        """Load all feedback for a user (batched by user_id).

        Returns a map of location_surf_key -> feedback_status.
        """
        if user_id in self._cache:
            return self._cache[user_id]

        result = await self.session.execute(
            select(Feedback).where(Feedback.user_id == user_id)
        )
        feedbacks = result.scalars().all()

        feedback_map: dict[str, str] = {}
        for fb in feedbacks:
            key = f"{fb.location_id}#{fb.surf_timestamp.isoformat()}"
            feedback_map[key] = fb.feedback_status

        self._cache[user_id] = feedback_map
        return feedback_map

    async def load_feedback(
        self, user_id: int, location_id: str, surf_timestamp: datetime
    ) -> Optional[str]:
        """Load feedback status for a specific saved item."""
        feedback_map = await self.load_feedback_map(user_id)
        key = f"{location_id}#{surf_timestamp.isoformat()}"
        return feedback_map.get(key)

    def clear(self) -> None:
        """Clear the cache."""
        self._cache.clear()

    def prime(self, user_id: int, feedback_map: dict[str, str]) -> None:
        """Prime the cache with preloaded data."""
        self._cache[user_id] = feedback_map
