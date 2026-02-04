"""Surf data router."""

from typing import Optional

from fastapi import APIRouter, Query

from app.schemas.surf import (
    PaginatedSpotsResponse,
    SpotResponse,
    SurfConditionsResponse,
)

router = APIRouter()


# Mock data for now
MOCK_SPOTS = [
    {
        "id": "kr-yangyang-jukdo",
        "name": "Jukdo Beach",
        "name_ko": "죽도해변",
        "latitude": 38.0765,
        "longitude": 128.6234,
        "region": "Yangyang",
        "country": "South Korea",
        "difficulty": "beginner",
        "wave_type": "Beach Break",
        "best_season": ["summer", "fall"],
        "description": "Popular surf spot for beginners",
        "current_conditions": {
            "wave_height": 1.2,
            "wave_height_max": 1.5,
            "wave_period": 8,
            "wave_direction": 90,
            "wind_speed": 12,
            "wind_direction": 45,
            "water_temperature": 22,
            "air_temperature": 26,
            "tide": "mid",
            "rating": 4,
            "updated_at": "2024-01-01T12:00:00Z",
        },
    },
]


@router.get("/spots", response_model=PaginatedSpotsResponse)
async def get_spots(
    region: Optional[str] = Query(None, description="Filter by region"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty level"),
    min_wave_height: Optional[float] = Query(None, description="Minimum wave height in meters"),
    max_wave_height: Optional[float] = Query(None, description="Maximum wave height in meters"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> PaginatedSpotsResponse:
    """Get paginated list of surf spots with optional filters."""
    # TODO: Implement actual database query with filters
    spots = MOCK_SPOTS

    # Apply filters
    if region:
        spots = [s for s in spots if s["region"].lower() == region.lower()]
    if difficulty:
        spots = [s for s in spots if s["difficulty"] == difficulty]
    if min_wave_height and spots:
        spots = [
            s
            for s in spots
            if s.get("current_conditions", {}).get("wave_height", 0) >= min_wave_height
        ]
    if max_wave_height and spots:
        spots = [
            s
            for s in spots
            if s.get("current_conditions", {}).get("wave_height", 0) <= max_wave_height
        ]

    # Paginate
    total = len(spots)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_spots = spots[start:end]

    return PaginatedSpotsResponse(
        items=paginated_spots,
        total=total,
        page=page,
        page_size=page_size,
        has_more=end < total,
    )


@router.get("/spots/{spot_id}", response_model=SpotResponse)
async def get_spot(spot_id: str) -> SpotResponse:
    """Get a specific surf spot by ID."""
    # TODO: Implement actual database query
    for spot in MOCK_SPOTS:
        if spot["id"] == spot_id:
            return SpotResponse(**spot)

    from fastapi import HTTPException, status

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spot not found")


@router.get("/search")
async def search_spots(
    q: str = Query(..., min_length=1, description="Search query"),
) -> list[SpotResponse]:
    """Search surf spots by name or location."""
    # TODO: Implement actual search
    query_lower = q.lower()
    results = [
        SpotResponse(**spot)
        for spot in MOCK_SPOTS
        if query_lower in spot["name"].lower()
        or query_lower in spot.get("name_ko", "").lower()
        or query_lower in spot["region"].lower()
    ]
    return results


@router.get("/spots/{spot_id}/conditions", response_model=SurfConditionsResponse)
async def get_spot_conditions(spot_id: str) -> SurfConditionsResponse:
    """Get current surf conditions for a spot."""
    # TODO: Implement actual data fetch from DynamoDB
    for spot in MOCK_SPOTS:
        if spot["id"] == spot_id and "current_conditions" in spot:
            return SurfConditionsResponse(**spot["current_conditions"])

    from fastapi import HTTPException, status

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conditions not found")


@router.get("/recommendations")
async def get_recommendations(
    user_id: Optional[str] = Query(None, description="User ID for personalized recommendations"),
) -> list[SpotResponse]:
    """Get recommended surf spots (optionally personalized)."""
    # TODO: Implement AI-based recommendations
    return [SpotResponse(**spot) for spot in MOCK_SPOTS[:5]]
