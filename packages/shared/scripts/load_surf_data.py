"""
Load surf data from CSV into local DynamoDB surf_info table.
Usage: python scripts/load_surf_data.py
"""
import csv
import sys
from datetime import datetime
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

ENDPOINT_URL = "http://localhost:8000"
TABLE_NAME = "surf_info"
REGION = "ap-northeast-2"
CSV_FILE = "data/mock_surf_info.csv"


def get_surf_grade(score: float) -> str:
    if score >= 3.0:
        return "A+"
    elif score >= 2.5:
        return "A"
    elif score >= 2.0:
        return "B+"
    elif score >= 1.5:
        return "B"
    elif score >= 1.0:
        return "C"
    else:
        return "D"


def get_surfing_level(score: float) -> str:
    if score >= 2.5:
        return "ADVANCED"
    elif score >= 1.5:
        return "INTERMEDIATE"
    else:
        return "BEGINNER"


def create_table_if_not_exists(dynamodb):
    try:
        dynamodb.describe_table(TableName=TABLE_NAME)
        print(f"Table '{TABLE_NAME}' already exists.")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            print(f"Creating table '{TABLE_NAME}'...")
            dynamodb.create_table(
                TableName=TABLE_NAME,
                KeySchema=[
                    {"AttributeName": "LocationId", "KeyType": "HASH"},
                    {"AttributeName": "SurfTimestamp", "KeyType": "RANGE"},
                ],
                AttributeDefinitions=[
                    {"AttributeName": "LocationId", "AttributeType": "S"},
                    {"AttributeName": "SurfTimestamp", "AttributeType": "S"},
                ],
                BillingMode="PAY_PER_REQUEST",
            )
            dynamodb.get_waiter("table_exists").wait(TableName=TABLE_NAME)
            print(f"Table '{TABLE_NAME}' created.")
        else:
            raise


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

    count = 0
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    with open(CSV_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        batch = []
        for row in reader:
            lat = float(row["latitude"])
            lng = float(row["longitude"])
            location_id = f"{lat}#{lng}"
            surf_timestamp = parse_timestamp(row["date"])
            surf_score = float(row["surf_score"])

            item = {
                "LocationId": location_id,
                "SurfTimestamp": surf_timestamp,
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
                    "surfScore": to_decimal(round(surf_score, 1)),
                    "surfGrade": get_surf_grade(surf_score),
                    "surfingLevel": get_surfing_level(surf_score),
                },
                "metadata": {
                    "modelVersion": "sagemaker-awaves-v1.2",
                    "dataSource": "open-meteo",
                    "predictionType": "FORECAST",
                    "createdAt": now_iso,
                },
            }
            batch.append(item)

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


if __name__ == "__main__":
    main()