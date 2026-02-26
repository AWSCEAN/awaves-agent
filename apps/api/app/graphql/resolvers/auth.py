"""Auth resolvers for GraphQL."""

import strawberry
from strawberry.types import Info

from app.graphql.context import GraphQLContext
from app.graphql.types.auth import AuthResponse, AuthTokens, LoginResult, LoginInput, RegisterInput, RefreshTokenInput
from app.graphql.types.user import User
from app.services.auth import AuthService
from app.services.user_service import UserService


async def login(
    info: Info[GraphQLContext, None],
    input: LoginInput,
) -> AuthResponse:
    """Login mutation resolver."""
    auth_service = AuthService(info.context.db)
    result = await auth_service.login(input.username, input.password)

    if not result:
        return AuthResponse(success=False, error="Invalid credentials")

    token_pair, user = result
    return AuthResponse(
        success=True,
        data=LoginResult(
            tokens=AuthTokens(
                access_token=token_pair.access_token,
                refresh_token=token_pair.refresh_token,
                expires_in=token_pair.expires_in,
            ),
            user=User.from_model(user),
        ),
    )


async def logout(info: Info[GraphQLContext, None]) -> bool:
    """Logout mutation resolver."""
    if not info.context.is_authenticated:
        return False

    # Note: Actual token invalidation happens via REST currently
    # This is a placeholder for GraphQL logout
    return True


async def refresh_token(
    info: Info[GraphQLContext, None],
    input: RefreshTokenInput,
) -> AuthResponse:
    """Refresh token mutation resolver."""
    auth_service = AuthService(info.context.db)
    result = await auth_service.refresh_tokens(input.refresh_token)

    if not result:
        return AuthResponse(success=False, error="Invalid or expired refresh token")

    token_pair = result
    return AuthResponse(
        success=True,
        data=LoginResult(
            tokens=AuthTokens(
                access_token=token_pair.access_token,
                refresh_token=token_pair.refresh_token,
                expires_in=token_pair.expires_in,
            ),
            user=None,  # type: ignore
        ),
    )


async def register(
    info: Info[GraphQLContext, None],
    input: RegisterInput,
) -> AuthResponse:
    """Register mutation resolver."""
    user_service = UserService(info.context.db)
    result = await user_service.register(
        username=input.username,
        password=input.password,
        confirm_password=input.confirm_password,
        user_level=input.user_level,
        privacy_consent_yn=input.privacy_consent_yn,
    )

    if not result.success:
        return AuthResponse(success=False, error=result.error)

    # Login after registration
    auth_service = AuthService(info.context.db)
    login_result = await auth_service.login(input.username, input.password)

    if not login_result:
        return AuthResponse(success=False, error="Registration successful but login failed")

    token_pair, user = login_result
    return AuthResponse(
        success=True,
        data=LoginResult(
            tokens=AuthTokens(
                access_token=token_pair.access_token,
                refresh_token=token_pair.refresh_token,
                expires_in=token_pair.expires_in,
            ),
            user=User.from_model(user),
        ),
    )


async def get_current_user(info: Info[GraphQLContext, None]) -> User:
    """Get current user query resolver."""
    if not info.context.is_authenticated:
        raise Exception("Not authenticated")

    from app.repositories.user_repository import UserRepository

    user_repo = UserRepository(info.context.db_read)
    user = await user_repo.get_by_id(info.context.user_id)

    if not user:
        raise Exception("User not found")

    return User.from_model(user)
