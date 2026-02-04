"""Feedback router."""

from typing import Literal, Optional

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.schemas.feedback import FeedbackRequest, FeedbackResponse

router = APIRouter()
security = HTTPBearer(auto_error=False)

# Mock feedback storage
MOCK_FEEDBACK: list[dict] = []


def get_optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[str]:
    """Extract user ID from token if provided."""
    if credentials:
        # TODO: Implement actual token validation
        return "mock-user-id"
    return None


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    request: FeedbackRequest,
    user_id: Optional[str] = Depends(get_optional_user_id),
) -> FeedbackResponse:
    """Submit user feedback."""
    from datetime import datetime
    import uuid

    feedback = {
        "id": str(uuid.uuid4()),
        "user_id": user_id or "anonymous",
        "spot_id": request.spot_id,
        "type": request.type,
        "message": request.message,
        "created_at": datetime.utcnow().isoformat(),
    }

    MOCK_FEEDBACK.append(feedback)

    return FeedbackResponse(**feedback)
