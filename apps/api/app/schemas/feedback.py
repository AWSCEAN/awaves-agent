"""Feedback Pydantic schemas."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


FeedbackStatus = Literal["POSITIVE", "NEGATIVE", "DEFERRED"]


class FeedbackRequest(BaseModel):
    """Request to submit feedback for a saved item."""

    location_id: str = Field(..., description="Location ID of the saved item")
    surf_timestamp: str = Field(..., description="Surf timestamp of the saved item")
    feedback_status: FeedbackStatus = Field(
        ..., description="POSITIVE (good), NEGATIVE (not good), or DEFERRED (later)"
    )


class FeedbackResponse(BaseModel):
    """Response for feedback."""

    id: int
    user_id: int
    location_id: str
    surf_timestamp: str
    feedback_result: Optional[bool] = None  # True = good, False = not good, None = deferred
    feedback_status: FeedbackStatus
    created_at: datetime

    class Config:
        from_attributes = True
