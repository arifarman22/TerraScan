"""Application configuration, loaded from the environment (SRS C3)."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    database_url: str
    rabbitmq_url: str
    redis_url: str
    celery_broker_url: str
    celery_result_backend: str

    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_use_ssl: bool = False
    minio_bucket_raw: str = "platform-raw"
    minio_bucket_processed: str = "platform-processed"

    sentinelhub_client_id: str = ""
    sentinelhub_client_secret: str = ""
    sentinelhub_token_url: str = (
        "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/"
        "protocol/openid-connect/token"
    )
    sentinelhub_catalog_url: str = (
        "https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search"
    )
    planet_api_key: str = ""

    satellite_service_port: int = 8010
    log_level: str = "INFO"

    @property
    def asyncpg_dsn(self) -> str:
        return self.database_url.split("?", 1)[0]


settings = Settings()  # type: ignore[call-arg]
