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
from app.db.session import close_db, init_db
from app.routers import auth, feedback, register, saved, search, surf
from app.graphql.schema import graphql_app
from app.services.cache import CacheService
from app.services.dynamodb import DynamoDBService
from app.services.opensearch_service import OpenSearchService
from app.services.surf_dynamodb import SurfDynamoDBService

logger = logging.getLogger(__name__)

# Path to Korean translations CSV
_KOREAN_CSV = Path(__file__).resolve().parent / "scripts" / "data" / "surf_locations_korean_translations.csv"


async def _seed_locations_table_if_empty() -> None:
    """Auto-seed the DynamoDB locations table with Korean address data from CSV."""
    if not _KOREAN_CSV.exists():
        logger.info("Korean translations CSV not found at %s, skipping locations table seed.", _KOREAN_CSV)
        return

    session = aioboto3.Session(
        aws_access_key_id=settings.aws_access_key_id or "dummy",
        aws_secret_access_key=settings.aws_secret_access_key or "dummy",
        region_name=settings.aws_region,
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
                    "display_name": {"S": row.get("display_name", "").strip()},
                    "city": {"S": row.get("city", "").strip()},
                    "state": {"S": row.get("state", "").strip()},
                    "country": {"S": row.get("country", "").strip()},
                    "display_name_ko": {"S": row.get("display_name_kr", "").strip()},
                    "city_ko": {"S": row.get("city_kr", "").strip()},
                    "state_ko": {"S": row.get("state_kr", "").strip()},
                    "country_ko": {"S": row.get("country_kr", "").strip()},
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
    """Auto-seed OpenSearch locations index from DynamoDB surf_info if empty."""
    doc_count = await OpenSearchService.get_document_count()

    if doc_count > 0:
        logger.info("OpenSearch locations index already has %d documents, skipping seed.", doc_count)
        return

    if doc_count < 0:
        logger.warning("Could not check OpenSearch document count, skipping seed.")
        return

    logger.info("OpenSearch locations index is empty. Seeding from DynamoDB surf_info...")
    spots = await SurfDynamoDBService.get_all_spots_unpaginated()
    if not spots:
        logger.warning("No spots found in DynamoDB surf_info, skipping seed.")
        return

    seen_ids: set[str] = set()
    locations: list[dict] = []
    for spot in spots:
        location_id = spot["LocationId"]
        if location_id in seen_ids:
            continue
        seen_ids.add(location_id)
        locations.append({
            "locationId": location_id,
            "lat": spot["geo"]["lat"],
            "lon": spot["geo"]["lng"],
            "display_name": spot.get("address", "") or spot.get("name", ""),
            "city": spot.get("city", ""),
            "state": spot.get("region", ""),
            "country": spot.get("country", ""),
            # Korean fields
            "display_name_ko": spot.get("addressKo", "") or spot.get("nameKo", "") or "",
            "city_ko": spot.get("cityKo", "") or "",
            "state_ko": spot.get("regionKo", "") or "",
            "country_ko": spot.get("countryKo", "") or "",
        })

    indexed = await OpenSearchService.bulk_index_locations(locations)
    logger.info("Seeded %d locations into OpenSearch from DynamoDB.", indexed)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown."""
    # Startup: Initialize database tables and DynamoDB
    await init_db()
    await DynamoDBService.create_table_if_not_exists()
    # Seed locations DynamoDB table with Korean address data from CSV
    await _seed_locations_table_if_empty()
    # Initialize OpenSearch index and auto-seed if empty
    await OpenSearchService.create_index_if_not_exists()
    await _seed_locations_if_empty()
    # Clear stale surf spots cache and pre-warm with fresh data (includes Korean fields)
    await CacheService.invalidate_surf_spots()
    await SurfDynamoDBService._get_all_spots_raw()
    yield
    # Shutdown: Close database, cache, and OpenSearch connections
    await close_db()
    await CacheService.close()
    await OpenSearchService.close()


app = FastAPI(
    title="AWAVES API",
    description="AI-powered surf spot discovery API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# Include routers
app.include_router(register.router, tags=["Registration"])  # /register at root level
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(surf.router, prefix="/surf", tags=["Surf Data"])
app.include_router(saved.router, prefix="/saved", tags=["Saved Spots"])
app.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])
app.include_router(search.router, prefix="/search", tags=["Location Search"])
app.include_router(graphql_app, prefix="/graphql", tags=["GraphQL"])


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "Welcome to AWAVES API", "version": "0.1.0"}


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
