"""Satellite & Analytics Service — FastAPI application (SRS §6).

Exposes scene-search and analytics-reference endpoints, and in its lifespan
runs the RabbitMQ consumer that dispatches analytics jobs to Celery.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

from app import db
from app.analytics.bands import BAND_COMBINATIONS
from app.analytics.indices import INDEX_REGISTRY
from app.config import settings
from app.logging_config import configure_logging
from app.messaging.consumer import start_consumer
from app.redis_bus import ping as redis_ping
from app.sources.planet import PlanetClient, PlanetError
from app.sources.sentinelhub import SentinelHubClient, SentinelHubError

logger = logging.getLogger("satellite.main")
_state: dict[str, object] = {}


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    configure_logging(settings.log_level)
    await db.init_pool()
    consumer = await start_consumer(settings.rabbitmq_url)
    _state["consumer"] = consumer
    logger.info("Satellite service started on port %s", settings.satellite_service_port)
    try:
        yield
    finally:
        await consumer.close()
        await db.close_pool()


app = FastAPI(
    title="Satellite & Analytics Service",
    description="Satellite imagery search and spectral analytics (SRS §6).",
    version="1.0.0",
    lifespan=lifespan,
)


def _sentinelhub() -> SentinelHubClient:
    return SentinelHubClient(
        settings.sentinelhub_client_id,
        settings.sentinelhub_client_secret,
        settings.sentinelhub_token_url,
        settings.sentinelhub_catalog_url,
    )


def _planet() -> PlanetClient:
    return PlanetClient(settings.planet_api_key)


@app.get("/health/live", tags=["health"])
async def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health", tags=["health"])
async def health() -> JSONResponse:
    database_ok = await db.ping(db.get_pool())
    redis_ok = await redis_ping(settings.redis_url)
    ok = database_ok and redis_ok
    return JSONResponse(
        status_code=200 if ok else 503,
        content={
            "status": "ok" if ok else "error",
            "service": "satellite-service",
            "checks": {
                "database": "up" if database_ok else "down",
                "redis": "up" if redis_ok else "down",
            },
            "sources": {
                "sentinelHub": _sentinelhub().configured,
                "planet": _planet().configured,
            },
        },
    )


@app.get("/satellite/indices", tags=["analytics"])
async def indices() -> dict[str, object]:
    """The supported spectral indices and their required bands (SRS §6.4)."""
    return {
        name: {
            "description": entry["description"],
            "bands": entry["bands"],
            "range": entry["range"],
        }
        for name, entry in INDEX_REGISTRY.items()
    }


@app.get("/satellite/band-combinations", tags=["analytics"])
async def band_combinations() -> dict[str, dict[str, str]]:
    """The preset band combinations for visualisation (SRS §6.3)."""
    return BAND_COMBINATIONS


@app.get("/satellite/search", tags=["sources"])
async def search(
    source: str = Query("SENTINEL_HUB"),
    bbox: str = Query(..., description="west,south,east,north"),
    date_from: str = Query(..., alias="dateFrom"),
    date_to: str = Query(..., alias="dateTo"),
    max_cloud: float = Query(100.0, alias="maxCloud"),
) -> JSONResponse:
    """Search a satellite data source for available scenes (SRS FR-SAT-001)."""
    try:
        coords = [float(value) for value in bbox.split(",")]
        if len(coords) != 4:
            raise ValueError("bbox must be west,south,east,north")
    except ValueError as error:
        return JSONResponse(status_code=400, content={"error": str(error)})

    try:
        if source.upper() == "PLANET":
            scenes = await _planet().search(coords, date_from, date_to, max_cloud)
        else:
            scenes = await _sentinelhub().search(coords, date_from, date_to, max_cloud)
        return JSONResponse(status_code=200, content={"source": source, "scenes": scenes})
    except (SentinelHubError, PlanetError) as error:
        return JSONResponse(status_code=502, content={"error": str(error)})
