"""Feedback router."""

from datetime import datetime
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.feedback import Feedback, SavedItemFeedback
from app.schemas.feedback import (
    FeedbackRequest,
    FeedbackResponse,
    SavedItemFeedbackRequest,
    SavedItemFeedbackResponse,
)
from app.schemas.user import CommonResponse, ErrorDetail
from app.services.auth import AuthService

router = APIRouter()
security = HTTPBearer(auto_error=False)


def get_auth_service(session: AsyncSession = Depends(get_db)) -> AuthService:
    """Dependency to get auth service."""
    return AuthService(session)


async def get_optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_service: AuthService = Depends(get_auth_service),
) -> Optional[str]:
    """Extract user ID from token if provided."""
    if credentials:
        user_id = await auth_service.verify_access_token(credentials.credentials)
        return str(user_id) if user_id else None
    return None


async def get_required_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    auth_service: AuthService = Depends(get_auth_service),
) -> str:
    """Extract and validate user ID from token."""
    user_id = await auth_service.verify_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return str(user_id)


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    request: FeedbackRequest,
    session: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Depends(get_optional_user_id),
) -> FeedbackResponse:
    """Submit user feedback."""
    feedback = Feedback(
        id=str(uuid.uuid4()),
        user_id=user_id or "anonymous",
        spot_id=request.spot_id,
        type=request.type,
        message=request.message,
        created_at=datetime.utcnow(),
    )

    session.add(feedback)
    await session.commit()
    await session.refresh(feedback)

    return FeedbackResponse.model_validate(feedback)


@router.post("/saved-item", response_model=CommonResponse[SavedItemFeedbackResponse])
async def submit_saved_item_feedback(
    request: SavedItemFeedbackRequest,
    session: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_required_user_id),
) -> CommonResponse[SavedItemFeedbackResponse]:
    """Submit feedback for a saved item experience."""
    # Check if feedback already exists for this item
    existing = await session.execute(
        select(SavedItemFeedback).where(
            SavedItemFeedback.user_id == user_id,
            SavedItemFeedback.location_id == request.location_id,
            SavedItemFeedback.surf_timestamp == request.surf_timestamp,
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
    feedback_result = None
    if request.feedback_status == "POSITIVE":
        feedback_result = 1
    elif request.feedback_status == "NEGATIVE":
        feedback_result = 0
    # DEFERRED keeps feedback_result as None

    feedback = SavedItemFeedback(
        id=str(uuid.uuid4()),
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
        data=SavedItemFeedbackResponse.model_validate(feedback),
    )


@router.get("/saved-item/{location_id}/{surf_timestamp}", response_model=CommonResponse[Optional[SavedItemFeedbackResponse]])
async def get_saved_item_feedback(
    location_id: str,
    surf_timestamp: str,
    session: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_required_user_id),
) -> CommonResponse[Optional[SavedItemFeedbackResponse]]:
    """Check if feedback exists for a saved item."""
    result = await session.execute(
        select(SavedItemFeedback).where(
            SavedItemFeedback.user_id == user_id,
            SavedItemFeedback.location_id == location_id,
            SavedItemFeedback.surf_timestamp == surf_timestamp,
        )
    )
    feedback = result.scalar_one_or_none()

    if feedback:
        return CommonResponse(
            result="success",
            data=SavedItemFeedbackResponse.model_validate(feedback),
        )

    return CommonResponse(result="success", data=None)
