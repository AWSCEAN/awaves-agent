"""Application configuration and settings."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


def get_env_files() -> tuple[str, ...]:
    """Get the env files to load (in order of priority).

    Loading order: .env (base) → .env.{ENV} (environment-specific) → .env.local (local overrides)
    Later files override earlier ones.
    """
    base_dir = Path(__file__).parent.parent

    files = []
    env_file = base_dir / ".env"
    if env_file.exists():
        files.append(str(env_file))

    # Load environment-specific file (.env.dev, .env.production, etc.)
    # Read ENV from .env first to determine which file to load
    env_value = ""
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("ENV="):
                env_value = line.split("=", 1)[1].strip()
                break

    if env_value:
        env_specific = base_dir / f".env.{env_value}"
        if env_specific.exists():
            files.append(str(env_specific))

    env_local = base_dir / ".env.local"
    if env_local.exists():
        files.append(str(env_local))

    return tuple(files) if files else (".env",)


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    All values should be defined in the appropriate .env file:
      - .env           : base/production defaults
      - .env.dev       : development overrides
      - .env.local     : local machine overrides (gitignored)
    """

    model_config = SettingsConfigDict(
        env_file=get_env_files(),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Environment
    env: Literal["local", "dev", "development", "staging", "production"] = "development"
    port: int = 8001
    debug: bool = False

    # Database — single URL (local/dev) or component-based (production)
    database_url: str = ""

    # Production: component-based writer/reader URLs
    db_writer_host: str = ""
    db_reader_host: str = ""
    db_port: int = 5432
    db_name: str = ""
    db_writer_user: str = ""
    db_reader_user: str = ""
    db_writer_password: str = ""
    db_reader_password: str = ""
    db_ssl_mode: str = ""
    db_ssl_root_cert: str = ""

    # Redis/Cache
    cache_url: str = ""

    # AWS
    aws_region: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    # DynamoDB
    dynamodb_surf_data_table: str = ""
    dynamodb_saved_list_table: str = ""
    dynamodb_locations_table: str = ""
    ddb_endpoint_url: str = ""

    # OpenSearch
    opensearch_host: str = ""
    opensearch_port: int = 9200

    # Cache TTL (seconds)
    cache_ttl_saved_items: int = 600  # 10 minutes
    cache_ttl_surf_spots: int = 1800  # 30 minutes
    cache_ttl_inference: int = 86400  # 24 hours
    redis_ttl_seconds: int = 10800  # 3 hours (surf info)

    # ML Inference - SageMaker endpoint
    inference_mode: str = "sagemaker"
    sagemaker_local_endpoint: str = ""
    sagemaker_endpoint_name: str = ""

    # LLM Summary - Lambda
    llm_summary_lambda_name: str = "awaves-dev-bedrock-summary"

    # JWT
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # CORS
    cors_origins: str = ""

    @property
    def db_writer_url(self) -> str:
        """Get writer database URL. Falls back to DATABASE_URL for local/dev."""
        if self.db_writer_host:
            password = self.db_writer_password
            return (
                f"postgresql+asyncpg://{self.db_writer_user}:{password}"
                f"@{self.db_writer_host}:{self.db_port}/{self.db_name}"
            )
        return self.database_url

    @property
    def db_reader_url(self) -> str:
        """Get reader database URL. Falls back to DATABASE_URL for local/dev."""
        if self.db_reader_host:
            password = self.db_reader_password
            return (
                f"postgresql+asyncpg://{self.db_reader_user}:{password}"
                f"@{self.db_reader_host}:{self.db_port}/{self.db_name}"
            )
        return self.database_url

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
