"""JSON structured logging for CloudWatch Logs integration.

Outputs JSON-formatted logs to stdout so Fluent Bit can forward them
to CloudWatch Logs without additional parsing.

CloudWatch Logs Insights verification query:
  fields @timestamp, message | filter level="ERROR" | sort @timestamp desc
"""

import json
import logging
import sys
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Optional

# Context variable for request trace ID — shared with TraceIdMiddleware
trace_id_var: ContextVar[Optional[str]] = ContextVar("trace_id", default=None)


class TraceIdLogFilter(logging.Filter):
    """Inject trace_id from ContextVar into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = trace_id_var.get()  # type: ignore[attr-defined]
        return True


class JsonFormatter(logging.Formatter):
    """Format log records as single-line JSON for CloudWatch Logs."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }

        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)

        request_id = getattr(record, "request_id", None)
        if request_id:
            log_entry["request_id"] = request_id

        error_code = getattr(record, "error_code", None)
        if error_code:
            log_entry["error_code"] = error_code

        return json.dumps(log_entry, ensure_ascii=False)


def setup_json_logging(level: int = logging.INFO) -> None:
    """Replace the root logger's handlers with a JSON-formatted stdout handler."""
    root = logging.getLogger()
    root.setLevel(level)

    # Remove existing handlers
    for handler in root.handlers[:]:
        root.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    handler.addFilter(TraceIdLogFilter())
    root.addHandler(handler)

    # Suppress noisy third-party loggers
    for name in (
        "uvicorn.access",
        "botocore",
        "aiobotocore",
        "sqlalchemy.engine",
        "sqlalchemy.pool",
        "sqlalchemy.dialects",
    ):
        logging.getLogger(name).setLevel(logging.WARNING)
