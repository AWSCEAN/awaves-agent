"""GraphQL context for request handling."""

from dataclasses import dataclass, field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from strawberry.fastapi import BaseContext

from app.graphql.dataloaders import FeedbackDataLoader


@dataclass
class GraphQLContext(BaseContext):
    """GraphQL context with database session and authentication."""

    db: AsyncSession
    user_id: Optional[int] = None
    _feedback_loader: Optional[FeedbackDataLoader] = field(default=None, repr=False)

    @property
    def is_authenticated(self) -> bool:
        """Check if user is authenticated."""
        return self.user_id is not None

    @property
    def feedback_loader(self) -> FeedbackDataLoader:
        """Get or create feedback DataLoader."""
        if self._feedback_loader is None:
            self._feedback_loader = FeedbackDataLoader(self.db)
        return self._feedback_loader
