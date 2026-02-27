"""
Ingest location data from CSV into DynamoDB (locations table) and OpenSearch (locations index).

Supports both English-only CSV (mock_surf_data_geocode.csv) and bilingual CSV
(surf_locations_korean_translations.csv) with Korean translations.

Usage:
    cd apps/api
    python -m app.scripts.ingest_locations_from_csv [--csv PATH]

Requirements:
    - DynamoDB local running on port 8000 (or AWS DynamoDB configured)
    - OpenSearch running on port 9200 (with nori plugin for Korean)
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

# CSV file path (relative to apps/api/)
CSV_FILE = Path(__file__).resolve().parent.parent.parent.parent.parent / "mock_surf_data_geocode.csv"
# Korean translations CSV
CSV_FILE_KO = Path(__file__).resolve().parent.parent.parent.parent.parent / "surf_locations_korean_translations.csv"


def create_ddb_table(dynamodb_client):
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


def create_opensearch_index(os_client: OpenSearch):
    """Create the locations OpenSearch index if it doesn't exist."""
    index_name = "locations"

    if os_client.indices.exists(index=index_name):
        print(f"OpenSearch index '{index_name}' already exists. Deleting for re-ingestion...")
        os_client.indices.delete(index=index_name)

    # Check if nori plugin is available
    has_nori = _check_nori_plugin(os_client)

    settings = {
        "number_of_shards": 1,
        "number_of_replicas": 0,
    }

    if has_nori:
        settings["analysis"] = {
            "analyzer": {
                "korean_analyzer": {
                    "type": "custom",
                    "tokenizer": "nori_tokenizer",
                    "filter": ["lowercase", "nori_part_of_speech"],
                }
            }
        }

    properties = {
        "locationId": {"type": "keyword"},
        "display_name": {"type": "text", "analyzer": "standard"},
        "city": {"type": "text", "analyzer": "standard", "fields": {"keyword": {"type": "keyword"}}},
        "state": {"type": "keyword"},
        "country": {"type": "keyword"},
        "location": {"type": "geo_point"},
    }

    # Add Korean fields
    ko_analyzer = "korean_analyzer" if has_nori else "standard"
    properties.update({
        "display_name_ko": {
            "type": "text",
            "analyzer": ko_analyzer,
            "fields": {"keyword": {"type": "keyword"}},
        },
        "city_ko": {
            "type": "text",
            "analyzer": ko_analyzer,
            "fields": {"keyword": {"type": "keyword"}},
        },
        "state_ko": {
            "type": "text",
            "analyzer": ko_analyzer,
            "fields": {"keyword": {"type": "keyword"}},
        },
        "country_ko": {
            "type": "text",
            "analyzer": ko_analyzer,
            "fields": {"keyword": {"type": "keyword"}},
        },
    })

    mapping = {
        "settings": settings,
        "mappings": {"properties": properties},
    }

    os_client.indices.create(index=index_name, body=mapping)
    analyzer_info = "with Korean (nori) analyzer" if has_nori else "without Korean analyzer (nori plugin not installed)"
    print(f"OpenSearch index '{index_name}' created {analyzer_info}.")


def _check_nori_plugin(os_client: OpenSearch) -> bool:
    """Check if the nori analysis plugin is installed."""
    try:
        plugins = os_client.cat.plugins(format="json")
        for plugin in plugins:
            if "nori" in plugin.get("component", "").lower():
                return True
        # Also try via analyze API
        os_client.indices.analyze(body={"tokenizer": "nori_tokenizer", "text": "테스트"})
        return True
    except Exception:
        return False


def read_csv(csv_path: Path) -> list[dict]:
    """Read locations from CSV file and generate locationId.

    Supports both English-only and bilingual CSVs.
    """
    locations = []
    seen_ids = set()

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        has_korean = "display_name_kr" in fieldnames

        for row in reader:
            lat = row["lat"].strip()
            lon = row["lon"].strip()
            location_id = f"{lat}#{lon}"

            # Deduplicate by locationId
            if location_id in seen_ids:
                continue
            seen_ids.add(location_id)

            loc = {
                "locationId": location_id,
                "lat": float(lat),
                "lon": float(lon),
                "display_name": row.get("display_name", "").strip(),
                "city": row.get("city", "").strip(),
                "state": row.get("state", "").strip(),
                "country": row.get("country", "").strip(),
            }

            # Add Korean fields if present
            if has_korean:
                loc["display_name_ko"] = row.get("display_name_kr", "").strip()
                loc["city_ko"] = row.get("city_kr", "").strip()
                loc["state_ko"] = row.get("state_kr", "").strip()
                loc["country_ko"] = row.get("country_kr", "").strip()

            locations.append(loc)

    return locations


