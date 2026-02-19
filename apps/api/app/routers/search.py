"""Location search router."""

from typing import Optional

from fastapi import APIRouter, Query

from app.schemas.surf import SurfInfoResponse
from app.services.search_service import SearchService

router = APIRouter()


@router.get("", response_model=list[SurfInfoResponse])
async def search_locations(
    q: str = Query(..., min_length=1, description="Keyword search query"),
    size: int = Query(50, ge=1, le=100, description="Max results"),
    date: Optional[str] = Query(None, description="Date filter (yyyy-MM-dd)"),
    time: Optional[str] = Query(None, description="Time filter (HH:mm)"),
    surfer_level: Optional[str] = Query(None, description="Surfer level filter (BEGINNER, INTERMEDIATE, ADVANCED)"),
    language: Optional[str] = Query(None, description="Language hint (en or ko). Auto-detected if omitted."),
) -> list[SurfInfoResponse]:
    """Search locations by keyword.

    Uses OpenSearch when available; falls back to DynamoDB text search otherwise.
    Searches across display_name, city, state, country and Korean variants.
    """
    results = await SearchService.search(
        q, size=size, date=date, time=time, surfer_level=surfer_level,
        language=language,
    )
    return [SurfInfoResponse(**r) for r in results]
