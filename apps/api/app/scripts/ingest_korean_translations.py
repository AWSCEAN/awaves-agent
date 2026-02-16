"""
Import Korean translations from surf_locations_korean_translations.csv into
existing DynamoDB locations table and OpenSearch index.

This script:
1. Reads the Korean translations CSV
2. Matches rows to existing DynamoDB records by locationId (lat#lon)
3. Updates DynamoDB records with Korean fields
4. Updates OpenSearch documents with Korean fields

Safe to re-run (idempotent). Does NOT delete or modify English data.

Usage:
    cd apps/api
    python -m app.scripts.ingest_korean_translations [--dry-run]
"""

import csv
import json
import sys
from decimal import Decimal
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from opensearchpy import OpenSearch

from app.config import settings

# Configuration from shared settings
DDB_ENDPOINT_URL = settings.ddb_endpoint_url
LOCATIONS_TABLE = settings.dynamodb_locations_table
REGION = settings.aws_region
OPENSEARCH_HOST = settings.opensearch_host
OPENSEARCH_PORT = settings.opensearch_port

# CSV file in scripts/data/
CSV_FILE = Path(__file__).resolve().parent / "data" / "surf_locations_korean_translations.csv"


def create_table_if_not_exists(dynamodb_client) -> None:
    """Create the locations DynamoDB table if it doesn't exist."""
    try:
        dynamodb_client.describe_table(TableName=LOCATIONS_TABLE)
        print(f"DynamoDB table '{LOCATIONS_TABLE}' already exists.")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            print(f"Creating DynamoDB table '{LOCATIONS_TABLE}'...")
            dynamodb_client.create_table(
                TableName=LOCATIONS_TABLE,
                KeySchema=[
                    {"AttributeName": "locationId", "KeyType": "HASH"},
                ],
                AttributeDefinitions=[
                    {"AttributeName": "locationId", "AttributeType": "S"},
                ],
                BillingMode="PAY_PER_REQUEST",
            )
            dynamodb_client.get_waiter("table_exists").wait(TableName=LOCATIONS_TABLE)
            print(f"DynamoDB table '{LOCATIONS_TABLE}' created.")
        else:
            raise


def read_korean_csv(csv_path: Path) -> list[dict]:
    """Read Korean translations CSV and return list of location dicts."""
    locations = []
    seen_ids = set()

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            lat = row["lat"].strip()
            lon = row["lon"].strip()
            location_id = f"{lat}#{lon}"

            if location_id in seen_ids:
                continue
            seen_ids.add(location_id)

            locations.append({
                "locationId": location_id,
                "lat": float(lat),
                "lon": float(lon),
                # English fields (preserve)
                "display_name": row.get("display_name", "").strip(),
                "city": row.get("city", "").strip(),
                "state": row.get("state", "").strip(),
                "country": row.get("country", "").strip(),
                # Korean fields (new)
                "display_name_ko": row.get("display_name_kr", "").strip(),
                "city_ko": row.get("city_kr", "").strip(),
                "state_ko": row.get("state_kr", "").strip(),
                "country_ko": row.get("country_kr", "").strip(),
            })

    return locations


def validate_data(locations: list[dict]) -> dict:
    """Validate CSV data and return report."""
    report = {
        "total": len(locations),
        "valid": 0,
        "missing_korean": [],
        "invalid_coords": [],
    }

    for loc in locations:
        valid = True

        # Validate coordinates
        lat, lon = loc["lat"], loc["lon"]
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            report["invalid_coords"].append(loc["locationId"])
            valid = False

        # Check Korean translation exists
        if not loc.get("display_name_ko"):
            report["missing_korean"].append(loc["locationId"])

        if valid:
            report["valid"] += 1

    return report


def update_dynamodb(dynamodb_resource, locations: list[dict], dry_run: bool = False) -> dict:
    """Update existing DynamoDB records with Korean fields."""
    table = dynamodb_resource.Table(LOCATIONS_TABLE)
    stats = {"updated": 0, "created": 0, "failed": 0, "errors": []}

    if dry_run:
        print(f"[DRY RUN] Would update {len(locations)} records in DynamoDB.")
        return stats

    with table.batch_writer() as batch:
        for loc in locations:
            try:
                # Put item with all fields (upsert - preserves + adds Korean)
                item = {
                    "locationId": loc["locationId"],
                    "lat": Decimal(str(loc["lat"])),
                    "lon": Decimal(str(loc["lon"])),
                    "display_name": loc["display_name"],
                    "city": loc["city"],
                    "state": loc["state"],
                    "country": loc["country"],
                    "display_name_ko": loc.get("display_name_ko", ""),
                    "city_ko": loc.get("city_ko", ""),
                    "state_ko": loc.get("state_ko", ""),
                    "country_ko": loc.get("country_ko", ""),
                }
                batch.put_item(Item=item)
                stats["updated"] += 1
            except Exception as e:
                stats["failed"] += 1
                stats["errors"].append(f"{loc['locationId']}: {e}")

    return stats


