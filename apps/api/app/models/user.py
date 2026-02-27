"""User SQLAlchemy model."""

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.timezone import now_kst
from app.db.session import Base


class User(Base):
    """User model with username-based registration for PostgreSQL."""

    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    user_level: Mapped[str] = mapped_column(String(20), nullable=False)  # beginner, intermediate, advanced
    privacy_consent_yn: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_login_dt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=now_kst, nullable=False
    )

    def __repr__(self) -> str:
        return f"<User {self.username}>"


# Alias for backward compatibility
UserV2 = User
