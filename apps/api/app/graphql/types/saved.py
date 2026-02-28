"""Saved items GraphQL types."""

import strawberry
from typing import Optional
from enum import Enum


@strawberry.enum
class FeedbackStatus(Enum):
    """Feedback status enum."""

    POSITIVE = "POSITIVE"
    NEGATIVE = "NEGATIVE"
    DEFERRED = "DEFERRED"


@strawberry.type
class SavedItem:
    """Saved surf spot item."""

    user_id: str
    location_surf_key: str
    location_id: str
    surf_timestamp: str
    saved_at: str
    departure_date: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    wave_height: Optional[float] = None
    wave_period: Optional[float] = None
    wind_speed: Optional[float] = None
    water_temperature: Optional[float] = None
    surfer_level: str
    surf_score: float
    surf_grade: str
    flag_change: bool = False
    change_message: Optional[str] = None
    feedback_status: Optional[FeedbackStatus] = None

    @classmethod
    def from_dynamodb(cls, item: dict, feedback_status: Optional[str] = None) -> "SavedItem":
        """Create SavedItem from DynamoDB item."""
        location_id = item.get("locationId", "")
        surf_timestamp = item.get("surfTimestamp", "")
        location_surf_key = item.get("sortKey", f"{location_id}#{surf_timestamp}")

        fb_status = None
        if feedback_status:
            fb_status = FeedbackStatus(feedback_status)

        return cls(
            user_id=item.get("userId", ""),
            location_surf_key=location_surf_key,
            location_id=location_id,
            surf_timestamp=surf_timestamp,
            saved_at=item.get("savedAt", ""),
            departure_date=item.get("departureDate"),
            address=item.get("address"),
            region=item.get("region"),
            country=item.get("country"),
            wave_height=item.get("waveHeight"),
            wave_period=item.get("wavePeriod"),
            wind_speed=item.get("windSpeed"),
            water_temperature=item.get("waterTemperature"),
            surfer_level=item.get("surferLevel", ""),
            surf_score=item.get("surfScore", 0),
            surf_grade=item.get("surfGrade", ""),
            flag_change=item.get("flagChange", False),
            change_message=item.get("changeMessage"),
            feedback_status=fb_status,
        )


@strawberry.type
class SavedListResult:
    """Result for saved items list query."""

    items: list[SavedItem]
    total: int


@strawberry.type
class SavedItemResponse:
    """Response for save item mutation."""

    success: bool
    data: Optional[SavedItem] = None
    error: Optional[str] = None


@strawberry.input
class SaveItemInput:
    """Input for saving an item."""

    location_id: str
    surf_timestamp: str
    departure_date: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    wave_height: Optional[float] = None
    wave_period: Optional[float] = None
    wind_speed: Optional[float] = None
    water_temperature: Optional[float] = None
    surfer_level: str
    surf_score: float
    surf_grade: str


@strawberry.input
class DeleteSavedItemInput:
    """Input for deleting a saved item."""

    location_surf_key: Optional[str] = None
    location_id: Optional[str] = None
    surf_timestamp: Optional[str] = None


@strawberry.input
class AcknowledgeChangeInput:
    """Input for acknowledging a change."""

    location_surf_key: Optional[str] = None
    location_id: Optional[str] = None
    surf_timestamp: Optional[str] = None