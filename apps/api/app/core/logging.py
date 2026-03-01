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
    """Inject trace_id and xray_trace_id from context into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.trace_id = trace_id_var.get()  # type: ignore[attr-defined]
        record.request_id = record.trace_id  # type: ignore[attr-defined]  # backward compat

        # Attempt to read the X-Ray segment trace ID (lazy import to avoid
        # circular dependency — tracing.py imports from app.config, and
        # logging is set up before tracing is initialised).
        xray_trace_id = None
        try:
            from app.core.tracing import get_xray_recorder

            recorder = get_xray_recorder()
            if recorder is not None:
                segment = recorder.current_segment()
                if segment is not None:
                    xray_trace_id = segment.trace_id
        except Exception:
            pass
        record.xray_trace_id = xray_trace_id  # type: ignore[attr-defined]
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

        trace_id = getattr(record, "trace_id", None)
        if trace_id:
            log_entry["trace_id"] = trace_id
            log_entry["request_id"] = trace_id  # backward compat

        xray_trace_id = getattr(record, "xray_trace_id", None)
        if xray_trace_id:
            log_entry["xray_trace_id"] = xray_trace_id

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
