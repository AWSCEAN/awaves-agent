"""User-related Pydantic schemas."""

from datetime import datetime
from typing import Any, Generic, Literal, Optional, TypeVar

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    nickname: str = Field(..., min_length=2, max_length=50)


class RegisterRequest(UserBase):
    """User registration request."""

    password: str = Field(..., min_length=8, max_length=100)
    preferred_language: Literal["ko", "en"] = "en"


class LoginRequest(BaseModel):
    """Login request (username-based)."""

    username: str = Field(..., min_length=2, max_length=50)
    password: str


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""

    refresh_token: str


class UserResponse(UserBase):
    """User response schema."""

    id: str
    preferred_language: Literal["ko", "en"]
    profile_image_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int  # seconds


# ============================================
# V2 Registration Schemas (Username-based)
# ============================================

class ErrorDetail(BaseModel):
    """Error detail schema."""

    code: Optional[str] = None
    message: Optional[str] = None


T = TypeVar("T")


class CommonResponse(BaseModel, Generic[T]):
    """Common API response model."""

    result: str  # "success" or "error"
    error: Optional[ErrorDetail] = None
    data: Optional[T] = None


class RegisterV2Request(BaseModel):
    """V2 User registration request with username."""

    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=1)  # No password policy
    confirm_password: str = Field(..., min_length=1)
    user_level: Literal["beginner", "intermediate", "advanced"]
    privacy_consent_yn: bool


class UserV2Response(BaseModel):
    """V2 User response schema."""

    user_id: int
    username: str
    user_level: str
    privacy_consent_yn: bool
    last_login_dt: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LoginV2Response(BaseModel):
    """V2 Login response with tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserV2Response
