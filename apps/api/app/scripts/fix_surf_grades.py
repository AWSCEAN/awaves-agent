"""
Fix surfGrade values in the awaves-dev-surf-info DynamoDB table.

Scans all items and converts any letter-grade strings (e.g. "A+", "B")
stored in derivedMetrics.{LEVEL}.surfGrade back to float-formatted
numeric strings (e.g. "3.0", "2.0").

Usage:
    cd apps/api
    python -m app.scripts.fix_surf_grades [--dry-run]
"""

import sys

import boto3

from app.config import settings

TABLE_NAME = settings.dynamodb_surf_data_table or "awaves-dev-surf-info"

# Reverse mapping of _numeric_grade_to_letter from surf_data_repository.py
LETTER_TO_NUMERIC: dict[str, str] = {
    "A+": "3.0",
    "A": "2.5",
    "B": "2.0",
    "C": "1.0",
    "D": "0.0",
}

LEVELS = ("BEGINNER", "INTERMEDIATE", "ADVANCED")


def needs_fix(grade_value: dict) -> bool:
    """Check if a surfGrade DynamoDB attribute needs conversion."""
    if "S" not in grade_value:
        return False
    return grade_value["S"] in LETTER_TO_NUMERIC


def scan_all_items(client) -> list[dict]:
    """Full table scan returning raw DynamoDB items."""
    items: list[dict] = []
    params: dict = {"TableName": TABLE_NAME}
    while True:
        response = client.scan(**params)
        items.extend(response.get("Items", []))
        if "LastEvaluatedKey" not in response:
            break
        params["ExclusiveStartKey"] = response["LastEvaluatedKey"]
    return items


def main():
    dry_run = "--dry-run" in sys.argv

    ddb_kwargs: dict = {
        "region_name": settings.aws_region or "ap-northeast-2",
        "aws_access_key_id": settings.aws_access_key_id or "dummy",
        "aws_secret_access_key": settings.aws_secret_access_key or "dummy",
    }
    if settings.ddb_endpoint_url:
        ddb_kwargs["endpoint_url"] = settings.ddb_endpoint_url

    client = boto3.client("dynamodb", **ddb_kwargs)

    print(f"Scanning table: {TABLE_NAME}")
    if dry_run:
        print("(DRY RUN — no writes will be performed)")

    items = scan_all_items(client)
    print(f"Total items scanned: {len(items)}")

    updated = 0
    skipped = 0
    errors = 0

    for item in items:
        location_id = item["locationId"]["S"]
        surf_timestamp = item["surfTimestamp"]["S"]

        derived = item.get("derivedMetrics", {}).get("M", {})
        if not derived:
            skipped += 1
            continue

        # Build update expression parts for levels that need fixing
        expr_names: dict[str, str] = {}
        expr_values: dict[str, dict] = {}
        set_clauses: list[str] = []

        for level in LEVELS:
            level_map = derived.get(level, {}).get("M", {})
            grade_attr = level_map.get("surfGrade", {})
            if not needs_fix(grade_attr):
                continue

            old_val = grade_attr["S"]
            new_val = LETTER_TO_NUMERIC[old_val]

            # Use expression attribute names to avoid reserved-word conflicts
            level_alias = f"#lv_{level}"
            expr_names["#dm"] = "derivedMetrics"
            expr_names[level_alias] = level
            expr_names["#sg"] = "surfGrade"
            value_alias = f":sg_{level}"
            expr_values[value_alias] = {"S": new_val}
            set_clauses.append(f"#dm.{level_alias}.#sg = {value_alias}")

            print(f"  {location_id} | {surf_timestamp} | {level}: {old_val} -> {new_val}")

        if not set_clauses:
            skipped += 1
            continue

        if dry_run:
            updated += 1
            continue

        update_expr = "SET " + ", ".join(set_clauses)

        try:
            client.update_item(
                TableName=TABLE_NAME,
                Key={
                    "locationId": item["locationId"],
                    "surfTimestamp": item["surfTimestamp"],
                },
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_names,
                ExpressionAttributeValues=expr_values,
            )
            updated += 1
        except Exception as e:
            print(f"  ERROR updating {location_id}|{surf_timestamp}: {e}")
            errors += 1

    print(f"\nDone. Updated: {updated}, Skipped: {skipped}, Errors: {errors}")


if __name__ == "__main__":
    main()
