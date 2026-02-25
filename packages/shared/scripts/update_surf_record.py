"""
Update a specific surf_info record in DynamoDB and flag changes in saved_list.

This script:
1. Updates the surf_info record (DynamoDB)
2. Updates the Redis latest cache for the location
3. Scans saved_list for users who saved this location+timestamp
4. Sets flagChange=true + changeMessage on matching saved_list items
5. Invalidates affected users' saved-items Redis cache

Usage: python scripts/update_surf_record.py
"""
import json
import os
import sys
from datetime import datetime
from decimal import Decimal
from pathlib import Path

# Fix encoding for Windows console
sys.stdout.reconfigure(encoding="utf-8")

import boto3
import redis
from dotenv import load_dotenv

# Load .env and .env.local from apps/api (.env.local overrides .env)
_api_dir = Path(__file__).resolve().parent.parent.parent.parent / "apps" / "api"
load_dotenv(_api_dir / ".env")
load_dotenv(_api_dir / ".env.local", override=True)

ENDPOINT_URL = "http://localhost:8000"
SURF_TABLE = "awaves-dev-surf-info"
SAVED_TABLE = "awaves-dev-saved-list"
REGION = "ap-northeast-2"

REDIS_URL = os.getenv("CACHE_URL")
if not REDIS_URL:
    raise RuntimeError("CACHE_URL is not set. Check apps/api/.env.local")

# ── Before / After data ──────────────────────────────────────
LOCATION_ID = "-38.6763#145.6519"
SURF_TIMESTAMP = "2026-02-19T04:00:00Z"

# Only the changed fields
OLD_SCORE = 40.0
OLD_RATING = "2.0"

NEW_SCORE = 65.0
NEW_RATING = "3.0"
NEW_SURFING_LEVEL = "ADVANCED"  # was INTERMEDIATE (rating >= 3.0)


def to_decimal(val):
    return Decimal(str(val))


def get_safety_grade(wind_speed: float, wave_height: float) -> str:
    if wind_speed > 20 or wave_height > 3.0:
        return "DANGER"
    elif wind_speed > 15 or wave_height > 2.5:
        return "CAUTION"
    return "SAFE"


