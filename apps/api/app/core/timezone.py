"""Korea Standard Time (KST) utilities."""

from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))


def now_kst() -> datetime:
    """Return the current time in KST as a naive datetime (for TIMESTAMP WITHOUT TIME ZONE columns)."""
    return datetime.now(KST).replace(tzinfo=None)
