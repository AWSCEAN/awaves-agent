"""Main GraphQL schema definition."""

import logging
from typing import AsyncGenerator, Optional

import strawberry
from datetime import datetime
from fastapi import Request
from strawberry.fastapi import GraphQLRouter
from strawberry.extensions import SchemaExtension

from app.db.session import create_writer_session, create_reader_session
from app.services.auth import AuthService
from app.graphql.context import GraphQLContext
from app.graphql.types.user import User
from app.graphql.types.auth import AuthResponse, LoginInput, RegisterInput, RefreshTokenInput
from app.graphql.types.saved import SavedItem, SavedListResult, SavedItemResponse, SaveItemInput, DeleteSavedItemInput, AcknowledgeChangeInput
from app.graphql.types.feedback import FeedbackResult, FeedbackResponse, FeedbackInput
from app.graphql.types.surf import SurfPredictionInput, SurfPredictionResult
from app.graphql.resolvers import auth as auth_resolvers
from app.graphql.resolvers import saved as saved_resolvers
from app.graphql.resolvers import feedback as feedback_resolvers
from app.graphql.resolvers import surf as surf_resolvers


@strawberry.type
class Query:
    """GraphQL Query type."""

    @strawberry.field
    async def me(self, info: strawberry.Info[GraphQLContext, None]) -> User:
        """Get current authenticated user."""
        return await auth_resolvers.get_current_user(info)

    @strawberry.field
    async def saved_items(self, info: strawberry.Info[GraphQLContext, None]) -> SavedListResult:
        """Get all saved items for current user."""
        return await saved_resolvers.get_saved_items(info)

    @strawberry.field
    async def saved_item(
        self,
        info: strawberry.Info[GraphQLContext, None],
        location_id: str,
        surf_timestamp: str,
    ) -> SavedItem:
        """Get a specific saved item."""
        return await saved_resolvers.get_saved_item(info, location_id, surf_timestamp)

    @strawberry.field
    async def feedback(
        self,
        info: strawberry.Info[GraphQLContext, None],
        location_id: str,
        surf_timestamp: datetime,
    ) -> Optional[FeedbackResult]:
        """Get feedback for a saved item."""
        return await feedback_resolvers.get_feedback(info, location_id, surf_timestamp)

    @strawberry.field
    async def predict_surf(
        self,
        info: strawberry.Info[GraphQLContext, None],
        input: SurfPredictionInput,
    ) -> SurfPredictionResult:
        """Get ML inference prediction for surf conditions."""
        return await surf_resolvers.predict_surf(info, input)


@strawberry.type
class Mutation:
    """GraphQL Mutation type."""

    @strawberry.mutation
    async def login(
        self,
        info: strawberry.Info[GraphQLContext, None],
        input: LoginInput,
    ) -> AuthResponse:
        """Login and get auth tokens."""
        return await auth_resolvers.login(info, input)

    @strawberry.mutation
    async def logout(self, info: strawberry.Info[GraphQLContext, None]) -> bool:
        """Logout current user."""
        return await auth_resolvers.logout(info)

    @strawberry.mutation
    async def refresh_token(
        self,
        info: strawberry.Info[GraphQLContext, None],
        input: RefreshTokenInput,
    ) -> AuthResponse:
        """Refresh auth tokens."""
        return await auth_resolvers.refresh_token(info, input)

    @strawberry.mutation
    async def register(
        self,
        info: strawberry.Info[GraphQLContext, None],
        input: RegisterInput,
    ) -> AuthResponse:
        """Register a new user."""
        return await auth_resolvers.register(info, input)

    @strawberry.mutation
    async def save_item(
        self,
        info: strawberry.Info[GraphQLContext, None],
        input: SaveItemInput,
    ) -> SavedItemResponse:
        """Save a surf location."""
        return await saved_resolvers.save_item(info, input)

    @strawberry.mutation
    async def delete_saved_item(
        self,
        info: strawberry.Info[GraphQLContext, None],
        input: DeleteSavedItemInput,
    ) -> bool:
        """Delete a saved item."""
        return await saved_resolvers.delete_saved_item(info, input)

    @strawberry.mutation
    async def acknowledge_change(
        self,
        info: strawberry.Info[GraphQLContext, None],
        input: AcknowledgeChangeInput,
    ) -> bool:
        """Acknowledge a change notification."""
        return await saved_resolvers.acknowledge_change(info, input)

    @strawberry.mutation
    async def submit_feedback(
        self,
        info: strawberry.Info[GraphQLContext, None],
        input: FeedbackInput,
    ) -> FeedbackResponse:
        """Submit feedback for a saved item."""
        return await feedback_resolvers.submit_feedback(info, input)


_logger = logging.getLogger(__name__)


class SessionCleanupExtension(SchemaExtension):
    """Close DB sessions after each GraphQL request to prevent connection leaks."""

    async def on_execute(self) -> AsyncGenerator[None, None]:
        yield
        context = self.execution_context.context
        if hasattr(context, "close"):
            try:
                await context.close()
            except Exception as e:
                _logger.warning("Failed to close GraphQL DB sessions: %s", e)


schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    extensions=[SessionCleanupExtension],
)


async def get_context(
    request: Request,
) -> GraphQLContext:
    """Create GraphQL context with writer/reader database sessions.

    Sessions are created directly from the factory (not via FastAPI Depends
    generators) so they stay open for the lifetime of the GraphQL request.
    Cleanup is handled by SessionCleanupExtension.on_execute.
    """
    db = create_writer_session()
    db_read = create_reader_session()

    # Extract and validate JWT from Authorization header
    auth_header = request.headers.get("Authorization")
    user_id = None

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
        auth_service = AuthService(db_read)
        user_id = await auth_service.verify_access_token(token)

    return GraphQLContext(db=db, db_read=db_read, user_id=user_id)


graphql_app = GraphQLRouter(
    schema,
    context_getter=get_context,
)
