"""Location search router."""

from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.schemas.surf import SurfInfoResponse
from app.services.search_service import SearchService
from app.services.opensearch_service import OpenSearchService


class LocationSuggestion(BaseModel):
    """Autocomplete suggestion for a location."""

    locationId: str
    display_name: str
    city: str
    state: str
    country: str
    display_name_ko: str
    city_ko: str
    state_ko: str
    country_ko: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    score: float


router = APIRouter()


@router.get("/suggest", response_model=list[LocationSuggestion])
async def suggest_locations(
    q: str = Query(..., min_length=1, description="Partial text for autocomplete"),
    size: int = Query(10, ge=1, le=50, description="Max suggestions"),
) -> list[LocationSuggestion]:
    """Get autocomplete suggestions using OpenSearch completion suggester.

    Fast autocomplete endpoint that uses OpenSearch completion field.
    Returns suggestions as you type, supporting both English and Korean.

    Examples:
    - /search/suggest?q=Hahyo
    - /search/suggest?q=서귀포
    - /search/suggest?q=Soesoggak
    """
    results = await OpenSearchService.suggest_locations(q, size)
    return [LocationSuggestion(**r) for r in results]


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
