"""AWS X-Ray tracing integration.

Initialises the X-Ray recorder with patch_all() so that boto3, httpx,
and other supported libraries are automatically instrumented.  An ASGI
middleware wraps every incoming request in an X-Ray segment named
"FastAPI".

The default thread-local context is used (not AsyncContext) because
AsyncContext's ``set_task_factory`` conflicts with anyio's task
creation used internally by Starlette / FastAPI.  Patched libraries
that run outside an HTTP request (e.g. startup, background tasks)
should be wrapped with ``xray_segment()`` to provide a parent segment.

Subsegment lookups that happen outside a segment (e.g. sync boto3 in a
thread-pool executor) are silenced by lowering the SDK context logger
to CRITICAL.

In local/dev environments where no X-Ray daemon is running, tracing
is configured in no-op mode so the application still starts cleanly.
"""

import logging
from contextlib import asynccontextmanager

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config import settings
from app.core.logging import trace_id_var

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

        xray_recorder.configure(
            service="awaves-api",
            daemon_address="127.0.0.1:2000",
            context_missing="LOG_ERROR",
        )
        patch_all()
        _xray_recorder = xray_recorder

        # Silence the noisy "cannot find the current segment" messages
        # that fire when patched libraries (e.g. sync boto3 in a thread
        # executor) run outside a request segment.  Genuine tracing
        # issues are still visible via the middleware and xray_segment.
        logging.getLogger("aws_xray_sdk.core.context").setLevel(logging.CRITICAL)

        logger.info("X-Ray tracing initialised (service=awaves-api)")
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


class XRayMiddleware(BaseHTTPMiddleware):
    """Wrap each HTTP request in an X-Ray segment named 'FastAPI'."""

    async def dispatch(self, request: Request, call_next) -> Response:
        recorder = get_xray_recorder()
        if recorder is None:
            return await call_next(request)

        segment = recorder.begin_segment("FastAPI")
        try:
            segment.put_http_meta("url", str(request.url))
            segment.put_http_meta("method", request.method)

            # Annotate with app-level trace_id (set by TraceIdMiddleware,
            # which runs before this middleware) so X-Ray traces are
            # searchable by the same ID that appears in CloudWatch Logs.
            app_trace_id = trace_id_var.get()
            if app_trace_id:
                segment.put_annotation("trace_id", app_trace_id)

            response: Response = await call_next(request)
            segment.put_http_meta("status", response.status_code)
            return response
        except Exception as exc:
            segment.add_exception(exc, stack=True)
            raise
        finally:
            recorder.end_segment()
