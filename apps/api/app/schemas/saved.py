"""Saved list Pydantic schemas."""

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


class SavedItemResponse(BaseModel):
    """Saved item response."""

    user_id: str
    location_surf_key: str = Field(..., description="Composite key: {locationId}#{surfTimestamp}")
    location_id: str
    surf_timestamp: str
    saved_at: str
    departure_date: Optional[str] = None

    # Location info
    address: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None

    # Surf conditions
    wave_height: Optional[float] = None
    wave_period: Optional[float] = None
    wind_speed: Optional[float] = None
    water_temperature: Optional[float] = None

    # User/Surf ratings
    surfer_level: str
    surf_score: float
    surf_grade: str

    # Change notification
    flag_change: bool = False
    change_message: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True

    @classmethod
    def from_dynamodb(cls, item: dict) -> "SavedItemResponse":
        """Create response from DynamoDB item."""
        location_id = item.get("LocationId", "")
        surf_timestamp = item.get("SurfTimestamp", "")
        location_surf_key = item.get("SortKey", f"{location_id}#{surf_timestamp}")

        return cls(
            user_id=item.get("UserId", ""),
            location_surf_key=location_surf_key,
            location_id=location_id,
            surf_timestamp=surf_timestamp,
            saved_at=item.get("SavedAt", ""),
            departure_date=item.get("DepartureDate"),
            address=item.get("Address"),
            region=item.get("Region"),
            country=item.get("Country"),
            wave_height=item.get("waveHeight"),
            wave_period=item.get("wavePeriod"),
            wind_speed=item.get("windSpeed"),
            water_temperature=item.get("waterTemperature"),
            surfer_level=item.get("SurferLevel", ""),
            surf_score=item.get("surfScore", 0),
            surf_grade=item.get("surfGrade", ""),
            flag_change=item.get("flagChange", False),
            change_message=item.get("changeMessage"),
        )


class SavedListResponse(BaseModel):
    """Response containing list of saved items."""

    items: list[SavedItemResponse]
    total: int


class DeleteSavedItemRequest(BaseModel):
    """Request to delete a saved item."""

    location_surf_key: Optional[str] = Field(default=None, description="Composite key: {locationId}#{surfTimestamp}")
    location_id: Optional[str] = Field(default=None)
    surf_timestamp: Optional[str] = Field(default=None)


class AcknowledgeChangeRequest(BaseModel):
    """Request to acknowledge a change notification."""

    location_surf_key: Optional[str] = Field(default=None, description="Composite key: {locationId}#{surfTimestamp}")
    location_id: Optional[str] = Field(default=None)
    surf_timestamp: Optional[str] = Field(default=None)
