"""CloudWatch Custom Metrics middleware.

Collects HTTP latency and error counts per request, then publishes
them asynchronously to CloudWatch Metrics under the AWaves/Application
namespace. Cache and ML inference metrics are exposed as module-level
helpers for use in service layers.
"""

import asyncio
import logging
import time
from typing import Optional

import boto3
from botocore.exceptions import ClientError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config import settings

logger = logging.getLogger(__name__)

NAMESPACE = "AWaves/Application"

# Singleton CloudWatch client (created lazily)
_cw_client = None


def _get_cw_client():
    """Get or create the CloudWatch Metrics client singleton."""
    global _cw_client
    if _cw_client is None:
        _cw_client = boto3.client(
            "cloudwatch",
            region_name=settings.aws_region or "ap-northeast-2",
            aws_access_key_id=settings.aws_access_key_id or None,
            aws_secret_access_key=settings.aws_secret_access_key or None,
        )
    return _cw_client


def _put_metric(name: str, value: float, unit: str, dimensions: Optional[list] = None) -> None:
    """Publish a single metric data point to CloudWatch (fire-and-forget)."""
    try:
        metric_data = {
            "MetricName": name,
            "Value": value,
            "Unit": unit,
        }
        if dimensions:
            metric_data["Dimensions"] = dimensions

        _get_cw_client().put_metric_data(
            Namespace=NAMESPACE,
            MetricData=[metric_data],
        )
    except (ClientError, Exception) as exc:
        logger.warning("Failed to publish metric %s: %s", name, exc)


def _put_metric_async(name: str, value: float, unit: str, dimensions: Optional[list] = None) -> None:
    """Run _put_metric in a thread so it doesn't block the event loop."""
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _put_metric, name, value, unit, dimensions)


# ---------------------------------------------------------------------------
# HTTP Middleware
# ---------------------------------------------------------------------------

class CloudWatchMetricsMiddleware(BaseHTTPMiddleware):
    """Collect API_Latency and API_Error_Count for every HTTP request."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response: Response = await call_next(request)
        latency_ms = (time.perf_counter() - start) * 1000

        dims = [{"Name": "Endpoint", "Value": request.url.path}]

        _put_metric_async("API_Latency", latency_ms, "Milliseconds", dims)

        if response.status_code >= 400:
            _put_metric_async("API_Error_Count", 1, "Count", dims)

        return response


# ---------------------------------------------------------------------------
# Service-level metric helpers
# ---------------------------------------------------------------------------

def emit_cache_hit(cache_name: str = "default") -> None:
    """Record a cache hit."""
    _put_metric_async(
        "Cache_Hit", 1, "Count",
        [{"Name": "CacheName", "Value": cache_name}],
    )


def emit_cache_miss(cache_name: str = "default") -> None:
    """Record a cache miss."""
    _put_metric_async(
        "Cache_Miss", 1, "Count",
        [{"Name": "CacheName", "Value": cache_name}],
    )


def emit_ml_inference_latency(latency_ms: float) -> None:
    """Record SageMaker inference latency."""
    _put_metric_async("ML_Inference_Latency", latency_ms, "Milliseconds")


def emit_external_api_failure(service: str) -> None:
    """Record an external API call failure."""
    _put_metric_async(
        "External_API_Failure", 1, "Count",
        [{"Name": "Service", "Value": service}],
    )
