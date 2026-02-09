"""Auth GraphQL types."""

import strawberry
from typing import Optional
from .user import User


@strawberry.type
class AuthTokens:
    """Authentication tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


@strawberry.type
class LoginResult:
    """Login result containing tokens and user."""

    tokens: AuthTokens
    user: User


@strawberry.type
class AuthResponse:
    """Authentication response wrapper."""

    success: bool
    data: Optional[LoginResult] = None
    error: Optional[str] = None


@strawberry.input
class LoginInput:
    """Login input."""

    username: str
    password: str


@strawberry.input
class RegisterInput:
    """Registration input."""

    username: str
    password: str
    confirm_password: str
    user_level: str
    privacy_consent_yn: bool


@strawberry.input
class RefreshTokenInput:
    """Refresh token input."""

    refresh_token: str
