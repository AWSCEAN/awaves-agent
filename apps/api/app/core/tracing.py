"""AWS X-Ray tracing integration.

Initialises the X-Ray recorder with patch_all() so that boto3, httpx,
and other supported libraries are automatically instrumented.  A pure
ASGI middleware wraps every incoming request in an X-Ray segment named
"FastAPI".

The recorder is configured with ``AsyncContext`` (backed by
``contextvars``) so that the active segment propagates correctly across
``await`` boundaries.  We use a raw ASGI middleware instead of
Starlette's ``BaseHTTPMiddleware`` because the latter runs downstream
handlers in a separate task, which breaks context propagation.

In local/dev environments where no X-Ray daemon is running, tracing
is configured in no-op mode so the application still starts cleanly.
"""

import logging
from contextlib import asynccontextmanager

from starlette.types import ASGIApp, Receive, Scope, Send

from app.config import settings

logger = logging.getLogger(__name__)

_xray_recorder = None


def init_tracing() -> None:
    """Initialise X-Ray SDK and auto-patch supported libraries.

    Skipped in local environment where no X-Ray daemon is running.
    """
    global _xray_recorder

    if settings.env == "local":
        logger.info("X-Ray tracing disabled (env=local)")
        return

    try:
        from aws_xray_sdk.core import xray_recorder, patch_all
        from aws_xray_sdk.core.async_context import AsyncContext

        xray_recorder.configure(
            service="awaves-api",
            daemon_address="127.0.0.1:2000",
            context_missing="LOG_ERROR",
            context=AsyncContext(),
        )
        patch_all()
        _xray_recorder = xray_recorder
        logger.info("X-Ray tracing initialised (service=awaves-api, context=AsyncContext)")
    except ImportError:
        logger.warning("aws-xray-sdk not installed - X-Ray tracing disabled")
    except Exception as exc:
        logger.warning("X-Ray tracing init failed: %s", exc)


def get_xray_recorder():
    """Return the global xray_recorder (or None if unavailable)."""
    return _xray_recorder


@asynccontextmanager
async def xray_segment(name: str):
    """Async context manager that wraps code in an X-Ray segment.

    Use this for background tasks or startup code that runs outside of
    an HTTP request (where XRayMiddleware would normally create the segment).
    If X-Ray is not initialised, this is a no-op.
    """
    recorder = get_xray_recorder()
    if recorder is None:
        yield
        return

    segment = recorder.begin_segment(name)
    try:
        yield segment
    except Exception as exc:
        segment.add_exception(exc, stack=True)
        raise
    finally:
        recorder.end_segment()


class XRayMiddleware:
    """Pure ASGI middleware that wraps each HTTP request in an X-Ray segment."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        recorder = get_xray_recorder()
        if recorder is None:
            await self.app(scope, receive, send)
            return

        segment = recorder.begin_segment("FastAPI")
        try:
            # Build request URL from scope
            scheme = scope.get("scheme", "http")
            host = next(
                (v.decode() for k, v in scope.get("headers", []) if k == b"host"),
                scope.get("server", ("localhost",))[0],
            )
            path = scope.get("path", "/")
            segment.put_http_meta("url", f"{scheme}://{host}{path}")
            segment.put_http_meta("method", scope.get("method", ""))

            # Annotate with frontend trace ID for end-to-end correlation
            fe_trace_id = next(
                (v.decode() for k, v in scope.get("headers", [])
                 if k == b"x-amzn-trace-id"),
                None,
            )
            if fe_trace_id:
                segment.put_annotation("frontend_trace_id", fe_trace_id)

            status_code = 500  # default in case send is never called

            original_send = send

            async def send_with_status(message):
                nonlocal status_code
                if message["type"] == "http.response.start":
                    status_code = message["status"]
                await original_send(message)

            await self.app(scope, receive, send_with_status)
            segment.put_http_meta("status", status_code)
        except Exception as exc:
            segment.add_exception(exc, stack=True)
            raise
        finally:
            recorder.end_segment()
