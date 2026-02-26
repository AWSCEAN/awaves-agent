"""Repository for saved_list DynamoDB table operations."""

import logging
from typing import Optional

from app.config import settings
from app.repositories.base_repository import BaseDynamoDBRepository, dynamodb_subsegment

logger = logging.getLogger(__name__)


class SavedListRepository(BaseDynamoDBRepository):
    """Repository for user saved items (saved_list table)."""

    TABLE_NAME = settings.dynamodb_saved_list_table

    @classmethod
    async def create_table_if_not_exists(cls) -> bool:
        """Create saved_list table if it doesn't exist.

        If the table exists but has an old key schema (e.g. PascalCase),
        it is dropped and recreated with the correct camelCase keys.
        """
        expected_pk, expected_sk = "userId", "sortKey"

        try:
            async with await cls.get_client() as client:
                need_create = False
                try:
                    desc = await client.describe_table(TableName=cls.TABLE_NAME)
                    key_schema = desc["Table"]["KeySchema"]
                    pk = next(k["AttributeName"] for k in key_schema if k["KeyType"] == "HASH")
                    sk = next(k["AttributeName"] for k in key_schema if k["KeyType"] == "RANGE")

                    if pk == expected_pk and sk == expected_sk:
                        logger.info(f"DynamoDB table {cls.TABLE_NAME} already exists")
                        return True

                    logger.info(
                        f"Table {cls.TABLE_NAME} has old key schema ({pk}/{sk}). "
                        f"Recreating with {expected_pk}/{expected_sk}..."
                    )
                    await client.delete_table(TableName=cls.TABLE_NAME)
                    waiter = client.get_waiter("table_not_exists")
                    await waiter.wait(TableName=cls.TABLE_NAME)
                    need_create = True

                except client.exceptions.ResourceNotFoundException:
                    need_create = True

                if need_create:
                    logger.info(f"Creating DynamoDB table {cls.TABLE_NAME}")
                    await client.create_table(
                        TableName=cls.TABLE_NAME,
                        KeySchema=[
                            {"AttributeName": expected_pk, "KeyType": "HASH"},
                            {"AttributeName": expected_sk, "KeyType": "RANGE"},
                        ],
                        AttributeDefinitions=[
                            {"AttributeName": expected_pk, "AttributeType": "S"},
                            {"AttributeName": expected_sk, "AttributeType": "S"},
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
    def _parse_location_surf_key(cls, location_surf_key: Optional[str], location_id: Optional[str], surf_timestamp: Optional[str]) -> tuple[str, str]:
        """Parse location_surf_key or use separate location_id and surf_timestamp."""
        if location_surf_key:
            parts = location_surf_key.split("#", 2)
            if len(parts) >= 3:
                loc_id = f"{parts[0]}#{parts[1]}"
                ts = parts[2]
                return loc_id, ts
            elif len(parts) == 2:
                return parts[0], parts[1]
        if location_id and surf_timestamp:
            return location_id, surf_timestamp
        raise ValueError("Either location_surf_key or both location_id and surf_timestamp must be provided")

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
            "userId": {"S": user_id},
            "sortKey": {"S": sort_key},
            "savedAt": {"S": saved_at},
            "locationId": {"S": location_id},
            "surfTimestamp": {"S": surf_timestamp},
            "surferLevel": {"S": surfer_level},
            "surfScore": {"N": str(surf_score)},
            "surfGrade": {"S": surf_grade},
            "flagChange": {"BOOL": False},
        }

        if address:
            item["address"] = {"S": address}
        if region:
            item["region"] = {"S": region}
        if country:
            item["country"] = {"S": country}
        if departure_date:
            item["departureDate"] = {"S": departure_date}
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
                with dynamodb_subsegment("DynamoDB_PutItem"):
                    await client.put_item(
                        TableName=cls.TABLE_NAME,
                        Item=item,
                        ConditionExpression="attribute_not_exists(userId) AND attribute_not_exists(sortKey)",
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
                with dynamodb_subsegment("DynamoDB_Query"):
                    response = await client.query(
                        TableName=cls.TABLE_NAME,
                        KeyConditionExpression="userId = :uid",
                        ExpressionAttributeValues={":uid": {"S": user_id}},
                    )
                return [cls._deserialize_item(item) for item in response.get("Items", [])]
        except Exception as e:
            logger.error(f"Failed to get saved list: {e}")
            return []

    @classmethod
    async def get_saved_item(
        cls,
        user_id: str,
        location_id: Optional[str] = None,
        surf_timestamp: Optional[str] = None,
        location_surf_key: Optional[str] = None,
    ) -> Optional[dict]:
        """Get a specific saved item."""
        loc_id, ts = cls._parse_location_surf_key(location_surf_key, location_id, surf_timestamp)
        sort_key = f"{loc_id}#{ts}"

        try:
            async with await cls.get_client() as client:
                with dynamodb_subsegment("DynamoDB_GetItem"):
                    response = await client.get_item(
                        TableName=cls.TABLE_NAME,
                        Key={
                            "userId": {"S": user_id},
                            "sortKey": {"S": sort_key},
                        },
                    )
                item = response.get("Item")
                return cls._deserialize_item(item) if item else None
        except Exception as e:
            logger.error(f"Failed to get saved item: {e}")
            return None

    @classmethod
    async def delete_item(
        cls,
        user_id: str,
        location_id: Optional[str] = None,
        surf_timestamp: Optional[str] = None,
        location_surf_key: Optional[str] = None,
    ) -> bool:
        """Delete a saved item."""
        loc_id, ts = cls._parse_location_surf_key(location_surf_key, location_id, surf_timestamp)
        sort_key = f"{loc_id}#{ts}"

        try:
            async with await cls.get_client() as client:
                with dynamodb_subsegment("DynamoDB_DeleteItem"):
                    await client.delete_item(
                        TableName=cls.TABLE_NAME,
                        Key={
                            "userId": {"S": user_id},
                            "sortKey": {"S": sort_key},
                        },
                    )
                return True
        except Exception as e:
            logger.error(f"Failed to delete item: {e}")
            return False

    @classmethod
    async def acknowledge_change(
        cls,
        user_id: str,
        location_id: Optional[str] = None,
        surf_timestamp: Optional[str] = None,
        location_surf_key: Optional[str] = None,
    ) -> bool:
        """Acknowledge a change notification (set flagChange to false)."""
        loc_id, ts = cls._parse_location_surf_key(location_surf_key, location_id, surf_timestamp)
        sort_key = f"{loc_id}#{ts}"

        try:
            async with await cls.get_client() as client:
                with dynamodb_subsegment("DynamoDB_UpdateItem"):
                    await client.update_item(
                        TableName=cls.TABLE_NAME,
                        Key={
                            "userId": {"S": user_id},
                            "sortKey": {"S": sort_key},
                        },
                        UpdateExpression="SET flagChange = :fc REMOVE changeMessage",
                        ExpressionAttributeValues={":fc": {"BOOL": False}},
                    )
                return True
        except Exception as e:
            logger.error(f"Failed to acknowledge change: {e}")
            return False
