"""Authentication router."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.user import (
    CommonResponse,
    ErrorDetail,
    LoginRequest,
    LoginV2Response,
    RefreshTokenRequest,
    TokenResponse,
    UserV2Response,
)
from app.services.auth import AuthService

router = APIRouter()
security = HTTPBearer()


def get_auth_service(session: AsyncSession = Depends(get_db)) -> AuthService:
    """Dependency to get auth service."""
    return AuthService(session)


@router.post("/login", response_model=CommonResponse[LoginV2Response])
async def login(
    request: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> CommonResponse[LoginV2Response]:
    """Login with username and password."""
    result = await auth_service.login(
        username=request.username,
        password=request.password,
    )

    if not result:
        return CommonResponse(
            result="error",
            error=ErrorDetail(
                code="INVALID_CREDENTIALS",
                message="Invalid username or password",
            ),
        )

    token_pair, user = result

    return CommonResponse(
        result="success",
        data=LoginV2Response(
            access_token=token_pair.access_token,
            refresh_token=token_pair.refresh_token,
            expires_in=token_pair.expires_in,
            user=UserV2Response(
                user_id=user.user_id,
                username=user.username,
                user_level=user.user_level,
                privacy_consent_yn=user.privacy_consent_yn,
                last_login_dt=user.last_login_dt,
                created_at=user.created_at,
            ),
        ),
    )


@router.post("/refresh", response_model=CommonResponse[TokenResponse])
async def refresh_token(
    request: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> CommonResponse[TokenResponse]:
    """Refresh access token using refresh token."""
    token_pair = await auth_service.refresh_tokens(request.refresh_token)

    if not token_pair:
        return CommonResponse(
            result="error",
            error=ErrorDetail(
                code="INVALID_REFRESH_TOKEN",
                message="Invalid or expired refresh token",
            ),
        )

    return CommonResponse(
        result="success",
        data=TokenResponse(
            access_token=token_pair.access_token,
            refresh_token=token_pair.refresh_token,
            expires_in=token_pair.expires_in,
        ),
    )


@router.post("/logout", response_model=CommonResponse[None])
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service),
) -> CommonResponse[None]:
    """Logout and invalidate refresh token."""
    user_id = await auth_service.verify_access_token(credentials.credentials)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    await auth_service.logout(user_id)

    return CommonResponse(
        result="success",
        data=None,
    )


@router.get("/me", response_model=CommonResponse[UserV2Response])
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service),
) -> CommonResponse[UserV2Response]:
    """Get current authenticated user."""
    user = await auth_service.get_current_user(credentials.credentials)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return CommonResponse(
        result="success",
        data=UserV2Response(
            user_id=user.user_id,
            username=user.username,
            user_level=user.user_level,
            privacy_consent_yn=user.privacy_consent_yn,
            last_login_dt=user.last_login_dt,
            created_at=user.created_at,
        ),
    )