def ingest_to_dynamodb(dynamodb_resource, locations: list[dict]):
    """Write locations to DynamoDB locations table."""
    table = dynamodb_resource.Table(LOCATIONS_TABLE)
    count = 0

    with table.batch_writer() as batch:
        for loc in locations:
            item = {
                "locationId": loc["locationId"],
                "lat": Decimal(str(loc["lat"])),
                "lon": Decimal(str(loc["lon"])),
                "displayName": loc["display_name"],
                "city": loc["city"],
                "state": loc["state"],
                "country": loc["country"],
            }
            # Add Korean fields if present
            if loc.get("display_name_ko"):
                item["displayNameKo"] = loc["display_name_ko"]
            if loc.get("city_ko"):
                item["cityKo"] = loc["city_ko"]
            if loc.get("state_ko"):
                item["stateKo"] = loc["state_ko"]
            if loc.get("country_ko"):
                item["countryKo"] = loc["country_ko"]

            batch.put_item(Item=item)
            count += 1

    print(f"Ingested {count} locations into DynamoDB '{LOCATIONS_TABLE}'.")


def ingest_to_opensearch(os_client: OpenSearch, locations: list[dict]):
    """Bulk index locations into OpenSearch."""
    index_name = "locations"
    actions = []

    for loc in locations:
        actions.append(json.dumps({"index": {"_index": index_name, "_id": loc["locationId"]}}))
        doc = {
            "locationId": loc["locationId"],
            "display_name": loc["display_name"],
            "city": loc["city"],
            "state": loc["state"],
            "country": loc["country"],
            "location": {
                "lat": loc["lat"],
                "lon": loc["lon"],
            },
            "display_name_ko": loc.get("display_name_ko", ""),
            "city_ko": loc.get("city_ko", ""),
            "state_ko": loc.get("state_ko", ""),
            "country_ko": loc.get("country_ko", ""),
        }
        actions.append(json.dumps(doc))

    body = "\n".join(actions) + "\n"
    response = os_client.bulk(body=body, refresh=True)

    errors = response.get("errors", False)
    items = response.get("items", [])
    success = sum(1 for item in items if item.get("index", {}).get("status") in (200, 201))

    if errors:
        failed = [item for item in items if item.get("index", {}).get("status") not in (200, 201)]
        print(f"Warning: {len(failed)} documents failed to index.")

    print(f"Indexed {success} locations into OpenSearch '{index_name}'.")


def main():
    # Determine which CSV to use
    csv_path = CSV_FILE_KO if CSV_FILE_KO.exists() else CSV_FILE

    # Allow override via command line
    if len(sys.argv) > 2 and sys.argv[1] == "--csv":
        csv_path = Path(sys.argv[2])

    if not csv_path.exists():
        print(f"Error: CSV file not found at {csv_path}")
        sys.exit(1)

    print(f"Reading CSV from: {csv_path}")
    locations = read_csv(csv_path)
    print(f"Found {len(locations)} unique locations.")

    has_korean = any(loc.get("display_name_ko") for loc in locations)
    if has_korean:
        ko_count = sum(1 for loc in locations if loc.get("display_name_ko"))
        print(f"  Korean translations found: {ko_count}/{len(locations)}")

    # DynamoDB setup
    ddb_kwargs = {
        "region_name": REGION,
        "aws_access_key_id": settings.aws_access_key_id or "dummy",
        "aws_secret_access_key": settings.aws_secret_access_key or "dummy",
    }
    if DDB_ENDPOINT_URL:
        ddb_kwargs["endpoint_url"] = DDB_ENDPOINT_URL

    dynamodb_client = boto3.client("dynamodb", **ddb_kwargs)
    dynamodb_resource = boto3.resource("dynamodb", **ddb_kwargs)

    create_ddb_table(dynamodb_client)
    ingest_to_dynamodb(dynamodb_resource, locations)

    # OpenSearch setup
    os_client = OpenSearch(
        hosts=[{"host": OPENSEARCH_HOST, "port": OPENSEARCH_PORT}],
        use_ssl=False,
        verify_certs=False,
        timeout=30,
    )

    try:
        info = os_client.info()
        print(f"OpenSearch connected: version {info['version']['number']}")
    except Exception as e:
        print(f"Error: Cannot connect to OpenSearch at {OPENSEARCH_HOST}:{OPENSEARCH_PORT}")
        print(f"  {e}")
        print("  Make sure OpenSearch is running: docker compose up -d")
        sys.exit(1)

    create_opensearch_index(os_client)
    ingest_to_opensearch(os_client, locations)

    print("\nIngestion complete!")
    print(f"  DynamoDB: {len(locations)} locations in '{LOCATIONS_TABLE}'")
    print(f"  OpenSearch: {len(locations)} locations in 'locations' index")
    if has_korean:
        print("  Korean translations: included")


if __name__ == "__main__":
    main()
