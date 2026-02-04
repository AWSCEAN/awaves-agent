"""Authentication service with JWT and session cache."""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.cache import CacheService


@dataclass
class TokenPair:
    """Access and refresh token pair."""
    access_token: str
    refresh_token: str
    expires_in: int  # seconds


class AuthService:
    """Authentication service with JWT and Redis session cache."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)

    def _hash_password(self, password: str) -> str:
        """Hash a password using bcrypt."""
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def _verify_password(self, password: str, hashed: str) -> bool:
        """Verify a password against its hash."""
        return bcrypt.checkpw(password.encode(), hashed.encode())

    def _create_access_token(self, user_id: int) -> tuple[str, int]:
        """Create a JWT access token."""
        expires_in = settings.jwt_access_token_expire_minutes * 60
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)

        payload = {
            "sub": str(user_id),
            "exp": expire,
            "type": "access",
        }

        token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        return token, expires_in

    def _create_refresh_token(self, user_id: int) -> tuple[str, datetime]:
        """Create a JWT refresh token and return with expiration datetime."""
        expires_at = datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)

        payload = {
            "sub": str(user_id),
            "exp": expires_at,
            "type": "refresh",
        }

        token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        return token, expires_at

    def _decode_token(self, token: str) -> Optional[dict]:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(
                token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    async def login(self, username: str, password: str) -> Optional[tuple[TokenPair, User]]:
        """
        Login with username and password.
        Returns token pair and user on success, None on failure.
        """
        # Find user by username
        user = await self.user_repo.get_by_username(username)
        if not user:
            return None

        # Verify password
        if not self._verify_password(password, user.password_hash):
            return None

        # Create tokens
        access_token, expires_in = self._create_access_token(user.user_id)
        refresh_token, refresh_expires_at = self._create_refresh_token(user.user_id)

        # Store refresh token in cache
        await CacheService.store_refresh_token(
            user_id=user.user_id,
            token=refresh_token,
            expires_at=refresh_expires_at,
        )

        # Update last login
        await self.user_repo.update_last_login(user.user_id)
        await self.session.commit()

        token_pair = TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
        )

        return token_pair, user

    async def refresh_tokens(self, refresh_token: str) -> Optional[TokenPair]:
        """
        Refresh tokens using a valid refresh token.
        Implements token rotation (old token invalidated).
        """
        # Decode the refresh token
        payload = self._decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            return None

        user_id = int(payload.get("sub"))

        # Validate against cache
        is_valid = await CacheService.validate_refresh_token(user_id, refresh_token)
        if not is_valid:
            return None

        # Verify user still exists
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            return None

        # Invalidate old refresh token
        await CacheService.invalidate_refresh_token(user_id)

        # Create new tokens
        access_token, expires_in = self._create_access_token(user_id)
        new_refresh_token, refresh_expires_at = self._create_refresh_token(user_id)

        # Store new refresh token in cache
        await CacheService.store_refresh_token(
            user_id=user_id,
            token=new_refresh_token,
            expires_at=refresh_expires_at,
        )

        return TokenPair(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=expires_in,
        )

    async def logout(self, user_id: int) -> None:
        """Logout user by invalidating refresh token."""
        await CacheService.invalidate_refresh_token(user_id)

    async def get_current_user(self, token: str) -> Optional[User]:
        """Get user from access token."""
        payload = self._decode_token(token)
        if not payload or payload.get("type") != "access":
            return None

        user_id = int(payload.get("sub"))
        return await self.user_repo.get_by_id(user_id)

    async def verify_access_token(self, token: str) -> Optional[int]:
        """Verify access token and return user_id."""
        payload = self._decode_token(token)
        if not payload or payload.get("type") != "access":
            return None
        return int(payload.get("sub"))
