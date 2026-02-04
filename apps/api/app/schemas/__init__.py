"""Pydantic schemas package."""

from app.schemas.feedback import FeedbackRequest, FeedbackResponse
from app.schemas.surf import (
    PaginatedSpotsResponse,
    SavedSpotRequest,
    SavedSpotResponse,
    SpotResponse,
    SurfConditionsResponse,
)
from app.schemas.user import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

__all__ = [
    "UserResponse",
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "SpotResponse",
    "SurfConditionsResponse",
    "PaginatedSpotsResponse",
    "SavedSpotRequest",
    "SavedSpotResponse",
    "FeedbackRequest",
    "FeedbackResponse",
]
