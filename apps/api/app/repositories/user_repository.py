"""User repository for database operations."""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.timezone import now_kst
from app.models.user import User

logger = logging.getLogger(__name__)


class UserRepository:
    """Repository for User database operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        result = await self.session.execute(
            select(User).where(User.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        result = await self.session.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()

    async def exists_by_username(self, username: str) -> bool:
        """Check if username already exists."""
        user = await self.get_by_username(username)
        return user is not None

    async def create(
        self,
        username: str,
        password_hash: str,
        user_level: str,
        privacy_consent_yn: bool,
    ) -> User:
        """Create a new user."""
        user = User(
            username=username,
            password_hash=password_hash,
            user_level=user_level,
            privacy_consent_yn=privacy_consent_yn,
            last_login_dt=None,
            created_at=now_kst(),
        )
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def update_last_login(self, user_id: int) -> Optional[User]:
        """Update user's last login timestamp."""
        user = await self.get_by_id(user_id)
        if user:
            user.last_login_dt = now_kst()
            await self.session.flush()
            await self.session.refresh(user)
        return user

    async def update_user_level(self, user_id: int, user_level: str) -> Optional[User]:
        """Update user's surfing level."""
        user = await self.get_by_id(user_id)
        if user:
            user.user_level = user_level
            await self.session.flush()
            await self.session.refresh(user)
        return user
