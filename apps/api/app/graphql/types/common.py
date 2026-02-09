"""Common GraphQL types."""

import strawberry
from typing import Optional, Generic, TypeVar

T = TypeVar("T")


@strawberry.type
class ErrorDetail:
    """Error detail for API responses."""

    code: str
    message: str


@strawberry.type
class MutationResponse(Generic[T]):
    """Generic mutation response wrapper."""

    success: bool
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None
