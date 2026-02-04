"""Saved spots router."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas.surf import SavedSpotRequest, SavedSpotResponse

router = APIRouter()
security = HTTPBearer()

# Mock saved spots storage
MOCK_SAVED_SPOTS: dict[str, list[dict]] = {}


def get_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extract user ID from token (mock implementation)."""
    # TODO: Implement actual token validation
    return "mock-user-id"


@router.get("", response_model=list[SavedSpotResponse])
async def get_saved_spots(
    user_id: str = Depends(get_user_id),
) -> list[SavedSpotResponse]:
    """Get all saved spots for the current user."""
    saved = MOCK_SAVED_SPOTS.get(user_id, [])
    return [SavedSpotResponse(**spot) for spot in saved]


@router.post("", response_model=SavedSpotResponse, status_code=status.HTTP_201_CREATED)
async def save_spot(
    request: SavedSpotRequest,
    user_id: str = Depends(get_user_id),
) -> SavedSpotResponse:
    """Save a surf spot to user's collection."""
    from datetime import datetime
    import uuid

    # Check if already saved
    user_saved = MOCK_SAVED_SPOTS.get(user_id, [])
    for saved in user_saved:
        if saved["spot_id"] == request.spot_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Spot already saved",
            )

    # Create saved spot
    saved_spot = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "spot_id": request.spot_id,
        "notes": request.notes,
        "saved_at": datetime.utcnow().isoformat(),
    }

    if user_id not in MOCK_SAVED_SPOTS:
        MOCK_SAVED_SPOTS[user_id] = []
    MOCK_SAVED_SPOTS[user_id].append(saved_spot)

    return SavedSpotResponse(**saved_spot)


@router.delete("/{saved_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_saved_spot(
    saved_id: str,
    user_id: str = Depends(get_user_id),
) -> None:
    """Remove a saved spot."""
    user_saved = MOCK_SAVED_SPOTS.get(user_id, [])
    for i, saved in enumerate(user_saved):
        if saved["id"] == saved_id:
            del MOCK_SAVED_SPOTS[user_id][i]
            return

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Saved spot not found",
    )


@router.patch("/{saved_id}", response_model=SavedSpotResponse)
async def update_saved_spot(
    saved_id: str,
    notes: Optional[str] = None,
    user_id: str = Depends(get_user_id),
) -> SavedSpotResponse:
    """Update notes for a saved spot."""
    user_saved = MOCK_SAVED_SPOTS.get(user_id, [])
    for saved in user_saved:
        if saved["id"] == saved_id:
            if notes is not None:
                saved["notes"] = notes
            return SavedSpotResponse(**saved)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Saved spot not found",
    )
