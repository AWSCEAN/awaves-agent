"""Feedback router."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.feedback import Feedback
from app.schemas.feedback import (
    FeedbackRequest,
    FeedbackResponse,
)
from app.schemas.user import CommonResponse, ErrorDetail
from app.services.auth import AuthService

router = APIRouter()
security = HTTPBearer()


def get_auth_service(session: AsyncSession = Depends(get_db)) -> AuthService:
    """Dependency to get auth service."""
    return AuthService(session)


async def get_required_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service),
) -> int:
    """Extract and validate user ID from token."""
    user_id = await auth_service.verify_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return user_id


@router.post("/saved-item", response_model=CommonResponse[FeedbackResponse])
async def submit_saved_item_feedback(
    request: FeedbackRequest,
    session: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_required_user_id),
) -> CommonResponse[FeedbackResponse]:
    """Submit feedback for a saved item experience."""
    # Check if feedback already exists for this item
    existing = await session.execute(
        select(Feedback).where(
            Feedback.user_id == user_id,
            Feedback.location_id == request.location_id,
            Feedback.surf_timestamp == request.surf_timestamp,
        )
    )
    if existing.scalar_one_or_none():
        return CommonResponse(
            result="error",
            error=ErrorDetail(
                code="FEEDBACK_EXISTS",
                message="Feedback already submitted for this item",
            ),
        )

    # Determine feedback_result based on status
    feedback_result: Optional[bool] = None
    if request.feedback_status == "POSITIVE":
        feedback_result = True
    elif request.feedback_status == "NEGATIVE":
        feedback_result = False
    # DEFERRED keeps feedback_result as None

    feedback = Feedback(
        user_id=user_id,
        location_id=request.location_id,
        surf_timestamp=request.surf_timestamp,
        feedback_result=feedback_result,
        feedback_status=request.feedback_status,
        created_at=datetime.utcnow(),
    )

    session.add(feedback)
    await session.commit()
    await session.refresh(feedback)

    return CommonResponse(
        result="success",
        data=FeedbackResponse.model_validate(feedback),
    )


@router.get("/saved-item/{location_id}/{surf_timestamp}", response_model=CommonResponse[Optional[FeedbackResponse]])
async def get_saved_item_feedback(
    location_id: str,
    surf_timestamp: str,
    session: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_required_user_id),
) -> CommonResponse[Optional[FeedbackResponse]]:
    """Check if feedback exists for a saved item."""
    result = await session.execute(
        select(Feedback).where(
            Feedback.user_id == user_id,
            Feedback.location_id == location_id,
            Feedback.surf_timestamp == surf_timestamp,
        )
    )
    feedback = result.scalar_one_or_none()

    if feedback:
        return CommonResponse(
            result="success",
            data=FeedbackResponse.model_validate(feedback),
        )

    return CommonResponse(result="success", data=None)
