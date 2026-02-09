"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import close_db, init_db
from app.routers import auth, feedback, register, saved, surf
from app.graphql.schema import graphql_app
from app.services.cache import CacheService
from app.services.dynamodb import DynamoDBService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown."""
    # Startup: Initialize database tables and DynamoDB
    await init_db()
    await DynamoDBService.create_table_if_not_exists()
    yield
    # Shutdown: Close database and cache connections
    await close_db()
    await CacheService.close()


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
app.include_router(graphql_app, prefix="/graphql", tags=["GraphQL"])


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "Welcome to AWAVES API", "version": "0.1.0"}


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}
