"""Saved list Pydantic schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SavedItemRequest(BaseModel):
    """Request to save a surf location."""

    location_id: str = Field(..., description="Location ID (latitude#longitude)")
    surf_timestamp: str = Field(..., description="Surf data timestamp")
    departure_date: Optional[str] = Field(None, description="Planned departure date")

    # Location info
    address: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None

    # Surf conditions
    wave_height: Optional[float] = Field(None, ge=0)
    wave_period: Optional[float] = Field(None, ge=0)
    wind_speed: Optional[float] = Field(None, ge=0)
    water_temperature: Optional[float] = None

    # User/Surf ratings
    surfer_level: str = Field(..., description="User's surf skill level")
    surf_score: float = Field(..., ge=0, le=100)
    surf_grade: str = Field(..., description="Surf grade (A, B, C, etc.)")
    surf_safety_grade: str = Field(..., description="Safety grade")


class SavedItemResponse(BaseModel):
    """Saved item response."""

    user_id: str
    sort_key: str
    location_id: str
    surf_timestamp: str
    saved_at: str

    # Location info
    address: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    departure_date: Optional[str] = None

    # Surf conditions
    wave_height: Optional[float] = None
    wave_period: Optional[float] = None
    wind_speed: Optional[float] = None
    water_temperature: Optional[float] = None

    # User/Surf ratings
    surfer_level: str
    surf_score: float
    surf_grade: str
    surf_safety_grade: str

    # Change notification
    flag_change: bool = False
    change_message: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True

    @classmethod
    def from_dynamodb(cls, item: dict) -> "SavedItemResponse":
        """Create response from DynamoDB item."""
        return cls(
            user_id=item.get("UserId", ""),
            sort_key=item.get("SortKey", ""),
            location_id=item.get("LocationId", ""),
            surf_timestamp=item.get("SurfTimestamp", ""),
            saved_at=item.get("SavedAt", ""),
            address=item.get("Address"),
            region=item.get("Region"),
            country=item.get("Country"),
            departure_date=item.get("DepartureDate"),
            wave_height=item.get("waveHeight"),
            wave_period=item.get("wavePeriod"),
            wind_speed=item.get("windSpeed"),
            water_temperature=item.get("waterTemperature"),
            surfer_level=item.get("SurferLevel", ""),
            surf_score=item.get("surfScore", 0),
            surf_grade=item.get("surfGrade", ""),
            surf_safety_grade=item.get("surfSafetyGrade", ""),
            flag_change=item.get("flagChange", False),
            change_message=item.get("changeMessage"),
        )


class SavedListResponse(BaseModel):
    """Response containing list of saved items."""

    items: list[SavedItemResponse]
    total: int


class DeleteSavedItemRequest(BaseModel):
    """Request to delete a saved item."""

    location_id: str
    surf_timestamp: str


class AcknowledgeChangeRequest(BaseModel):
    """Request to acknowledge a change notification."""

    location_id: str
    surf_timestamp: str
