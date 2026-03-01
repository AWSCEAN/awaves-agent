"""Global exception handlers for FastAPI."""

import logging
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.core.logging import trace_id_var
from app.core.exceptions import (
    BaseAppException,
    CacheException,
    ConflictException,
    DatabaseException,
    ExternalServiceException,
    NotFoundException,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class ErrorBody(BaseModel):
    """Error payload in the response."""

    code: str
    message: str
    detail: Optional[str] = None
    trace_id: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standard error response envelope."""

    success: bool = False
    error: ErrorBody


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_trace_id(request: Request) -> Optional[str]:
    trace_id = getattr(request.state, "trace_id", None)
    # Restore ContextVar if it was reset during middleware unwinding,
    # so the TraceIdLogFilter includes trace_id in log entries.
    if trace_id and trace_id_var.get(None) is None:
        trace_id_var.set(trace_id)
    return trace_id


def _should_expose_detail() -> bool:
    return settings.env in ("local", "dev", "development")


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------

async def _handle_app_exception(
    request: Request, exc: BaseAppException,
) -> JSONResponse:
    """Handle custom application exceptions."""
    trace_id = _get_trace_id(request)

    logger.error(
        "AppException: %s [%d] %s",
        exc.error_code,
        exc.status_code,
        exc.message,
        extra={"trace_id": trace_id, "request_id": trace_id, "error_code": exc.error_code},
        exc_info=exc if exc.status_code >= 500 else None,
    )

    body = ErrorResponse(
        error=ErrorBody(
            code=exc.error_code,
            message=exc.message,
            detail=exc.detail if _should_expose_detail() else None,
            trace_id=trace_id,
        )
    )
    return JSONResponse(status_code=exc.status_code, content=body.model_dump())


async def _handle_validation_error(
    request: Request, exc: RequestValidationError,
) -> JSONResponse:
    """Handle Pydantic / FastAPI request validation errors."""
    trace_id = _get_trace_id(request)

    errors = exc.errors()
    messages = []
    for err in errors:
        loc = " -> ".join(str(part) for part in err.get("loc", []))
        messages.append(f"{loc}: {err.get('msg', 'invalid')}")
    summary = "; ".join(messages)

    logger.warning("ValidationError: %s", summary, extra={"trace_id": trace_id, "request_id": trace_id})

    body = ErrorResponse(
        error=ErrorBody(
            code="VALIDATION_ERROR",
            message="Request validation failed",
            detail=summary if _should_expose_detail() else None,
            trace_id=trace_id,
        )
    )
    return JSONResponse(status_code=422, content=body.model_dump())


async def _handle_http_exception(
    request: Request, exc: StarletteHTTPException,
) -> JSONResponse:
    """Handle FastAPI/Starlette HTTPException (preserves existing usage)."""
    trace_id = _get_trace_id(request)

    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        429: "RATE_LIMITED",
    }
    error_code = code_map.get(exc.status_code, f"HTTP_{exc.status_code}")

    log_fn = logger.error if exc.status_code >= 500 else logger.warning
    log_fn(
        "HTTPException %d: %s",
        exc.status_code,
        exc.detail,
        extra={"trace_id": trace_id, "request_id": trace_id},
    )

    body = ErrorResponse(
        error=ErrorBody(
            code=error_code,
            message=str(exc.detail) if exc.detail else "An error occurred",
            trace_id=trace_id,
        )
    )
    return JSONResponse(status_code=exc.status_code, content=body.model_dump())


async def _handle_unhandled_exception(
    request: Request, exc: Exception,
) -> JSONResponse:
    """Catch-all for unexpected exceptions."""
    trace_id = _get_trace_id(request)

    logger.critical(
        "Unhandled exception: %s: %s",
        type(exc).__name__,
        str(exc),
        extra={"trace_id": trace_id, "request_id": trace_id},
        exc_info=True,
    )

    body = ErrorResponse(
        error=ErrorBody(
            code="INTERNAL_ERROR",
            message="An unexpected error occurred",
            detail=f"{type(exc).__name__}: {exc}" if _should_expose_detail() else None,
            trace_id=trace_id,
        )
    )
    return JSONResponse(status_code=500, content=body.model_dump())


# ---------------------------------------------------------------------------
# Layer-specific exception mappers (for gradual adoption in repos/services)
# ---------------------------------------------------------------------------

def map_sqlalchemy_exception(exc: Exception) -> BaseAppException:
    """Map SQLAlchemy exceptions to app exceptions."""
    from sqlalchemy.exc import IntegrityError, NoResultFound

    if isinstance(exc, IntegrityError):
        return ConflictException(
            message="Resource already exists or constraint violation",
            detail=str(exc.orig) if _should_expose_detail() else None,
        )
    if isinstance(exc, NoResultFound):
        return NotFoundException(message="Requested resource not found")

    return DatabaseException(
        message="A database error occurred",
        detail=str(exc) if _should_expose_detail() else None,
    )


def map_dynamodb_exception(exc: Exception) -> BaseAppException:
    """Map DynamoDB / botocore exceptions to app exceptions."""
    from botocore.exceptions import ClientError

    if isinstance(exc, ClientError):
        error_code = exc.response.get("Error", {}).get("Code", "")
        if error_code == "ConditionalCheckFailedException":
            return ConflictException(message="Resource conflict in DynamoDB")
        if error_code == "ResourceNotFoundException":
            return NotFoundException(message="DynamoDB resource not found")

    return DatabaseException(
        message="A database error occurred",
        detail=str(exc) if _should_expose_detail() else None,
    )


def map_opensearch_exception(exc: Exception) -> BaseAppException:
    """Map OpenSearch exceptions to app exceptions."""
    return ExternalServiceException(
        message="Search service is temporarily unavailable",
        detail=str(exc) if _should_expose_detail() else None,
    )


def map_redis_exception(exc: Exception) -> BaseAppException:
    """Map Redis exceptions to app exceptions."""
    return CacheException(
        message="Cache service is temporarily unavailable",
        detail=str(exc) if _should_expose_detail() else None,
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register_exception_handlers(app: FastAPI) -> None:
    """Register all global exception handlers on the FastAPI app."""
    app.add_exception_handler(BaseAppException, _handle_app_exception)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(Exception, _handle_unhandled_exception)
