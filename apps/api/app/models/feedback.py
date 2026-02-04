"""Feedback SQLAlchemy model."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Feedback(Base):
    """Feedback model for Aurora PostgreSQL."""

    __tablename__ = "feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    spot_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # bug, feature, data_correction, general
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    def __repr__(self) -> str:
        return f"<Feedback {self.id} - {self.type}>"
