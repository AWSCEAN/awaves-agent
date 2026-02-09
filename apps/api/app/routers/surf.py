"""Surf data router."""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.surf import (
    PaginatedSurfInfoResponse,
    SurfInfoResponse,
)
from app.services.surf_dynamodb import SurfDynamoDBService

router = APIRouter()


@router.get("/spots", response_model=PaginatedSurfInfoResponse)
async def get_spots(
    min_wave_height: Optional[float] = Query(None, description="Minimum wave height"),
    max_wave_height: Optional[float] = Query(None, description="Maximum wave height"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> PaginatedSurfInfoResponse:
    """Get paginated list of surf spots from DynamoDB."""
    spots, total = await SurfDynamoDBService.get_all_spots(page, page_size)

    if min_wave_height is not None:
        spots = [s for s in spots if s["conditions"]["waveHeight"] >= min_wave_height]
    if max_wave_height is not None:
        spots = [s for s in spots if s["conditions"]["waveHeight"] <= max_wave_height]

    items = [SurfInfoResponse(**s) for s in spots]
    return PaginatedSurfInfoResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/search")
async def search_spots(
    q: str = Query(..., min_length=1, description="Search query"),
) -> list[SurfInfoResponse]:
    """Search surf spots by coordinate substring."""
    results = await SurfDynamoDBService.search_spots(q)
    return [SurfInfoResponse(**s) for s in results]


@router.get("/nearby")
async def get_nearby_spots(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
    limit: int = Query(25, ge=1, le=100, description="Max results"),
) -> list[SurfInfoResponse]:
    """Get spots sorted by distance from given coordinates."""
    results = await SurfDynamoDBService.get_nearby_spots(lat, lng, limit)
    return [SurfInfoResponse(**s) for s in results]


@router.get("/spots/{spot_id:path}", response_model=SurfInfoResponse)
async def get_spot(
    spot_id: str,
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
) -> SurfInfoResponse:
    """Get a specific surf spot by LocationId."""
    results = await SurfDynamoDBService.get_spot_data(spot_id, date)
    if not results:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spot not found")

    latest = max(results, key=lambda r: r["SurfTimestamp"])
    return SurfInfoResponse(**latest)


@router.get("/recommendations")
async def get_recommendations(
    lat: Optional[float] = Query(None, description="User latitude"),
    lng: Optional[float] = Query(None, description="User longitude"),
) -> list[SurfInfoResponse]:
    """Get recommended surf spots."""
    if lat is not None and lng is not None:
        results = await SurfDynamoDBService.get_nearby_spots(lat, lng, 10)
    else:
        results, _ = await SurfDynamoDBService.get_all_spots(1, 10)

    return [SurfInfoResponse(**s) for s in results]