def main():
    dynamodb = boto3.client(
        "dynamodb",
        endpoint_url=ENDPOINT_URL,
        region_name=REGION,
        aws_access_key_id="dummy",
        aws_secret_access_key="dummy",
    )

    # ── Step 1: Update surf_info record ──────────────────────
    print(f"[1/5] Updating surf_info: {LOCATION_ID} @ {SURF_TIMESTAMP}")
    print(f"       surfScore: {OLD_SCORE} → {NEW_SCORE}")
    print(f"       surfGrade: {OLD_RATING} → {NEW_RATING}")
    print(f"       surfingLevel: INTERMEDIATE → {NEW_SURFING_LEVEL}")

    dynamodb.update_item(
        TableName=SURF_TABLE,
        Key={
            "LocationId": {"S": LOCATION_ID},
            "SurfTimestamp": {"S": SURF_TIMESTAMP},
        },
        UpdateExpression=(
            "SET derivedMetrics.surfScore = :score, "
            "derivedMetrics.surfGrade = :grade, "
            "derivedMetrics.surfingLevel = :level"
        ),
        ExpressionAttributeValues={
            ":score": {"N": str(NEW_SCORE)},
            ":grade": {"S": NEW_RATING},
            ":level": {"S": NEW_SURFING_LEVEL},
        },
    )
    print("       ✓ surf_info updated")

    # ── Step 2: Update Redis latest cache for this location ──
    print(f"\n[2/5] Updating Redis latest cache for {LOCATION_ID}")
    try:
        r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        r.ping()

        latest_key = f"awaves:surf:latest:{LOCATION_ID}"
        existing = r.get(latest_key)
        if existing:
            data = json.loads(existing)
            if data.get("lastUpdated", "") <= SURF_TIMESTAMP:
                data["surfScore"] = NEW_SCORE
                data["surfGrade"] = NEW_RATING
                data["lastUpdated"] = SURF_TIMESTAMP
                r.setex(latest_key, 3 * 60 * 60, json.dumps(data))
                print(f"       ✓ Redis latest cache updated")
            else:
                print(f"       - Skipped (newer data exists: {data['lastUpdated']})")
        else:
            print(f"       - No existing latest cache entry")

        # Invalidate all_spots Redis cache so API returns fresh data
        deleted = r.delete("awaves:surf:all_spots")
        print(f"       ✓ awaves:surf:all_spots cache invalidated ({deleted} key)")

    except Exception as e:
        print(f"       ⚠ Redis update failed: {e}")
        r = None

    # ── Step 3: Scan saved_list for matching items ───────────
    print(f"\n[3/5] Scanning saved_list for items with LocationId = {LOCATION_ID}")

    # Match by LocationId (not exact SortKey) so ALL saved timestamps
    # at this location get notified when conditions change
    affected_users = []
    response = dynamodb.scan(
        TableName=SAVED_TABLE,
        FilterExpression="LocationId = :lid",
        ExpressionAttributeValues={
            ":lid": {"S": LOCATION_ID},
        },
    )
    items = response.get("Items", [])
    while "LastEvaluatedKey" in response:
        response = dynamodb.scan(
            TableName=SAVED_TABLE,
            FilterExpression="LocationId = :lid",
            ExpressionAttributeValues={
                ":lid": {"S": LOCATION_ID},
            },
            ExclusiveStartKey=response["LastEvaluatedKey"],
        )
        items.extend(response.get("Items", []))

    print(f"       Found {len(items)} saved item(s) matching this record")

    if not items:
        print("\n[4/5] No saved items to flag — done.")
        print("[5/5] No caches to invalidate — done.")
        return

    # ── Step 4: Set flagChange=true on matching saved_list items ──
    # Store structured JSON so the frontend can render in the user's locale
    change_data = {
        "changes": [
            {"field": "surfScore", "old": OLD_SCORE, "new": NEW_SCORE},
            {"field": "surfGrade", "old": OLD_RATING, "new": NEW_RATING},
        ]
    }
    change_message = json.dumps(change_data)
    print(f"\n[4/5] Setting flagChange=true on {len(items)} saved item(s)")
    print(f"       changeMessage: {change_message}")

    for item in items:
        user_id = item["UserId"]["S"]
        sort_key = item["SortKey"]["S"]

        dynamodb.update_item(
            TableName=SAVED_TABLE,
            Key={
                "UserId": {"S": user_id},
                "SortKey": {"S": sort_key},
            },
            UpdateExpression=(
                "SET flagChange = :fc, "
                "changeMessage = :cm, "
                "surfScore = :score, "
                "surfGrade = :grade"
            ),
            ExpressionAttributeValues={
                ":fc": {"BOOL": True},
                ":cm": {"S": change_message},
                ":score": {"N": str(NEW_SCORE)},
                ":grade": {"S": NEW_RATING},
            },
        )
        affected_users.append(user_id)
        print(f"       ✓ Flagged: user={user_id}, key={sort_key}")

    # ── Step 5: Invalidate affected users' saved-items Redis cache ──
    print(f"\n[5/5] Invalidating Redis saved-items cache for {len(set(affected_users))} user(s)")
    if r:
        try:
            for uid in set(affected_users):
                cache_key = f"awaves:saved:{uid}"
                deleted = r.delete(cache_key)
                print(f"       ✓ {cache_key} invalidated ({deleted} key)")
        except Exception as e:
            print(f"       ⚠ Redis invalidation failed: {e}")
        finally:
            r.close()

    print(f"\n✅ Done. {len(items)} saved item(s) flagged for change notification.")


if __name__ == "__main__":
    main()
