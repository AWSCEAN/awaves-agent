"""Feedback Pydantic schemas."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class FeedbackRequest(BaseModel):
    """Feedback submission request."""

    spot_id: Optional[str] = None
    type: Literal["bug", "feature", "data_correction", "general"]
    message: str = Field(..., min_length=10, max_length=2000)


class FeedbackResponse(BaseModel):
    """Feedback response schema."""

    id: str
    user_id: str
    spot_id: Optional[str] = None
    type: Literal["bug", "feature", "data_correction", "general"]
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


# Saved Item Feedback schemas
FeedbackStatus = Literal["POSITIVE", "NEGATIVE", "DEFERRED"]


class SavedItemFeedbackRequest(BaseModel):
    """Request to submit feedback for a saved item."""

    location_id: str = Field(..., description="Location ID of the saved item")
    surf_timestamp: str = Field(..., description="Surf timestamp of the saved item")
    feedback_status: FeedbackStatus = Field(
        ..., description="POSITIVE (good), NEGATIVE (not good), or DEFERRED (later)"
    )


class SavedItemFeedbackResponse(BaseModel):
    """Response for saved item feedback."""

    id: str
    user_id: str
    location_id: str
    surf_timestamp: str
    feedback_result: Optional[int] = None  # 1 = good, 0 = not good, null = deferred
    feedback_status: FeedbackStatus
    created_at: datetime

    class Config:
        from_attributes = True
