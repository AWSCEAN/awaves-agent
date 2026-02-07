"""Saved list router with DynamoDB integration.

DEPRECATED: These REST endpoints are deprecated in favor of GraphQL.
Use /graphql endpoint with savedItems query and mutations instead.
"""

import warnings
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Deprecation warning for this module
warnings.warn(
    "REST /saved/* endpoints are deprecated. Use GraphQL /graphql instead.",
    DeprecationWarning,
    stacklevel=2,
)

from app.db.session import get_db
from app.models.feedback import Feedback
from app.schemas.saved import (
    AcknowledgeChangeRequest,
    DeleteSavedItemRequest,
    FeedbackStatus,
    SavedItemRequest,
    SavedItemResponse,
    SavedListResponse,
)
from app.schemas.user import CommonResponse, ErrorDetail
from app.services.auth import AuthService
from app.services.cache import CacheService
from app.services.dynamodb import DynamoDBService

router = APIRouter()
security = HTTPBearer()


def get_auth_service(session: AsyncSession = Depends(get_db)) -> AuthService:
    """Dependency to get auth service."""
    return AuthService(session)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
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


async def _get_feedback_map(
    session: AsyncSession,
    user_id: int,
) -> dict[str, FeedbackStatus]:
    """Get feedback status for saved items from PostgreSQL."""
    # Query all feedback for the user
    result = await session.execute(
        select(Feedback).where(
            Feedback.user_id == user_id,
        )
    )
    feedbacks = result.scalars().all()

    # Build map of location_id#surf_timestamp -> feedback_status
    feedback_map: dict[str, FeedbackStatus] = {}
    for fb in feedbacks:
        key = f"{fb.location_id}#{fb.surf_timestamp}"
        feedback_map[key] = fb.feedback_status  # type: ignore

    return feedback_map


@router.get(
    "",
    response_model=CommonResponse[SavedListResponse],
    deprecated=True,
    description="DEPRECATED: Use GraphQL query `savedItems` instead.",
)
async def get_saved_list(
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> CommonResponse[SavedListResponse]:
    """Get all saved items for the current user.

    DEPRECATED: Use GraphQL query `savedItems` instead.
    """
    # Try cache first
    cached_items = await CacheService.get_saved_items(user_id)
    if cached_items is not None:
        db_items = cached_items
    else:
        # Fallback to DynamoDB
        db_items = await DynamoDBService.get_saved_list(user_id)

        # Update cache
        if db_items:
            await CacheService.store_saved_items(user_id, db_items)

    # Get feedback status for items from PostgreSQL
    feedback_map = await _get_feedback_map(session, int(user_id))

    # Build response items with feedback status
    items = []
    for item in db_items:
        location_id = item.get("LocationId", "")
        surf_timestamp = item.get("SurfTimestamp", "")
        key = f"{location_id}#{surf_timestamp}"
        feedback_status = feedback_map.get(key)
        items.append(SavedItemResponse.from_dynamodb(item, feedback_status))

    return CommonResponse(
        result="success",
        data=SavedListResponse(items=items, total=len(items)),
    )


@router.post(
    "",
    response_model=CommonResponse[SavedItemResponse],
    status_code=status.HTTP_201_CREATED,
    deprecated=True,
    description="DEPRECATED: Use GraphQL mutation `saveItem` instead.",
)
async def save_item(
    request: SavedItemRequest,
    user_id: str = Depends(get_current_user_id),
) -> CommonResponse[SavedItemResponse]:
    """Save a surf location to user's collection.

    DEPRECATED: Use GraphQL mutation `saveItem` instead.
    """
    saved_at = datetime.utcnow().isoformat() + "Z"

    try:
        result = await DynamoDBService.save_item(
            user_id=user_id,
            location_id=request.location_id,
            surf_timestamp=request.surf_timestamp,
            saved_at=saved_at,
            surfer_level=request.surfer_level,
            surf_score=request.surf_score,
            surf_grade=request.surf_grade,
            address=request.address,
            region=request.region,
            country=request.country,
            departure_date=request.departure_date,
            wave_height=request.wave_height,
            wave_period=request.wave_period,
            wind_speed=request.wind_speed,
            water_temperature=request.water_temperature,
        )

        if result is None:
            return CommonResponse(
                result="error",
                error=ErrorDetail(
                    code="ALREADY_SAVED",
                    message="This location is already saved",
                ),
            )

        # Invalidate cache
        await CacheService.invalidate_saved_items(user_id)

        return CommonResponse(
            result="success",
            data=SavedItemResponse.from_dynamodb(result),
        )
    except Exception as e:
        return CommonResponse(
            result="error",
            error=ErrorDetail(
                code="SAVE_FAILED",
                message=str(e),
            ),
        )


@router.delete(
    "",
    response_model=CommonResponse[None],
    deprecated=True,
    description="DEPRECATED: Use GraphQL mutation `deleteSavedItem` instead.",
)
async def delete_saved_item(
    request: DeleteSavedItemRequest,
    user_id: str = Depends(get_current_user_id),
) -> CommonResponse[None]:
    """Delete a saved item.

    DEPRECATED: Use GraphQL mutation `deleteSavedItem` instead.
    """
    success = await DynamoDBService.delete_item(
        user_id=user_id,
        location_surf_key=request.location_surf_key,
        location_id=request.location_id,
        surf_timestamp=request.surf_timestamp,
    )

    if not success:
        return CommonResponse(
            result="error",
            error=ErrorDetail(
                code="DELETE_FAILED",
                message="Failed to delete saved item",
            ),
        )

    # Invalidate cache
    await CacheService.invalidate_saved_items(user_id)

    return CommonResponse(result="success", data=None)


@router.get(
    "/{location_id}/{surf_timestamp}",
    response_model=CommonResponse[SavedItemResponse],
    deprecated=True,
    description="DEPRECATED: Use GraphQL query `savedItem` instead.",
)
async def get_saved_item(
    location_id: str,
    surf_timestamp: str,
    user_id: str = Depends(get_current_user_id),
) -> CommonResponse[SavedItemResponse]:
    """Get a specific saved item.

    DEPRECATED: Use GraphQL query `savedItem` instead.
    """
    item = await DynamoDBService.get_saved_item(
        user_id=user_id,
        location_id=location_id,
        surf_timestamp=surf_timestamp,
    )

    if not item:
        return CommonResponse(
            result="error",
            error=ErrorDetail(
                code="NOT_FOUND",
                message="Saved item not found",
            ),
        )

    return CommonResponse(
        result="success",
        data=SavedItemResponse.from_dynamodb(item),
    )


@router.post(
    "/acknowledge-change",
    response_model=CommonResponse[None],
    deprecated=True,
    description="DEPRECATED: Use GraphQL mutation `acknowledgeChange` instead.",
)
async def acknowledge_change(
    request: AcknowledgeChangeRequest,
    user_id: str = Depends(get_current_user_id),
) -> CommonResponse[None]:
    """Acknowledge a change notification.

    DEPRECATED: Use GraphQL mutation `acknowledgeChange` instead.
    """
    success = await DynamoDBService.acknowledge_change(
        user_id=user_id,
        location_surf_key=request.location_surf_key,
        location_id=request.location_id,
        surf_timestamp=request.surf_timestamp,
    )

    if not success:
        return CommonResponse(
            result="error",
            error=ErrorDetail(
                code="ACKNOWLEDGE_FAILED",
                message="Failed to acknowledge change",
            ),
        )

    # Invalidate cache
    await CacheService.invalidate_saved_items(user_id)

    return CommonResponse(result="success", data=None)
