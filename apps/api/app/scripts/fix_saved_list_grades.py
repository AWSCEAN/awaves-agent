"""
Fix surfGrade values in the awaves-dev-saved-list DynamoDB table.

Scans all items and converts any letter-grade strings (e.g. "A+", "B")
stored in surfGrade back to DynamoDB Number type with float-formatted
numeric values (e.g. 3.0, 2.0).

Usage:
    cd apps/api
    python -m app.scripts.fix_saved_list_grades [--dry-run]
"""

import sys

import boto3

from app.config import settings

TABLE_NAME = settings.dynamodb_saved_list_table or "awaves-dev-saved-list"

# Reverse mapping of letter grades to numeric values
LETTER_TO_NUMERIC: dict[str, str] = {
    "A+": "3.0",
    "A": "2.5",
    "B": "2.0",
    "C": "1.0",
    "D": "0.0",
}


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


def get_fix_value(grade_attr: dict) -> str | None:
    """Return the numeric string if this surfGrade needs fixing, else None.

    Handles two cases:
      - {"S": "A+"}  — letter grade stored as String type
      - {"S": "3.0"} — numeric value mistakenly stored as String type
    Both are converted to Number type {"N": "..."}.
    """
    if "S" in grade_attr:
        val = grade_attr["S"]
        # Letter grade -> numeric
        if val in LETTER_TO_NUMERIC:
            return LETTER_TO_NUMERIC[val]
        # Numeric string stored as S instead of N
        try:
            float(val)
            return val
        except (ValueError, TypeError):
            return None
    return None


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
        user_id = item["userId"]["S"]
        sort_key = item["sortKey"]["S"]

        grade_attr = item.get("surfGrade", {})
        new_val = get_fix_value(grade_attr)

        if new_val is None:
            skipped += 1
            continue

        old_repr = grade_attr.get("S", "?")
        print(f"  {user_id} | {sort_key} | surfGrade: \"{old_repr}\" (S) -> {new_val} (N)")

        if dry_run:
            updated += 1
            continue

        try:
            client.update_item(
                TableName=TABLE_NAME,
                Key={
                    "userId": item["userId"],
                    "sortKey": item["sortKey"],
                },
                UpdateExpression="SET surfGrade = :sg",
                ExpressionAttributeValues={":sg": {"N": new_val}},
            )
            updated += 1
        except Exception as e:
            print(f"  ERROR updating {user_id}|{sort_key}: {e}")
            errors += 1

    print(f"\nDone. Updated: {updated}, Skipped: {skipped}, Errors: {errors}")


if __name__ == "__main__":
    main()
