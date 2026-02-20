"""User registration service."""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import bcrypt

from app.repositories.user_repository import UserRepository
from app.schemas.user import ErrorDetail, UserV2Response

logger = logging.getLogger(__name__)


@dataclass
class RegistrationResult:
    """Result of user registration attempt."""

    success: bool
    user: Optional[UserV2Response] = None
    error: Optional[ErrorDetail] = None


class UserService:
    """Service for user registration and management."""

    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    def _hash_password(self, password: str) -> str:
        """Hash a password using bcrypt."""
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    async def register(
        self,
        username: str,
        password: str,
        confirm_password: str,
        user_level: str,
        privacy_consent_yn: bool,
    ) -> RegistrationResult:
        """
        Register a new user.

        Args:
            username: The username for the new account
            password: The password
            confirm_password: Password confirmation
            user_level: Surfing proficiency level
            privacy_consent_yn: Privacy policy consent flag

        Returns:
            RegistrationResult with success status and user data or error
        """
        # Verify password and confirm_password match
        if password != confirm_password:
            logger.warning("Registration failed: password mismatch (username=%s)", username)
            return RegistrationResult(
                success=False,
                error=ErrorDetail(
                    code="PASSWORD_MISMATCH",
                    message="Password and confirm password do not match"
                )
            )

        # Check if privacy consent is given
        if not privacy_consent_yn:
            logger.warning("Registration failed: consent required (username=%s)", username)
            return RegistrationResult(
                success=False,
                error=ErrorDetail(
                    code="CONSENT_REQUIRED",
                    message="Privacy consent is required to register"
                )
            )

        # Check if username already exists
        if await self.user_repository.exists_by_username(username):
            logger.warning("Registration failed: username exists (username=%s)", username)
            return RegistrationResult(
                success=False,
                error=ErrorDetail(
                    code="USERNAME_EXISTS",
                    message="Username already exists"
                )
            )

        # Create new user
        password_hash = self._hash_password(password)
        user = await self.user_repository.create(
            username=username,
            password_hash=password_hash,
            user_level=user_level,
            privacy_consent_yn=privacy_consent_yn,
        )

        # Return success response
        user_response = UserV2Response(
            user_id=user.user_id,
            username=user.username,
            user_level=user.user_level,
            privacy_consent_yn=user.privacy_consent_yn,
            last_login_dt=user.last_login_dt,
            created_at=user.created_at,
        )

        logger.info("User registered successfully (user_id=%d, username=%s)", user.user_id, username)
        return RegistrationResult(success=True, user=user_response)

    async def update_user_level(
        self,
        user_id: int,
        user_level: str,
    ) -> Optional[UserV2Response]:
        """
        Update user's surfing level.

        Args:
            user_id: The user's ID
            user_level: New surfing proficiency level

        Returns:
            Updated user data or None if user not found
        """
        user = await self.user_repository.update_user_level(user_id, user_level)
        if not user:
            return None

        return UserV2Response(
            user_id=user.user_id,
            username=user.username,
            user_level=user.user_level,
            privacy_consent_yn=user.privacy_consent_yn,
            last_login_dt=user.last_login_dt,
            created_at=user.created_at,
        )
