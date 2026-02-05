"""DynamoDB service for saved_list table operations."""

import logging
from typing import Optional

import aioboto3
from botocore.config import Config

from app.config import settings

logger = logging.getLogger(__name__)


class DynamoDBService:
    """Service for DynamoDB operations on saved_list table."""

    _session: Optional[aioboto3.Session] = None
    _available: bool = True
    TABLE_NAME = settings.dynamodb_saved_list_table

    @classmethod
    def _get_session(cls) -> aioboto3.Session:
        """Get or create aioboto3 session."""
        if cls._session is None:
            cls._session = aioboto3.Session(
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
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

        return session.client(
            "dynamodb",
            endpoint_url=endpoint_url,
            config=config,
        )

    @classmethod
    async def create_table_if_not_exists(cls) -> bool:
        """Create saved_list table if it doesn't exist."""
        try:
            async with await cls.get_client() as client:
                try:
                    await client.describe_table(TableName=cls.TABLE_NAME)
                    logger.info(f"DynamoDB table {cls.TABLE_NAME} already exists")
                    return True
                except client.exceptions.ResourceNotFoundException:
                    logger.info(f"Creating DynamoDB table {cls.TABLE_NAME}")
                    await client.create_table(
                        TableName=cls.TABLE_NAME,
                        KeySchema=[
                            {"AttributeName": "UserId", "KeyType": "HASH"},  # Partition Key
                            {"AttributeName": "SortKey", "KeyType": "RANGE"},  # Sort Key
                        ],
                        AttributeDefinitions=[
                            {"AttributeName": "UserId", "AttributeType": "S"},
                            {"AttributeName": "SortKey", "AttributeType": "S"},
                        ],
                        BillingMode="PAY_PER_REQUEST",
                    )
                    logger.info(f"DynamoDB table {cls.TABLE_NAME} created successfully")
                    return True
        except Exception as e:
            logger.error(f"Failed to create DynamoDB table: {e}")
            cls._available = False
            return False

    @classmethod
    async def save_item(
        cls,
        user_id: str,
        location_id: str,
        surf_timestamp: str,
        saved_at: str,
        surfer_level: str,
        surf_score: float,
        surf_grade: str,
        surf_safety_grade: str,
        address: Optional[str] = None,
        region: Optional[str] = None,
        country: Optional[str] = None,
        departure_date: Optional[str] = None,
        wave_height: Optional[float] = None,
        wave_period: Optional[float] = None,
        wind_speed: Optional[float] = None,
        water_temperature: Optional[float] = None,
    ) -> Optional[dict]:
        """Save a new item to saved_list table."""
        sort_key = f"{location_id}#{surf_timestamp}"

        item = {
            "UserId": {"S": user_id},
            "SortKey": {"S": sort_key},
            "SavedAt": {"S": saved_at},
            "LocationId": {"S": location_id},
            "SurfTimestamp": {"S": surf_timestamp},
            "SurferLevel": {"S": surfer_level},
            "surfScore": {"N": str(surf_score)},
            "surfGrade": {"S": surf_grade},
            "surfSafetyGrade": {"S": surf_safety_grade},
            "flagChange": {"BOOL": False},
        }

        # Add optional fields
        if address:
            item["Address"] = {"S": address}
        if region:
            item["Region"] = {"S": region}
        if country:
            item["Country"] = {"S": country}
        if departure_date:
            item["DepartureDate"] = {"S": departure_date}
        if wave_height is not None:
            item["waveHeight"] = {"N": str(wave_height)}
        if wave_period is not None:
            item["wavePeriod"] = {"N": str(wave_period)}
        if wind_speed is not None:
            item["windSpeed"] = {"N": str(wind_speed)}
        if water_temperature is not None:
            item["waterTemperature"] = {"N": str(water_temperature)}

        try:
            async with await cls.get_client() as client:
                await client.put_item(
                    TableName=cls.TABLE_NAME,
                    Item=item,
                    ConditionExpression="attribute_not_exists(UserId) AND attribute_not_exists(SortKey)",
                )
                return cls._deserialize_item(item)
        except Exception as e:
            if "ConditionalCheckFailedException" in str(e):
                logger.warning(f"Item already exists: {user_id}/{sort_key}")
                return None
            logger.error(f"Failed to save item: {e}")
            raise

    @classmethod
    async def get_saved_list(cls, user_id: str) -> list[dict]:
        """Get all saved items for a user."""
        try:
            async with await cls.get_client() as client:
                response = await client.query(
                    TableName=cls.TABLE_NAME,
                    KeyConditionExpression="UserId = :uid",
                    ExpressionAttributeValues={":uid": {"S": user_id}},
                )
                return [cls._deserialize_item(item) for item in response.get("Items", [])]
        except Exception as e:
            logger.error(f"Failed to get saved list: {e}")
            return []

    @classmethod
    async def get_saved_item(cls, user_id: str, location_id: str, surf_timestamp: str) -> Optional[dict]:
        """Get a specific saved item."""
        sort_key = f"{location_id}#{surf_timestamp}"

        try:
            async with await cls.get_client() as client:
                response = await client.get_item(
                    TableName=cls.TABLE_NAME,
                    Key={
                        "UserId": {"S": user_id},
                        "SortKey": {"S": sort_key},
                    },
                )
                item = response.get("Item")
                return cls._deserialize_item(item) if item else None
        except Exception as e:
            logger.error(f"Failed to get saved item: {e}")
            return None

    @classmethod
    async def delete_item(cls, user_id: str, location_id: str, surf_timestamp: str) -> bool:
        """Delete a saved item."""
        sort_key = f"{location_id}#{surf_timestamp}"

        try:
            async with await cls.get_client() as client:
                await client.delete_item(
                    TableName=cls.TABLE_NAME,
                    Key={
                        "UserId": {"S": user_id},
                        "SortKey": {"S": sort_key},
                    },
                )
                return True
        except Exception as e:
            logger.error(f"Failed to delete item: {e}")
            return False

    @classmethod
    async def acknowledge_change(cls, user_id: str, location_id: str, surf_timestamp: str) -> bool:
        """Acknowledge a change notification (set flagChange to false)."""
        sort_key = f"{location_id}#{surf_timestamp}"

        try:
            async with await cls.get_client() as client:
                await client.update_item(
                    TableName=cls.TABLE_NAME,
                    Key={
                        "UserId": {"S": user_id},
                        "SortKey": {"S": sort_key},
                    },
                    UpdateExpression="SET flagChange = :fc REMOVE changeMessage",
                    ExpressionAttributeValues={":fc": {"BOOL": False}},
                )
                return True
        except Exception as e:
            logger.error(f"Failed to acknowledge change: {e}")
            return False

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
