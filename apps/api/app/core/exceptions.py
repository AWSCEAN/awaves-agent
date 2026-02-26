"""Application exception hierarchy."""

from typing import Optional


class BaseAppException(Exception):
    """Base exception for all application errors."""

    error_code: str = "INTERNAL_ERROR"
    status_code: int = 500

    def __init__(
        self,
        message: str = "An unexpected error occurred",
        *,
        detail: Optional[str] = None,
        error_code: Optional[str] = None,
        status_code: Optional[int] = None,
    ):
        self.message = message
        self.detail = detail
        if error_code is not None:
            self.error_code = error_code
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.message)


class BusinessException(BaseAppException):
    """Business logic violation (400)."""

    error_code = "BUSINESS_ERROR"
    status_code = 400


class ValidationException(BaseAppException):
    """Input validation failure (422)."""

    error_code = "VALIDATION_ERROR"
    status_code = 422


class NotFoundException(BaseAppException):
    """Resource not found (404)."""

    error_code = "NOT_FOUND"
    status_code = 404


class UnauthorizedException(BaseAppException):
    """Authentication required or failed (401)."""

    error_code = "UNAUTHORIZED"
    status_code = 401


class ForbiddenException(BaseAppException):
    """Insufficient permissions (403)."""

    error_code = "FORBIDDEN"
    status_code = 403


class ConflictException(BaseAppException):
    """Resource conflict, e.g. duplicate (409)."""

    error_code = "CONFLICT"
    status_code = 409


class ExternalServiceException(BaseAppException):
    """Upstream service failure (502)."""

    error_code = "EXTERNAL_SERVICE_ERROR"
    status_code = 502


class DatabaseException(BaseAppException):
    """Database operation failure (500)."""

    error_code = "DATABASE_ERROR"
    status_code = 500


class CacheException(BaseAppException):
    """Cache operation failure (500). Non-fatal, usually degraded mode."""

    error_code = "CACHE_ERROR"
    status_code = 500
