"""Application configuration and settings."""

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


def get_env_files() -> tuple[str, ...]:
    """Get the env files to load (in order of priority)."""
    base_dir = Path(__file__).parent.parent
    env_local = base_dir / ".env.local"
    env_file = base_dir / ".env"

    files = []
    # .env loaded first (base), .env.local loaded last (overrides)
    if env_file.exists():
        files.append(str(env_file))
    if env_local.exists():
        files.append(str(env_local))

    return tuple(files) if files else (".env",)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=get_env_files(),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Environment
    env: Literal["local", "dev", "development", "staging", "production"] = "development"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/awaves"

    # Redis/Cache (Valkey in production, Redis in local)
    cache_url: str = ""

    # AWS
    aws_region: str = "ap-northeast-2"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    # DynamoDB
    dynamodb_surf_data_table: str = "surf_info"
    dynamodb_saved_spots_table: str = "awaves-saved-spots"
    dynamodb_saved_list_table: str = "saved_list"
    ddb_endpoint_url: str = ""

    # OpenSearch
    opensearch_host: str = "localhost"
    opensearch_port: int = 9200

    # DynamoDB locations table
    dynamodb_locations_table: str = "locations"

    # Redis TTL for surf info cache (seconds)
    redis_ttl_seconds: int = 10800  # 3 hours

    # ML Inference - SageMaker local endpoint
    inference_mode: str = "sagemaker"  # "sagemaker" (call endpoint) | "mock" (deterministic random fallback)
    sagemaker_local_endpoint: str = "http://localhost:8080/invocations"

    # JWT
    jwt_secret_key: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # CORS - comma-separated string
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Get CORS origins as a list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
