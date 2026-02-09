"""Feedback SQLAlchemy model."""

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Feedback(Base):
    """Feedback model for saved item experience (good/bad/deferred)."""

    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    location_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    surf_timestamp: Mapped[str] = mapped_column(String(50), nullable=False)

    # feedback_result: True = good, False = not good, None = deferred
    feedback_result: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    # feedback_status: POSITIVE, NEGATIVE, DEFERRED
    feedback_status: Mapped[str] = mapped_column(String(20), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    def __repr__(self) -> str:
        return f"<Feedback {self.id} - {self.feedback_status}>"
