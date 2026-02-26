"""Feedback SQLAlchemy model."""

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Feedback(Base):
    """Feedback model for Aurora PostgreSQL."""

    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True
    )
    location_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    surf_timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    feedback_result: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    feedback_status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    def __repr__(self) -> str:
        return f"<Feedback {self.id} - {self.type}>"
