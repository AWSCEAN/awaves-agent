"""Feedback GraphQL types."""

import strawberry
from datetime import datetime
from typing import Optional
from .saved import FeedbackStatus


@strawberry.type
class FeedbackResult:
    """Feedback record."""

    id: int
    user_id: int
    location_id: str
    surf_timestamp: datetime
    feedback_result: Optional[bool] = None
    feedback_status: FeedbackStatus
    created_at: datetime

    @classmethod
    def from_model(cls, feedback) -> "FeedbackResult":
        """Create FeedbackResult from SQLAlchemy model."""
        return cls(
            id=feedback.id,
            user_id=feedback.user_id,
            location_id=feedback.location_id,
            surf_timestamp=feedback.surf_timestamp,
            feedback_result=feedback.feedback_result,
            feedback_status=FeedbackStatus(feedback.feedback_status),
            created_at=feedback.created_at,
        )


@strawberry.type
class FeedbackResponse:
    """Response for feedback mutation."""

    success: bool
    data: Optional[FeedbackResult] = None
    error: Optional[str] = None


@strawberry.input
class FeedbackInput:
    """Input for submitting feedback."""

    location_id: str
    surf_timestamp: datetime
    feedback_status: FeedbackStatus