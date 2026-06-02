"""Application configuration, loaded from the environment (SRS C3)."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed settings sourced from environment variables."""

    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    database_url: str
    rabbitmq_url: str
    redis_url: str
    celery_broker_url: str
    celery_result_backend: str
    nodeodm_url: str
    nodecm_url: str = "http://nodecm:3000"

    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_use_ssl: bool = False
    minio_bucket_raw: str = "platform-raw"
    minio_bucket_processed: str = "platform-processed"

    drone_service_port: int = 8000
    log_level: str = "INFO"

    @property
    def asyncpg_dsn(self) -> str:
        """DATABASE_URL without query parameters asyncpg does not accept."""
        return self.database_url.split("?", 1)[0]


settings = Settings()  # type: ignore[call-arg]
