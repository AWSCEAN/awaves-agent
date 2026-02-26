"""Request tracing middleware."""

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import trace_id_var


class TraceIdMiddleware(BaseHTTPMiddleware):
    """Generate or extract a trace ID for every request.

    Priority:
    1. X-Amzn-Trace-Id header (from ALB / API Gateway / X-Ray)
    2. X-Request-Id header (from reverse proxy)
    3. Generated uuid4

    The trace ID is stored in:
    - request.state.trace_id  (for exception handlers)
    - trace_id_var ContextVar  (for logging filter)
    - Response header X-Trace-Id  (for client correlation)
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        trace_id = (
            request.headers.get("X-Amzn-Trace-Id")
            or request.headers.get("X-Request-Id")
            or str(uuid.uuid4())
        )

        request.state.trace_id = trace_id
        token = trace_id_var.set(trace_id)

        try:
            response: Response = await call_next(request)
            response.headers["X-Trace-Id"] = trace_id
            return response
        finally:
            trace_id_var.reset(token)
