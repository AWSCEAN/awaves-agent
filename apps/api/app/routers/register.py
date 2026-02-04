"""User registration router."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.user_repository import UserRepository
from app.schemas.user import (
    CommonResponse,
    RegisterV2Request,
    UserV2Response,
)
from app.services.user_service import UserService

router = APIRouter()


def get_user_repository(session: AsyncSession = Depends(get_db)) -> UserRepository:
    """Dependency to get user repository."""
    return UserRepository(session)


def get_user_service(
    user_repository: UserRepository = Depends(get_user_repository),
) -> UserService:
    """Dependency to get user service."""
    return UserService(user_repository)


@router.post("/register", response_model=CommonResponse[UserV2Response])
async def register_user(
    request: RegisterV2Request,
    user_service: UserService = Depends(get_user_service),
) -> CommonResponse[UserV2Response]:
    """
    Register a new user with username-based authentication.

    This endpoint handles the registration flow:
    - Username (not email) based registration
    - User level selection (beginner/intermediate/advanced)
    - Privacy consent tracking
    - Data is persisted to PostgreSQL database
    """
    result = await user_service.register(
        username=request.username,
        password=request.password,
        confirm_password=request.confirm_password,
        user_level=request.user_level,
        privacy_consent_yn=request.privacy_consent_yn,
    )

    if result.success:
        return CommonResponse(
            result="success",
            error=None,
            data=result.user,
        )
    else:
        return CommonResponse(
            result="error",
            error=result.error,
            data=None,
        )