def update_opensearch(os_client: OpenSearch, locations: list[dict], dry_run: bool = False) -> dict:
    """Update existing OpenSearch documents with Korean fields."""
    index_name = "locations"
    stats = {"updated": 0, "failed": 0, "errors": []}

    if dry_run:
        print(f"[DRY RUN] Would update {len(locations)} documents in OpenSearch.")
        return stats

    # Use bulk update API
    actions = []
    for loc in locations:
        # Full index (upsert) to ensure all fields are present
        actions.append(json.dumps({"index": {"_index": index_name, "_id": loc["locationId"]}}))
        actions.append(json.dumps({
            "locationId": loc["locationId"],
            "display_name": loc["display_name"],
            "city": loc["city"],
            "state": loc["state"],
            "country": loc["country"],
            "location": {"lat": loc["lat"], "lon": loc["lon"]},
            "display_name_ko": loc.get("display_name_ko", ""),
            "city_ko": loc.get("city_ko", ""),
            "state_ko": loc.get("state_ko", ""),
            "country_ko": loc.get("country_ko", ""),
        }))

    if not actions:
        return stats

    body = "\n".join(actions) + "\n"
    response = os_client.bulk(body=body, refresh=True)

    items = response.get("items", [])
    for item in items:
        action = item.get("index", {})
        if action.get("status") in (200, 201):
            stats["updated"] += 1
        else:
            stats["failed"] += 1
            error_reason = action.get("error", {}).get("reason", "unknown")
            stats["errors"].append(f"{action.get('_id', '?')}: {error_reason}")

    return stats


def main():
    dry_run = "--dry-run" in sys.argv

    if not CSV_FILE.exists():
        print(f"Error: CSV file not found at {CSV_FILE}")
        sys.exit(1)

    print(f"{'[DRY RUN] ' if dry_run else ''}Reading Korean translations from: {CSV_FILE}")
    locations = read_korean_csv(CSV_FILE)
    print(f"Found {len(locations)} unique locations with Korean translations.")

    # Validate
    report = validate_data(locations)
    print(f"\nValidation Report:")
    print(f"  Total records: {report['total']}")
    print(f"  Valid records: {report['valid']}")
    print(f"  Missing Korean translations: {len(report['missing_korean'])}")
    print(f"  Invalid coordinates: {len(report['invalid_coords'])}")

    if report["invalid_coords"]:
        print(f"  Invalid coord IDs: {report['invalid_coords'][:5]}...")

    # DynamoDB
    ddb_kwargs = {
        "region_name": REGION,
        "aws_access_key_id": settings.aws_access_key_id or "dummy",
        "aws_secret_access_key": settings.aws_secret_access_key or "dummy",
    }
    if DDB_ENDPOINT_URL:
        ddb_kwargs["endpoint_url"] = DDB_ENDPOINT_URL

    dynamodb_client = boto3.client("dynamodb", **ddb_kwargs)
    dynamodb_resource = boto3.resource("dynamodb", **ddb_kwargs)

    create_table_if_not_exists(dynamodb_client)

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Updating DynamoDB...")
    ddb_stats = update_dynamodb(dynamodb_resource, locations, dry_run)
    if not dry_run:
        print(f"  Updated: {ddb_stats['updated']}")
        print(f"  Failed: {ddb_stats['failed']}")
        if ddb_stats["errors"]:
            for err in ddb_stats["errors"][:5]:
                print(f"    Error: {err}")

    # OpenSearch
    os_client = OpenSearch(
        hosts=[{"host": OPENSEARCH_HOST, "port": OPENSEARCH_PORT}],
        use_ssl=False,
        verify_certs=False,
        timeout=30,
    )

    try:
        info = os_client.info()
        print(f"\nOpenSearch connected: version {info['version']['number']}")
    except Exception as e:
        print(f"\nWarning: Cannot connect to OpenSearch at {OPENSEARCH_HOST}:{OPENSEARCH_PORT}")
        print(f"  {e}")
        print("  Skipping OpenSearch update. Run again when OpenSearch is available.")
        return

    print(f"{'[DRY RUN] ' if dry_run else ''}Updating OpenSearch...")
    os_stats = update_opensearch(os_client, locations, dry_run)
    if not dry_run:
        print(f"  Updated: {os_stats['updated']}")
        print(f"  Failed: {os_stats['failed']}")
        if os_stats["errors"]:
            for err in os_stats["errors"][:5]:
                print(f"    Error: {err}")

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Import complete!")
    print(f"  DynamoDB: {ddb_stats['updated']} updated, {ddb_stats['failed']} failed")
    print(f"  OpenSearch: {os_stats['updated']} updated, {os_stats['failed']} failed")


if __name__ == "__main__":
    main()
