"""Location search router using OpenSearch."""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.surf import SurfInfoResponse
from app.services.opensearch_service import OpenSearchService
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
    """Search locations by keyword using OpenSearch.

    Searches across display_name, city, state, and country fields.
    Supports Korean search when language=ko or Korean characters are detected.
    Returns surf_info data filtered by date, time, and surfer level.
    """
    if not OpenSearchService._available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Search service is not available. OpenSearch may be down.",
        )

    results = await SearchService.search(
        q, size=size, date=date, time=time, surfer_level=surfer_level,
        language=language,
    )
    return [SurfInfoResponse(**r) for r in results]
