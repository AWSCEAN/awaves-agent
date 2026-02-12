"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

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
        })

    indexed = await OpenSearchService.bulk_index_locations(locations)
    logger.info("Seeded %d locations into OpenSearch from DynamoDB.", indexed)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown."""
    # Startup: Initialize database tables and DynamoDB
    await init_db()
    await DynamoDBService.create_table_if_not_exists()
    # Initialize OpenSearch index and auto-seed if empty
    await OpenSearchService.create_index_if_not_exists()
    await _seed_locations_if_empty()
    # Pre-warm surf spots cache in Redis
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
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}
