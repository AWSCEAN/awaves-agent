"""Surf data Pydantic schemas."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class SurfConditionsResponse(BaseModel):
    """Surf conditions response schema."""

    wave_height: float = Field(..., ge=0, description="Wave height in meters")
    wave_height_max: Optional[float] = Field(None, ge=0)
    wave_period: float = Field(..., ge=0, description="Wave period in seconds")
    wave_direction: float = Field(..., ge=0, le=360, description="Wave direction in degrees")
    wind_speed: float = Field(..., ge=0, description="Wind speed in km/h")
    wind_direction: float = Field(..., ge=0, le=360, description="Wind direction in degrees")
    water_temperature: float = Field(..., description="Water temperature in Celsius")
    air_temperature: float = Field(..., description="Air temperature in Celsius")
    tide: Literal["low", "mid", "high"]
    rating: int = Field(..., ge=1, le=5, description="Conditions rating 1-5")
    updated_at: datetime


class SpotResponse(BaseModel):
    """Surf spot response schema."""

    id: str
    name: str
    name_ko: Optional[str] = None
    latitude: float
    longitude: float
    region: str
    country: str
    difficulty: Literal["beginner", "intermediate", "advanced", "expert"]
    wave_type: str
    best_season: list[str]
    description: Optional[str] = None
    description_ko: Optional[str] = None
    image_url: Optional[str] = None
    current_conditions: Optional[SurfConditionsResponse] = None

    class Config:
        from_attributes = True


class PaginatedSpotsResponse(BaseModel):
    """Paginated spots response."""

    items: list[SpotResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class GeoResponse(BaseModel):
    lat: float
    lng: float


class ConditionsResponse(BaseModel):
    waveHeight: float = 0
    wavePeriod: float = 0
    windSpeed: float = 0
    waterTemperature: float = 0


class LevelMetricsResponse(BaseModel):
    surfScore: float = 0
    surfGrade: str = "D"
    surfGradeNumeric: float = 0.0


class DerivedMetricsResponse(BaseModel):
    BEGINNER: LevelMetricsResponse = LevelMetricsResponse()
    INTERMEDIATE: LevelMetricsResponse = LevelMetricsResponse()
    ADVANCED: LevelMetricsResponse = LevelMetricsResponse()


class MetadataResponse(BaseModel):
    modelVersion: str = ""
    dataSource: str = ""
    predictionType: str = "FORECAST"
    createdAt: str = ""


class SurfInfoResponse(BaseModel):
    """SurfInfo response matching FE SurfInfo type."""

    locationId: str
    surfTimestamp: str
    geo: GeoResponse
    conditions: ConditionsResponse
    derivedMetrics: DerivedMetricsResponse
    metadata: MetadataResponse
    name: str = ""
    nameKo: Optional[str] = None
    region: str = ""
    regionKo: Optional[str] = None
    country: str = ""
    countryKo: Optional[str] = None
    address: Optional[str] = None
    addressKo: Optional[str] = None
    city: Optional[str] = None
    cityKo: Optional[str] = None
    difficulty: str = "intermediate"
    waveType: str = "Beach Break"
    bestSeason: list[str] = []
    description: Optional[str] = None
    descriptionKo: Optional[str] = None
    distance: Optional[float] = None


class PaginatedSurfInfoResponse(BaseModel):
    """Paginated SurfInfo response."""

    items: list[SurfInfoResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class SavedSpotRequest(BaseModel):
    """Request to save a spot."""

    spot_id: str
    notes: Optional[str] = None


class SavedSpotResponse(BaseModel):
    """Saved spot response."""

    id: str
    user_id: str
    spot_id: str
    notes: Optional[str] = None
    saved_at: datetime

    class Config:
        from_attributes = True
