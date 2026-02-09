"""DynamoDB service for surf_info table operations."""

import logging
import math
from typing import Optional

import aioboto3
from botocore.config import Config

from app.config import settings

logger = logging.getLogger(__name__)


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two coordinates in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class SurfDynamoDBService:
    """Service for DynamoDB operations on surf_info table."""

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
    async def get_client(cls):
        session = cls._get_session()
        config = Config(
            retries={"max_attempts": 3, "mode": "adaptive"},
            connect_timeout=5,
            read_timeout=10,
        )
        endpoint_url = settings.ddb_endpoint_url if settings.ddb_endpoint_url else None
        return session.client("dynamodb", endpoint_url=endpoint_url, config=config)

    @classmethod
    async def get_all_spots(
        cls, page: int = 1, page_size: int = 20
    ) -> tuple[list[dict], int]:
        """Get all unique locations with their latest forecast data."""
        try:
            async with await cls.get_client() as client:
                # Scan all items
                all_items: list[dict] = []
                params: dict = {"TableName": cls.TABLE_NAME}
                while True:
                    response = await client.scan(**params)
                    all_items.extend(response.get("Items", []))
                    if "LastEvaluatedKey" not in response:
                        break
                    params["ExclusiveStartKey"] = response["LastEvaluatedKey"]

                # Group by LocationId, pick latest SurfTimestamp per location
                location_map: dict[str, dict] = {}
                for item in all_items:
                    loc_id = item["LocationId"]["S"]
                    ts = item["SurfTimestamp"]["S"]
                    if loc_id not in location_map or ts > location_map[loc_id]["SurfTimestamp"]["S"]:
                        location_map[loc_id] = item

                spots = [cls._to_surf_info(item) for item in location_map.values()]
                spots.sort(
                    key=lambda s: s["derivedMetrics"]["surfScore"], reverse=True
                )

                total = len(spots)
                start = (page - 1) * page_size
                end = start + page_size
                return spots[start:end], total
        except Exception as e:
            logger.error(f"Failed to get all spots: {e}")
            return [], 0

    @classmethod
    async def get_spot_data(
        cls, location_id: str, date: Optional[str] = None
    ) -> list[dict]:
        """Get forecast data for a specific location."""
        try:
            async with await cls.get_client() as client:
                key_expr = "LocationId = :lid"
                expr_values: dict = {":lid": {"S": location_id}}

                if date:
                    key_expr += " AND begins_with(SurfTimestamp, :d)"
                    expr_values[":d"] = {"S": date}

                response = await client.query(
                    TableName=cls.TABLE_NAME,
                    KeyConditionExpression=key_expr,
                    ExpressionAttributeValues=expr_values,
                )
                return [cls._to_surf_info(item) for item in response.get("Items", [])]
        except Exception as e:
            logger.error(f"Failed to get spot data: {e}")
            return []

    @classmethod
    async def search_spots(cls, query: str) -> list[dict]:
        """Search spots by coordinate substring in LocationId."""
        try:
            async with await cls.get_client() as client:
                all_items: list[dict] = []
                params: dict = {"TableName": cls.TABLE_NAME}
                while True:
                    response = await client.scan(**params)
                    all_items.extend(response.get("Items", []))
                    if "LastEvaluatedKey" not in response:
                        break
                    params["ExclusiveStartKey"] = response["LastEvaluatedKey"]

                # Filter by query match in LocationId
                query_lower = query.lower()
                location_map: dict[str, dict] = {}
                for item in all_items:
                    loc_id = item["LocationId"]["S"]
                    if query_lower not in loc_id.lower():
                        continue
                    ts = item["SurfTimestamp"]["S"]
                    if loc_id not in location_map or ts > location_map[loc_id]["SurfTimestamp"]["S"]:
                        location_map[loc_id] = item

                return [cls._to_surf_info(item) for item in location_map.values()]
        except Exception as e:
            logger.error(f"Failed to search spots: {e}")
            return []

    @classmethod
    async def get_nearby_spots(
        cls, lat: float, lng: float, limit: int = 25
    ) -> list[dict]:
        """Get spots sorted by distance from given coordinates."""
        try:
            async with await cls.get_client() as client:
                all_items: list[dict] = []
                params: dict = {"TableName": cls.TABLE_NAME}
                while True:
                    response = await client.scan(**params)
                    all_items.extend(response.get("Items", []))
                    if "LastEvaluatedKey" not in response:
                        break
                    params["ExclusiveStartKey"] = response["LastEvaluatedKey"]

                # Group by LocationId, pick latest
                location_map: dict[str, dict] = {}
                for item in all_items:
                    loc_id = item["LocationId"]["S"]
                    ts = item["SurfTimestamp"]["S"]
                    if loc_id not in location_map or ts > location_map[loc_id]["SurfTimestamp"]["S"]:
                        location_map[loc_id] = item

                # Calculate distances and sort
                spots_with_distance = []
                for item in location_map.values():
                    spot = cls._to_surf_info(item)
                    spot_lat = spot["geo"]["lat"]
                    spot_lng = spot["geo"]["lng"]
                    spot["distance"] = round(
                        _haversine(lat, lng, spot_lat, spot_lng), 2
                    )
                    spots_with_distance.append(spot)

                spots_with_distance.sort(key=lambda s: s["distance"])
                return spots_with_distance[:limit]
        except Exception as e:
            logger.error(f"Failed to get nearby spots: {e}")
            return []

    @classmethod
    def _to_surf_info(cls, item: dict) -> dict:
        """Convert DynamoDB item to SurfInfo dict matching FE type."""
        loc_id = item["LocationId"]["S"]
        parts = loc_id.split("#")
        lat = float(parts[0]) if len(parts) >= 2 else 0.0
        lng = float(parts[1]) if len(parts) >= 2 else 0.0

        geo = item.get("geo", {}).get("M", {})
        conditions = item.get("conditions", {}).get("M", {})
        derived = item.get("derivedMetrics", {}).get("M", {})
        metadata = item.get("metadata", {}).get("M", {})

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
                "surfingLevel": derived.get("surfingLevel", {}).get("S", "BEGINNER"),
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
            "name": f"{lat}, {lng}",
            "region": "",
            "country": "",
            "difficulty": "intermediate",
            "waveType": "Beach Break",
            "bestSeason": [],
        }
