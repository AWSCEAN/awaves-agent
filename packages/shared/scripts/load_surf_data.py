"""
Load surf data from CSV into local DynamoDB surf_info table.
Usage: python scripts/load_surf_data.py
"""
import csv
import json
import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

import boto3
import redis
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Load .env and .env.local from apps/api (.env.local overrides .env)
_api_dir = Path(__file__).resolve().parent.parent.parent.parent / "apps" / "api"
load_dotenv(_api_dir / ".env")
load_dotenv(_api_dir / ".env.local", override=True)

ENDPOINT_URL = "http://localhost:8000"
TABLE_NAME = "awaves-dev-surf-info"
REGION = "ap-northeast-2"
CSV_FILE = "data/mock_surf_prediction_current.csv"

REDIS_URL = os.getenv("CACHE_URL")
if not REDIS_URL:
    raise RuntimeError("CACHE_URL is not set. Check apps/api/.env.local")


def compute_ttl(surf_timestamp: str, ttl_days: int = 7) -> int:
    """Compute expiredAt as Unix epoch (TTL) from surf timestamp."""
    dt = datetime.strptime(surf_timestamp, "%Y-%m-%dT%H:%M:%SZ")
    return int((dt + timedelta(days=ttl_days)).timestamp())


def create_table_if_not_exists(dynamodb):
    expected_pk, expected_sk = "locationId", "surfTimestamp"

    try:
        desc = dynamodb.describe_table(TableName=TABLE_NAME)
        key_schema = desc["Table"]["KeySchema"]
        pk = next(k["AttributeName"] for k in key_schema if k["KeyType"] == "HASH")
        sk = next(k["AttributeName"] for k in key_schema if k["KeyType"] == "RANGE")

        if pk == expected_pk and sk == expected_sk:
            print(f"Table '{TABLE_NAME}' already exists with correct key schema.")
            return

        # Key schema mismatch — drop and recreate
        print(f"Table '{TABLE_NAME}' has old key schema ({pk}/{sk}). Recreating with {expected_pk}/{expected_sk}...")
        dynamodb.delete_table(TableName=TABLE_NAME)
        dynamodb.get_waiter("table_not_exists").wait(TableName=TABLE_NAME)
        print(f"Table '{TABLE_NAME}' deleted.")

    except ClientError as e:
        if e.response["Error"]["Code"] != "ResourceNotFoundException":
            raise

    print(f"Creating table '{TABLE_NAME}'...")
    dynamodb.create_table(
        TableName=TABLE_NAME,
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
    dynamodb.get_waiter("table_exists").wait(TableName=TABLE_NAME)
    print(f"Table '{TABLE_NAME}' created.")


def delete_all_items(dynamodb_client, table_resource):
    """Delete all items from the surf_info table.

    Handles both old PascalCase (LocationId/SurfTimestamp) and new camelCase
    (locationId/surfTimestamp) attribute names so existing data can be cleaned up.
    """
    print("Deleting all existing items from surf_info table...")

    # Describe the table to get the actual key attribute names
    desc = dynamodb_client.describe_table(TableName=TABLE_NAME)
    key_schema = desc["Table"]["KeySchema"]
    pk_attr = next(k["AttributeName"] for k in key_schema if k["KeyType"] == "HASH")
    sk_attr = next(k["AttributeName"] for k in key_schema if k["KeyType"] == "RANGE")

    response = dynamodb_client.scan(
        TableName=TABLE_NAME,
        ProjectionExpression=f"{pk_attr}, {sk_attr}",
    )
    items = response.get("Items", [])
    while "LastEvaluatedKey" in response:
        response = dynamodb_client.scan(
            TableName=TABLE_NAME,
            ProjectionExpression=f"{pk_attr}, {sk_attr}",
            ExclusiveStartKey=response["LastEvaluatedKey"],
        )
        items.extend(response.get("Items", []))

    if not items:
        print("No existing items to delete.")
        return

    with table_resource.batch_writer() as batch:
        for item in items:
            batch.delete_item(
                Key={
                    pk_attr: item[pk_attr]["S"],
                    sk_attr: item[sk_attr]["S"],
                }
            )
    print(f"Deleted {len(items)} items.")


def clear_redis_cache():
    """Clear surf-related Redis cache keys."""
    try:
        r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        r.ping()
        total_deleted = 0

        # Delete awaves:surf:latest:{LocationId} keys
        latest_keys = list(r.scan_iter("awaves:surf:latest:*"))
        if latest_keys:
            total_deleted += r.delete(*latest_keys)
        print(f"  awaves:surf:latest:* -> {len(latest_keys)} keys deleted")

        # Delete awaves:users:saved:{user_id} keys
        saved_keys = list(r.scan_iter("awaves:users:saved:*"))
        if saved_keys:
            total_deleted += r.delete(*saved_keys)
        print(f"  awaves:users:saved:* -> {len(saved_keys)} keys deleted")

        print(f"Redis cache cleared: {total_deleted} keys deleted total")
        r.close()
    except Exception as e:
        print(f"Warning: Could not clear Redis cache: {e}")


REDIS_LATEST_PREFIX = "awaves:surf:latest"
REDIS_LATEST_TTL = 3 * 60 * 60  # 3 hours


def get_safety_grade(wind_speed: float, wave_height: float) -> str:
    if wind_speed > 20 or wave_height > 3.0:
        return "DANGER"
    elif wind_speed > 15 or wave_height > 2.5:
        return "CAUTION"
    return "SAFE"


def save_latest_to_redis(latest_map: dict):
    """Save latest surf data per location to Redis cache."""
    try:
        r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        r.ping()
        pipe = r.pipeline()
        for location_id, data in latest_map.items():
            key = f"{REDIS_LATEST_PREFIX}:{location_id}"
            pipe.setex(key, REDIS_LATEST_TTL, json.dumps(data))
        pipe.execute()
        print(f"Saved {len(latest_map)} latest entries to Redis cache.")
        r.close()
    except Exception as e:
        print(f"Warning: Could not save latest to Redis: {e}")


def parse_timestamp(date_str: str) -> str:
    date_str = date_str.strip()
    if "+" in date_str:
        dt = datetime.fromisoformat(date_str)
    else:
        dt = datetime.fromisoformat(date_str)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def to_decimal(val):
    return Decimal(str(val))


def main():
    dynamodb = boto3.client(
        "dynamodb",
        endpoint_url=ENDPOINT_URL,
        region_name=REGION,
        aws_access_key_id="dummy",
        aws_secret_access_key="dummy",
    )

    create_table_if_not_exists(dynamodb)

    table = boto3.resource(
        "dynamodb",
        endpoint_url=ENDPOINT_URL,
        region_name=REGION,
        aws_access_key_id="dummy",
        aws_secret_access_key="dummy",
    ).Table(TABLE_NAME)

    # 1. Delete existing data from DDB and Redis cache
    delete_all_items(dynamodb, table)

    # 필요할 때 주석 해제하고 사용
    clear_redis_cache()

    # 2. Insert new data from CSV
    count = 0
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    latest_map: dict[str, dict] = {}  # location_id -> latest cache entry

    with open(CSV_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        batch = []
        for row in reader:
            lat = float(row["lat"])
            lng = float(row["lon"])
            location_id = f"{lat}#{lng}"
            surf_timestamp = parse_timestamp(row["datetime"])
            wave_height = float(row["wave_height"])
            wave_period = float(row["wave_period"])
            wind_speed = float(row["wind_speed_10m"])

            # Per-level scores and grades
            beginner_score = float(row["predicted_score_beginner"])
            beginner_grade = row["predicted_rating_beginner"]
            intermediate_score = float(row["predicted_score_intermediate"])
            intermediate_grade = row["predicted_rating_intermediate"]
            advanced_score = float(row["predicted_score_advanced"])
            advanced_grade = row["predicted_rating_advanced"]

            item = {
                "locationId": location_id,
                "surfTimestamp": surf_timestamp,
                "expiredAt": compute_ttl(surf_timestamp),
                "geo": {
                    "lat": to_decimal(lat),
                    "lng": to_decimal(lng),
                },
                "conditions": {
                    "waveHeight": to_decimal(row["wave_height"]),
                    "wavePeriod": to_decimal(row["wave_period"]),
                    "windSpeed": to_decimal(row["wind_speed_10m"]),
                    "waterTemperature": to_decimal(row["sea_surface_temperature"]),
                },
                "derivedMetrics": {
                    "BEGINNER": {
                        "surfScore": to_decimal(round(beginner_score, 1)),
                        "surfGrade": beginner_grade,
                    },
                    "INTERMEDIATE": {
                        "surfScore": to_decimal(round(intermediate_score, 1)),
                        "surfGrade": intermediate_grade,
                    },
                    "ADVANCED": {
                        "surfScore": to_decimal(round(advanced_score, 1)),
                        "surfGrade": advanced_grade,
                    },
                },
                "metadata": {
                    "modelVersion": "sagemaker-awaves-v1.2",
                    "dataSource": "open-meteo",
                    "predictionType": "FORECAST",
                    "createdAt": now_iso,
                },
                "location": {
                    "displayName": row.get("display_name", ""),
                    "city": row.get("city", ""),
                    "state": row.get("state", ""),
                    "country": row.get("country", ""),
                },
            }
            batch.append(item)

            # Track latest record per location for Redis cache (use INTERMEDIATE as default)
            if location_id not in latest_map or surf_timestamp > latest_map[location_id]["lastUpdated"]:
                latest_map[location_id] = {
                    "locationId": location_id,
                    "lat": lat,
                    "lng": lng,
                    "derivedMetrics": {
                        "BEGINNER": {"surfScore": round(beginner_score, 1), "surfGrade": beginner_grade},
                        "INTERMEDIATE": {"surfScore": round(intermediate_score, 1), "surfGrade": intermediate_grade},
                        "ADVANCED": {"surfScore": round(advanced_score, 1), "surfGrade": advanced_grade},
                    },
                    "surfSafetyGrade": get_safety_grade(wind_speed, wave_height),
                    "waveHeight": wave_height,
                    "wavePeriod": wave_period,
                    "lastUpdated": surf_timestamp,
                }

            if len(batch) >= 25:
                with table.batch_writer() as writer:
                    for it in batch:
                        writer.put_item(Item=it)
                count += len(batch)
                batch = []

        if batch:
            with table.batch_writer() as writer:
                for it in batch:
                    writer.put_item(Item=it)
            count += len(batch)

    print(f"Successfully loaded {count} items into '{TABLE_NAME}'.")

    # 필요할 때 주석 해제하고 사용
    # 3. Save latest per location to Redis cache
    save_latest_to_redis(latest_map)


if __name__ == "__main__":
    main()