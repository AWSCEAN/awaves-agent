"""AWS X-Ray tracing integration.

Initialises the X-Ray recorder with patch_all() so that boto3, httpx,
and other supported libraries are automatically instrumented.  An ASGI
middleware wraps every incoming request in an X-Ray segment named
"FastAPI".

In local/dev environments where no X-Ray daemon is running, tracing
is configured in no-op mode so the application still starts cleanly.
"""

import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

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

        xray_recorder.configure(
            service="awaves-api",
            daemon_address="127.0.0.1:2000",
            context_missing="LOG_ERROR",
        )
        patch_all()
        _xray_recorder = xray_recorder
        logger.info("X-Ray tracing initialised (service=awaves-API)")
    except ImportError:
        logger.warning("aws-xray-sdk not installed - X-Ray tracing disabled")
    except Exception as exc:
        logger.warning("X-Ray tracing init failed: %s", exc)


def get_xray_recorder():
    """Return the global xray_recorder (or None if unavailable)."""
    return _xray_recorder


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

            # Annotate with frontend trace ID for end-to-end correlation
            fe_trace_id = request.headers.get("X-Amzn-Trace-Id")
            if fe_trace_id:
                segment.put_annotation("frontend_trace_id", fe_trace_id)

            response: Response = await call_next(request)
            segment.put_http_meta("status", response.status_code)
            return response
        except Exception as exc:
            segment.add_exception(exc, stack=True)
            raise
        finally:
            recorder.end_segment()
