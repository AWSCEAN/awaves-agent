"""Authentication service."""

from datetime import datetime, timedelta
from typing import Optional
import uuid

import bcrypt
import jwt

from app.config import settings
from app.schemas.user import TokenResponse, UserResponse


def _create_test_users() -> dict[str, dict]:
    """Create pre-seeded test users."""
    # Pre-hashed passwords (all passwords are "password123")
    password_hash = bcrypt.hashpw("password123".encode(), bcrypt.gensalt()).decode()

    return {
        "user-1": {
            "id": "user-1",
            "email": "test@example.com",
            "nickname": "TestSurfer",
            "password_hash": password_hash,
            "preferred_language": "en",
            "profile_image_url": None,
            "created_at": datetime.utcnow(),
        },
        "user-2": {
            "id": "user-2",
            "email": "demo@awaves.com",
            "nickname": "DemoUser",
            "password_hash": password_hash,
            "preferred_language": "en",
            "profile_image_url": None,
            "created_at": datetime.utcnow(),
        },
        "user-3": {
            "id": "user-3",
            "email": "surfer@korea.com",
            "nickname": "KoreanSurfer",
            "password_hash": password_hash,
            "preferred_language": "ko",
            "profile_image_url": None,
            "created_at": datetime.utcnow(),
        },
    }


class AuthService:
    """Authentication service handling registration, login, and tokens."""

    # Mock user storage with test users
    _users: dict[str, dict] = _create_test_users()

    def _hash_password(self, password: str) -> str:
        """Hash a password using bcrypt."""
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def _verify_password(self, password: str, hashed: str) -> bool:
        """Verify a password against its hash."""
        return bcrypt.checkpw(password.encode(), hashed.encode())

    def _create_access_token(self, user_id: str) -> tuple[str, int]:
        """Create a JWT access token."""
        expires_in = settings.jwt_access_token_expire_minutes * 60
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)

        payload = {
            "sub": user_id,
            "exp": expire,
            "type": "access",
        }

        token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        return token, expires_in

    def _create_refresh_token(self, user_id: str) -> str:
        """Create a JWT refresh token."""
        expire = datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)

        payload = {
            "sub": user_id,
            "exp": expire,
            "type": "refresh",
        }

        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

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

    async def register(
        self,
        email: str,
        password: str,
        nickname: str,
        preferred_language: str = "en",
    ) -> UserResponse:
        """Register a new user."""
        # Check if user exists
        for user in self._users.values():
            if user["email"] == email:
                raise ValueError("User with this email already exists")

        # Create user
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": email,
            "nickname": nickname,
            "password_hash": self._hash_password(password),
            "preferred_language": preferred_language,
            "profile_image_url": None,
            "created_at": datetime.utcnow(),
        }

        self._users[user_id] = user

        return UserResponse(
            id=user_id,
            email=email,
            nickname=nickname,
            preferred_language=preferred_language,
            profile_image_url=None,
            created_at=user["created_at"],
        )

    async def login(self, email: str, password: str) -> Optional[TokenResponse]:
        """Login and return tokens."""
        # Find user
        user = None
        for u in self._users.values():
            if u["email"] == email:
                user = u
                break

        if not user:
            return None

        # Verify password
        if not self._verify_password(password, user["password_hash"]):
            return None

        # Create tokens
        access_token, expires_in = self._create_access_token(user["id"])
        refresh_token = self._create_refresh_token(user["id"])

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
        )

    async def get_current_user(self, token: str) -> Optional[UserResponse]:
        """Get user from access token."""
        payload = self._decode_token(token)
        if not payload or payload.get("type") != "access":
            return None

        user_id = payload.get("sub")
        if not user_id or user_id not in self._users:
            return None

        user = self._users[user_id]
        return UserResponse(
            id=user["id"],
            email=user["email"],
            nickname=user["nickname"],
            preferred_language=user["preferred_language"],
            profile_image_url=user["profile_image_url"],
            created_at=user["created_at"],
        )

    async def refresh_token(self, refresh_token: str) -> Optional[TokenResponse]:
        """Refresh access token using refresh token."""
        payload = self._decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            return None

        user_id = payload.get("sub")
        if not user_id or user_id not in self._users:
            return None

        # Create new tokens
        access_token, expires_in = self._create_access_token(user_id)
        new_refresh_token = self._create_refresh_token(user_id)

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=expires_in,
        )
