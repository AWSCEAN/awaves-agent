"""Service for retrieving surf_info from DynamoDB by locationId."""

import logging
from typing import Optional

import aioboto3
from botocore.config import Config

from app.config import settings

logger = logging.getLogger(__name__)


class SurfInfoService:
    """Service for DynamoDB surf_info lookups by locationId."""

    _session: Optional[aioboto3.Session] = None
    TABLE_NAME = settings.dynamodb_surf_data_table

    @classmethod
    def _get_session(cls) -> aioboto3.Session:
        if cls._session is None:
            cls._session = aioboto3.Session(
                aws_access_key_id=settings.aws_access_key_id or "dummy",
                aws_secret_access_key=settings.aws_secret_access_key or "dummy",
                region_name=settings.aws_region,
            )
        return cls._session

    @classmethod
    async def _get_client(cls):
        session = cls._get_session()
        config = Config(
            retries={"max_attempts": 3, "mode": "adaptive"},
            connect_timeout=5,
            read_timeout=10,
        )
        endpoint_url = settings.ddb_endpoint_url if settings.ddb_endpoint_url else None
        return session.client("dynamodb", endpoint_url=endpoint_url, config=config)

    @classmethod
    async def get_surf_info_by_location_id(
        cls,
        location_id: str,
        date: Optional[str] = None,
        time: Optional[str] = None,
    ) -> Optional[dict]:
        """Query DynamoDB for surf_info for a given locationId.

        Args:
            location_id: The location ID (e.g. "38.0765#128.6234")
            date: Optional date filter (yyyy-MM-dd). Filters SurfTimestamp prefix.
            time: Optional time filter (HH:mm). Further narrows the timestamp.

        Returns the best matching record as a transformed dict,
        or None if no records found.
        """
        try:
            async with await cls._get_client() as client:
                key_expr = "LocationId = :lid"
                expr_values: dict = {":lid": {"S": location_id}}

                if date and time:
                    # Filter by date + time prefix (e.g. "2026-02-11T06:00")
                    key_expr += " AND begins_with(SurfTimestamp, :ts)"
                    expr_values[":ts"] = {"S": f"{date}T{time}"}
                elif date:
                    # Filter by date prefix (e.g. "2026-02-11")
                    key_expr += " AND begins_with(SurfTimestamp, :d)"
                    expr_values[":d"] = {"S": date}

                response = await client.query(
                    TableName=cls.TABLE_NAME,
                    KeyConditionExpression=key_expr,
                    ExpressionAttributeValues=expr_values,
                    ScanIndexForward=False,
                    Limit=1,
                )

                items = response.get("Items", [])
                if not items:
                    if date or time:
                        # No data for the requested conditions – return None
                        # instead of falling back to a different date/time
                        logger.info(
                            "No surf_info for %s with date=%s time=%s",
                            location_id, date, time,
                        )
                    return None

                return cls._to_surf_info(items[0])
        except Exception as e:
            logger.error("Failed to get surf_info for %s: %s", location_id, e)
            return None

    @classmethod
    def _to_surf_info(cls, item: dict) -> dict:
        """Convert DynamoDB item to SurfInfo dict."""
        loc_id = item["LocationId"]["S"]
        parts = loc_id.split("#")
        lat = float(parts[0]) if len(parts) >= 2 else 0.0
        lng = float(parts[1]) if len(parts) >= 2 else 0.0

        geo = item.get("geo", {}).get("M", {})
        conditions = item.get("conditions", {}).get("M", {})
        derived = item.get("derivedMetrics", {}).get("M", {})
        metadata = item.get("metadata", {}).get("M", {})
        location = item.get("location", {}).get("M", {})

        return {
            "LocationId": loc_id,
            "SurfTimestamp": item["SurfTimestamp"]["S"],
            "geo": {
                "lat": float(geo.get("lat", {}).get("N", str(lat))),
                "lng": float(geo.get("lng", {}).get("N", str(lng))),
            },
            "conditions": {
                "waveHeight": float(conditions.get("waveHeight", {}).get("N", "0")),
                "wavePeriod": float(conditions.get("wavePeriod", {}).get("N", "0")),
                "windSpeed": float(conditions.get("windSpeed", {}).get("N", "0")),
                "waterTemperature": float(
                    conditions.get("waterTemperature", {}).get("N", "0")
                ),
            },
            "derivedMetrics": {
                "surfScore": float(derived.get("surfScore", {}).get("N", "0")),
                "surfGrade": derived.get("surfGrade", {}).get("S", "D"),
                "surfingLevel": derived.get("surfingLevel", {}).get("S", ""),
            },
            "metadata": {
                "modelVersion": metadata.get("modelVersion", {}).get(
                    "S", "sagemaker-awaves-v1.2"
                ),
                "dataSource": metadata.get("dataSource", {}).get("S", "open-meteo"),
                "predictionType": metadata.get("predictionType", {}).get(
                    "S", "FORECAST"
                ),
                "createdAt": metadata.get("createdAt", {}).get("S", ""),
            },
            "name": location.get("displayName", {}).get("S", f"{lat}, {lng}"),
            "region": location.get("state", {}).get("S", ""),
            "country": location.get("country", {}).get("S", ""),
            "address": location.get("displayName", {}).get("S", ""),
            "waveType": "Beach Break",
            "bestSeason": [],
        }
