"""Surf data router."""

from typing import Optional

from fastapi import APIRouter, Query

from app.core.exceptions import NotFoundException
from pydantic import BaseModel, Field

from app.schemas.surf import (
    PaginatedSurfInfoResponse,
    SurfInfoResponse,
)
from app.services.prediction_service import get_surf_prediction
from app.repositories.surf_data_repository import SurfDataRepository


class InferencePredictionRequest(BaseModel):
    """Request for inference prediction."""

    location_id: str = Field(..., description="LocationId format: lat#lng")
    surf_date: str = Field(..., description="Date in YYYY-MM-DD format")
    surfer_level: str = Field(..., description="beginner, intermediate, or advanced")

router = APIRouter()


@router.get("/spots", response_model=PaginatedSurfInfoResponse)
async def get_spots(
    min_wave_height: Optional[float] = Query(None, description="Minimum wave height"),
    max_wave_height: Optional[float] = Query(None, description="Maximum wave height"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    time: Optional[str] = Query(None, description="Filter by time (HH:MM)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> PaginatedSurfInfoResponse:
    """Get paginated list of surf spots from DynamoDB."""
    all_spots = await SurfDataRepository.get_spots_for_date(date, time)

    if min_wave_height is not None:
        all_spots = [s for s in all_spots if s["conditions"]["waveHeight"] >= min_wave_height]
    if max_wave_height is not None:
        all_spots = [s for s in all_spots if s["conditions"]["waveHeight"] <= max_wave_height]

    total = len(all_spots)
    start = (page - 1) * page_size
    end = start + page_size
    spots = all_spots[start:end]

    items = [SurfInfoResponse(**s) for s in spots]
    return PaginatedSurfInfoResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=end < total,
    )


@router.get("/search")
async def search_spots(
    q: str = Query(..., min_length=1, description="Search query"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    time: Optional[str] = Query(None, description="Filter by time (HH:MM)"),
) -> list[SurfInfoResponse]:
    """Search surf spots by coordinate substring."""
    results = await SurfDataRepository.search_spots(q, date, time)
    return [SurfInfoResponse(**s) for s in results]


@router.get("/nearby")
async def get_nearby_spots(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
    limit: int = Query(25, ge=1, le=100, description="Max results"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    time: Optional[str] = Query(None, description="Filter by time (HH:MM)"),
) -> list[SurfInfoResponse]:
    """Get spots sorted by distance from given coordinates."""
    results = await SurfDataRepository.get_nearby_spots(
        lat, lng, limit, date, time
    )
    return [SurfInfoResponse(**s) for s in results]


@router.get("/spots/all")
async def get_all_spots_unpaginated(
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    time: Optional[str] = Query(None, description="Filter by time (HH:MM)"),
) -> list[SurfInfoResponse]:
    """Get ALL surf spots (unpaginated) for map marker display."""
    spots = await SurfDataRepository.get_spots_for_date(date, time)
    return [SurfInfoResponse(**s) for s in spots]


@router.get("/spots/{spot_id:path}", response_model=SurfInfoResponse)
async def get_spot(
    spot_id: str,
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
) -> SurfInfoResponse:
    """Get a specific surf spot by LocationId."""
    results = await SurfDataRepository.get_spot_data(spot_id, date)
    if not results:
        raise NotFoundException(message="Spot not found")

    latest = max(results, key=lambda r: r["surfTimestamp"])
    return SurfInfoResponse(**latest)


@router.get("/recommendations")
async def get_recommendations(
    lat: Optional[float] = Query(None, description="User latitude"),
    lng: Optional[float] = Query(None, description="User longitude"),
) -> list[SurfInfoResponse]:
    """Get recommended surf spots."""
    if lat is not None and lng is not None:
        results = await SurfDataRepository.get_nearby_spots(lat, lng, 10)
    else:
        results, _ = await SurfDataRepository.get_all_spots(1, 10)

    return [SurfInfoResponse(**s) for s in results]


@router.post("/predict")
async def predict_surf(request: InferencePredictionRequest) -> dict:
    """Get inference prediction for a location and date.

    Uses real ML model (LightGBM) when available, falls back to mock predictions.
    Results are cached in Redis.
    """
    prediction = await get_surf_prediction(
        request.location_id, request.surf_date, request.surfer_level
    )
    return {"result": "success", "data": prediction}
