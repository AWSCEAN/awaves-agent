"""FastAPI application entry point."""

import asyncio
import csv
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import aioboto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.logging import setup_json_logging
from app.core.tracing import init_tracing, XRayMiddleware
from app.core.middleware import TraceIdMiddleware
from app.core.handlers import register_exception_handlers
from app.middleware.metrics import CloudWatchMetricsMiddleware
from app.db.session import close_db, init_db
from app.routers import admin, auth, feedback, register, saved, search, surf
from app.graphql.schema import graphql_app
from app.services.cache import CacheService
from app.repositories.saved_list_repository import SavedListRepository
from app.services.opensearch_service import OpenSearchService
from app.repositories.surf_data_repository import SurfDataRepository

# Initialise JSON structured logging before any logger is used
setup_json_logging()

# Initialise X-Ray tracing (patches boto3, httpx, etc.)
init_tracing()

logger = logging.getLogger(__name__)

# Path to Korean translations CSV
_KOREAN_CSV = Path(__file__).resolve().parent / "scripts" / "data" / "surf_locations_korean_translations.csv"


async def _seed_locations_table_if_empty() -> None:
    """Auto-seed the DynamoDB locations table with Korean address data from CSV."""
    if not _KOREAN_CSV.exists():
        logger.info("Korean translations CSV not found at %s, skipping locations table seed.", _KOREAN_CSV)
        return

    session = aioboto3.Session(
        region_name=settings.aws_region
    )
    endpoint_url = settings.ddb_endpoint_url if settings.ddb_endpoint_url else None
    config = Config(retries={"max_attempts": 3, "mode": "adaptive"}, connect_timeout=5, read_timeout=10)

    try:
        async with session.client("dynamodb", endpoint_url=endpoint_url, config=config) as client:
            # Check if the locations table exists; create if not
            try:
                await client.describe_table(TableName=settings.dynamodb_locations_table)
            except ClientError as e:
                if e.response["Error"]["Code"] != "ResourceNotFoundException":
                    raise
                logger.info("Creating DynamoDB table '%s'...", settings.dynamodb_locations_table)
                await client.create_table(
                    TableName=settings.dynamodb_locations_table,
                    KeySchema=[{"AttributeName": "locationId", "KeyType": "HASH"}],
                    AttributeDefinitions=[{"AttributeName": "locationId", "AttributeType": "S"}],
                    BillingMode="PAY_PER_REQUEST",
                )
                # Wait for table to become active
                for _ in range(30):
                    desc = await client.describe_table(TableName=settings.dynamodb_locations_table)
                    if desc["Table"]["TableStatus"] == "ACTIVE":
                        break
                    await asyncio.sleep(1)

            # Check if any items exist (scan with limit 1)
            resp = await client.scan(TableName=settings.dynamodb_locations_table, Limit=1)
            if resp.get("Items"):
                # Check if data uses old snake_case field names
                sample = resp["Items"][0]
                if "display_name" in sample and "displayName" not in sample:
                    logger.info("Locations table has old snake_case fields, clearing for re-seed...")
                    # Delete all items and re-seed
                    scan_resp = await client.scan(
                        TableName=settings.dynamodb_locations_table,
                        ProjectionExpression="locationId",
                    )
                    for item in scan_resp.get("Items", []):
                        await client.delete_item(
                            TableName=settings.dynamodb_locations_table,
                            Key={"locationId": item["locationId"]},
                        )
                    while scan_resp.get("LastEvaluatedKey"):
                        scan_resp = await client.scan(
                            TableName=settings.dynamodb_locations_table,
                            ProjectionExpression="locationId",
                            ExclusiveStartKey=scan_resp["LastEvaluatedKey"],
                        )
                        for item in scan_resp.get("Items", []):
                            await client.delete_item(
                                TableName=settings.dynamodb_locations_table,
                                Key={"locationId": item["locationId"]},
                            )
                else:
                    logger.info("DynamoDB locations table already has data, skipping CSV seed.")
                    return

        # Table is empty — seed from CSV
        logger.info("Seeding DynamoDB locations table from Korean CSV...")
        locations = []
        seen_ids: set[str] = set()
        with open(_KOREAN_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                lat = row["lat"].strip()
                lon = row["lon"].strip()
                location_id = f"{lat}#{lon}"
                if location_id in seen_ids:
                    continue
                seen_ids.add(location_id)
                locations.append({
                    "locationId": {"S": location_id},
                    "lat": {"N": lat},
                    "lon": {"N": lon},
                    "displayName": {"S": row.get("display_name", "").strip()},
                    "city": {"S": row.get("city", "").strip()},
                    "state": {"S": row.get("state", "").strip()},
                    "country": {"S": row.get("country", "").strip()},
                    "displayNameKo": {"S": row.get("display_name_kr", "").strip()},
                    "cityKo": {"S": row.get("city_kr", "").strip()},
                    "stateKo": {"S": row.get("state_kr", "").strip()},
                    "countryKo": {"S": row.get("country_kr", "").strip()},
                })

        # Batch write (max 25 items per batch)
        async with session.client("dynamodb", endpoint_url=endpoint_url, config=config) as client:
            total_written = 0
            for i in range(0, len(locations), 25):
                batch = locations[i:i + 25]
                await client.batch_write_item(
                    RequestItems={
                        settings.dynamodb_locations_table: [
                            {"PutRequest": {"Item": item}} for item in batch
                        ]
                    }
                )
                total_written += len(batch)

        logger.info("Seeded %d locations into DynamoDB locations table.", total_written)

    except Exception as e:
        logger.warning("Failed to seed locations table: %s", e)


async def _seed_locations_if_empty() -> None:
    """Auto-seed OpenSearch locations index from DynamoDB locations table if empty."""
    doc_count = await OpenSearchService.get_document_count()

    if doc_count > 0:
        logger.info("OpenSearch locations index already has %d documents, skipping seed.", doc_count)
        return

    if doc_count < 0:
        logger.warning("Could not check OpenSearch document count, skipping seed.")
        return

    logger.info("OpenSearch locations index is empty. Seeding from DynamoDB locations table...")

    session = aioboto3.Session(
        region_name=settings.aws_region
    )
    endpoint_url = settings.ddb_endpoint_url if settings.ddb_endpoint_url else None
    config = Config(retries={"max_attempts": 3, "mode": "adaptive"}, connect_timeout=5, read_timeout=10)

    try:
        async with session.client("dynamodb", endpoint_url=endpoint_url, config=config) as client:
            all_items: list[dict] = []
            params: dict = {"TableName": settings.dynamodb_locations_table}
            while True:
                response = await client.scan(**params)
                all_items.extend(response.get("Items", []))
                if "LastEvaluatedKey" not in response:
                    break
                params["ExclusiveStartKey"] = response["LastEvaluatedKey"]

        if not all_items:
            logger.warning("No items found in DynamoDB locations table, skipping seed.")
            return

        locations: list[dict] = []
        for item in all_items:
            locations.append({
                "locationId": item["locationId"]["S"],
                "lat": float(item.get("lat", {}).get("N", "0")),
                "lon": float(item.get("lon", {}).get("N", "0")),
                "display_name": item.get("displayName", {}).get("S", ""),
                "city": item.get("city", {}).get("S", ""),
                "state": item.get("state", {}).get("S", ""),
                "country": item.get("country", {}).get("S", ""),
                "display_name_ko": item.get("displayNameKo", {}).get("S", ""),
                "city_ko": item.get("cityKo", {}).get("S", ""),
                "state_ko": item.get("stateKo", {}).get("S", ""),
                "country_ko": item.get("countryKo", {}).get("S", ""),
            })

        indexed = await OpenSearchService.bulk_index_locations(locations)
        logger.info("Seeded %d locations into OpenSearch from DynamoDB locations table.", indexed)

    except Exception as e:
        logger.warning("Failed to seed OpenSearch from DynamoDB locations table: %s", e)


async def _warm_cache_background():
    """Warm the surf spots cache in the background after startup.

    Runs asynchronously after the app is ready to avoid blocking startup
    and Kubernetes readiness probes. This prevents deployment timeouts
    when scanning large DynamoDB tables.
    """
    # Wait a bit to ensure app is fully ready and serving traffic
    await asyncio.sleep(5)
    logger.info("Starting background cache warm-up...")
    try:
        await CacheService.invalidate_surf_spots()
        await SurfDataRepository._get_all_spots_raw()
        logger.info("Background cache warm-up completed successfully")
    except Exception as e:
        logger.error("Background cache warm-up failed: %s", e, exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown."""
    # Startup: Initialize database tables and DynamoDB
    await init_db()
    await SavedListRepository.create_table_if_not_exists()
    await SurfDataRepository.create_table_if_not_exists()
    # Seed locations DynamoDB table with Korean address data from CSV
    await _seed_locations_table_if_empty()
    # Initialize OpenSearch index and auto-seed if empty
    await OpenSearchService.create_index_if_not_exists()
    await _seed_locations_if_empty()
    # Warm cache in background (non-blocking) to avoid deployment timeouts
    asyncio.create_task(_warm_cache_background())
    logger.info("Application startup complete, cache warming in background")
    yield
    # Shutdown: Close database, cache, and OpenSearch connections
    await close_db()
    await CacheService.close()
    await OpenSearchService.close()


app = FastAPI(
    title="awaves API",
    description="AI-powered surf spot discovery API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Global exception handlers
register_exception_handlers(app)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Observability middleware (last added = outermost = executes first)
app.add_middleware(XRayMiddleware)
app.add_middleware(CloudWatchMetricsMiddleware)
app.add_middleware(TraceIdMiddleware)

# Include routers
# Include routers
app.include_router(register.router, tags=["Registration"])  # /register at root level
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(surf.router, prefix="/surf", tags=["Surf Data"])
app.include_router(saved.router, prefix="/saved", tags=["Saved Spots"])
app.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])
app.include_router(search.router, prefix="/search", tags=["Location Search"])
app.include_router(graphql_app, prefix="/graphql", tags=["GraphQL"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "Welcome to awaves API", "version": "0.1.0"}


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "inference": {
            "mode": settings.inference_mode,
            "endpoint": settings.sagemaker_local_endpoint,
        },
    }
