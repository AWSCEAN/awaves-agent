"""Base DynamoDB repository with shared session and client setup."""

import logging
from contextlib import contextmanager
from typing import ClassVar, Optional

import aioboto3
from botocore.config import Config

from app.config import settings

logger = logging.getLogger(__name__)


@contextmanager
def dynamodb_subsegment(name: str = "DynamoDB_Query"):
    """Wrap a block in an X-Ray subsegment for DynamoDB calls."""
    try:
        from app.core.tracing import get_xray_recorder
        recorder = get_xray_recorder()
    except Exception:
        recorder = None

    if recorder is None:
        yield
        return

    subsegment = recorder.begin_subsegment(name)
    if subsegment is None:
        yield
        return
    try:
        yield
    except Exception as exc:
        subsegment.add_exception(exc, stack=True)
        raise
    finally:
        recorder.end_subsegment()


class BaseDynamoDBRepository:
    """Base class providing shared aioboto3 session and DynamoDB client."""

    _session: ClassVar[Optional[aioboto3.Session]] = None
    _available: ClassVar[bool] = True
    TABLE_NAME: ClassVar[str] = ""

    @classmethod
    def _get_session(cls) -> aioboto3.Session:
        """Get or create aioboto3 session."""
        if cls._session is None:
            cls._session = aioboto3.Session(
                aws_access_key_id=settings.aws_access_key_id or "dummy",
                aws_secret_access_key=settings.aws_secret_access_key or "dummy",
                region_name=settings.aws_region,
            )
        return cls._session

    @classmethod
    async def get_client(cls):
        """Get DynamoDB client as async context manager."""
        session = cls._get_session()
        config = Config(
            retries={"max_attempts": 3, "mode": "adaptive"},
            connect_timeout=5,
            read_timeout=10,
        )
        endpoint_url = settings.ddb_endpoint_url if settings.ddb_endpoint_url else None
        return session.client("dynamodb", endpoint_url=endpoint_url, config=config)

    @classmethod
    def _deserialize_item(cls, item: dict) -> dict:
        """Deserialize DynamoDB item to Python dict."""
        result = {}
        for key, value in item.items():
            if "S" in value:
                result[key] = value["S"]
            elif "N" in value:
                num_str = value["N"]
                result[key] = float(num_str) if "." in num_str else int(num_str)
            elif "BOOL" in value:
                result[key] = value["BOOL"]
            elif "NULL" in value:
                result[key] = None
            elif "L" in value:
                result[key] = [cls._deserialize_value(v) for v in value["L"]]
            elif "M" in value:
                result[key] = cls._deserialize_item(value["M"])
        return result

    @classmethod
    def _deserialize_value(cls, value: dict):
        """Deserialize a single DynamoDB value."""
        if "S" in value:
            return value["S"]
        elif "N" in value:
            num_str = value["N"]
            return float(num_str) if "." in num_str else int(num_str)
        elif "BOOL" in value:
            return value["BOOL"]
        elif "NULL" in value:
            return None
        return value
