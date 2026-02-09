"""GraphQL type definitions."""

from .common import ErrorDetail, MutationResponse
from .user import User, UserLevel
from .auth import AuthTokens, LoginResult, AuthResponse, LoginInput, RegisterInput, RefreshTokenInput
from .saved import (
    SavedItem, SavedListResult, SavedItemResponse, FeedbackStatus,
    SaveItemInput, DeleteSavedItemInput, AcknowledgeChangeInput,
)
from .feedback import FeedbackResult, FeedbackResponse, FeedbackInput

__all__ = [
    "ErrorDetail",
    "MutationResponse",
    "User",
    "UserLevel",
    "AuthTokens",
    "LoginResult",
    "AuthResponse",
    "LoginInput",
    "RegisterInput",
    "RefreshTokenInput",
    "SavedItem",
    "SavedListResult",
    "SavedItemResponse",
    "FeedbackStatus",
    "SaveItemInput",
    "DeleteSavedItemInput",
    "AcknowledgeChangeInput",
    "FeedbackResult",
    "FeedbackResponse",
    "FeedbackInput",
]
