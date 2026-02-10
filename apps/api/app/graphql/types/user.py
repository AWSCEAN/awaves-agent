"""User GraphQL types."""

import strawberry
from datetime import datetime
from typing import Optional
from enum import Enum


@strawberry.enum
class UserLevel(Enum):
    """User skill level."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


@strawberry.type
class User:
    """User type for GraphQL."""

    user_id: int
    username: str
    user_level: str
    privacy_consent_yn: bool
    last_login_dt: Optional[datetime] = None
    created_at: datetime

    @classmethod
    def from_model(cls, user) -> "User":
        """Create User from SQLAlchemy model."""
        return cls(
            user_id=user.user_id,
            username=user.username,
            user_level=user.user_level,
            privacy_consent_yn=user.privacy_consent_yn,
            last_login_dt=user.last_login_dt,
            created_at=user.created_at,
        )