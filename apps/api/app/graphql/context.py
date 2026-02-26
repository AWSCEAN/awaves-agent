"""GraphQL context for request handling."""

from dataclasses import dataclass, field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from strawberry.fastapi import BaseContext

from app.graphql.dataloaders import FeedbackDataLoader


@dataclass
class GraphQLContext(BaseContext):
    """GraphQL context with writer/reader database sessions and authentication.

    - db: writer session for mutations (INSERT/UPDATE/DELETE)
    - db_read: reader session for queries (SELECT)
    """

    db: AsyncSession
    db_read: AsyncSession
    user_id: Optional[int] = None
    _feedback_loader: Optional[FeedbackDataLoader] = field(default=None, repr=False)

    @property
    def is_authenticated(self) -> bool:
        """Check if user is authenticated."""
        return self.user_id is not None

    @property
    def feedback_loader(self) -> FeedbackDataLoader:
        """Get or create feedback DataLoader (uses reader session)."""
        if self._feedback_loader is None:
            self._feedback_loader = FeedbackDataLoader(self.db_read)
        return self._feedback_loader

    async def close(self) -> None:
        """Close database sessions and return connections to pool."""
        try:
            await self.db.close()
        except Exception:
            pass
        if self.db_read is not self.db:
            try:
                await self.db_read.close()
            except Exception:
                pass