"""Feedback SQLAlchemy model."""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Feedback(Base):
    """Feedback model for Aurora PostgreSQL."""

    __tablename__ = "feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )  # Note: FK constraint removed temporarily during user model migration
    spot_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # bug, feature, data_correction, general
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    def __repr__(self) -> str:
        return f"<Feedback {self.id} - {self.type}>"


class SavedItemFeedback(Base):
    """Feedback model for saved item experience (good/bad/deferred)."""

    __tablename__ = "saved_item_feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    location_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    surf_timestamp: Mapped[str] = mapped_column(String(50), nullable=False)

    # feedback_result: 1 = good, 0 = not good, null = deferred
    feedback_result: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # feedback_status: POSITIVE, NEGATIVE, DEFERRED
    feedback_status: Mapped[str] = mapped_column(String(20), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    def __repr__(self) -> str:
        return f"<SavedItemFeedback {self.id} - {self.feedback_status}>"
