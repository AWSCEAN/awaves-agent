"""User-related Pydantic schemas."""

from datetime import datetime
from typing import Literal, Optional

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
    """Login request."""

    email: EmailStr
    password: str


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
