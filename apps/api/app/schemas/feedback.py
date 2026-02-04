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
