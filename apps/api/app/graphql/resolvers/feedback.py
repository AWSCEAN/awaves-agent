"""Feedback resolvers for GraphQL."""

from datetime import datetime
from typing import Optional
from graphql import GraphQLError
from strawberry.types import Info
from sqlalchemy import select

from app.graphql.context import GraphQLContext
from app.graphql.types.feedback import FeedbackResult, FeedbackResponse, FeedbackInput
from app.graphql.types.saved import FeedbackStatus
from app.models.feedback import Feedback


async def submit_feedback(
    info: Info[GraphQLContext, None],
    input: FeedbackInput,
) -> FeedbackResponse:
    """Submit feedback for a saved item."""
    if not info.context.is_authenticated:
        raise GraphQLError("Not authenticated", extensions={"code": "UNAUTHENTICATED"})

    user_id = info.context.user_id
    session = info.context.db

    # Check if feedback already exists
    existing = await session.execute(
        select(Feedback).where(
            Feedback.user_id == user_id,
            Feedback.location_id == input.location_id,
            Feedback.surf_timestamp == input.surf_timestamp,
        )
    )
    if existing.scalar_one_or_none():
        return FeedbackResponse(
            success=False,
            error="Feedback already submitted for this item",
        )

    # Determine feedback_result based on status
    feedback_result: Optional[bool] = None
    if input.feedback_status == FeedbackStatus.POSITIVE:
        feedback_result = True
    elif input.feedback_status == FeedbackStatus.NEGATIVE:
        feedback_result = False

    feedback = Feedback(
        user_id=user_id,
        location_id=input.location_id,
        surf_timestamp=input.surf_timestamp,
        feedback_result=feedback_result,
        feedback_status=input.feedback_status.value,
        created_at=datetime.utcnow(),
    )

    session.add(feedback)
    await session.commit()
    await session.refresh(feedback)

    return FeedbackResponse(
        success=True,
        data=FeedbackResult.from_model(feedback),
    )


async def get_feedback(
    info: Info[GraphQLContext, None],
    location_id: str,
    surf_timestamp: str,
) -> Optional[FeedbackResult]:
    """Get feedback for a saved item."""
    if not info.context.is_authenticated:
        raise GraphQLError("Not authenticated", extensions={"code": "UNAUTHENTICATED"})

    user_id = info.context.user_id
    session = info.context.db

    result = await session.execute(
        select(Feedback).where(
            Feedback.user_id == user_id,
            Feedback.location_id == location_id,
            Feedback.surf_timestamp == surf_timestamp,
        )
    )
    feedback = result.scalar_one_or_none()

    if feedback:
        return FeedbackResult.from_model(feedback)

    return None
