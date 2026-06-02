"""Drone Photogrammetry Service — FastAPI application (SRS §3.1).

The HTTP app exposes health and inspection endpoints and, in its lifespan,
runs the RabbitMQ consumer that dispatches photogrammetry jobs to Celery.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app import db
from app.config import settings
from app.logging_config import configure_logging
from app.messaging.consumer import start_consumer
from app.nodeodm.client import NodeODMClient, NodeODMUnavailableError
from app.nodeodm.presets import options_dict_for_preset
from app.redis_bus import ping as redis_ping

logger = logging.getLogger("drone.main")

_state: dict[str, object] = {}


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    configure_logging(settings.log_level)
    await db.init_pool()
    consumer = await start_consumer(settings.rabbitmq_url)
    _state["consumer"] = consumer
    logger.info("Drone service started on port %s", settings.drone_service_port)
    try:
        yield
    finally:
        await consumer.close()
        await db.close_pool()


app = FastAPI(
    title="Drone Photogrammetry Service",
    description="Consumes imagery events and orchestrates NodeODM (SRS §5).",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health/live", tags=["health"])
async def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health", tags=["health"])
async def health() -> JSONResponse:
    database_ok = await db.ping(db.get_pool())
    redis_ok = await redis_ping(settings.redis_url)
    try:
        await NodeODMClient(settings.nodeodm_url).info()
        nodeodm_ok = True
    except NodeODMUnavailableError:
        nodeodm_ok = False

    ok = database_ok and redis_ok and nodeodm_ok
    return JSONResponse(
        status_code=200 if ok else 503,
        content={
            "status": "ok" if ok else "error",
            "service": "drone-service",
            "checks": {
                "database": "up" if database_ok else "down",
                "redis": "up" if redis_ok else "down",
                "nodeodm": "up" if nodeodm_ok else "down",
            },
        },
    )


@app.get("/nodeodm/info", tags=["nodeodm"])
async def nodeodm_info() -> JSONResponse:
    """Proxy NodeODM's engine information (verifies connectivity)."""
    try:
        info = await NodeODMClient(settings.nodeodm_url).info()
        return JSONResponse(status_code=200, content=info)
    except NodeODMUnavailableError as error:
        return JSONResponse(status_code=503, content={"error": str(error)})


@app.get("/presets", tags=["nodeodm"])
async def presets() -> dict[str, object]:
    """Quality preset → ODM option mapping (SRS FR-PHOTO-002)."""
    return {
        preset: options_dict_for_preset(preset)
        for preset in ("DRAFT", "STANDARD", "HIGH", "ULTRA")
    }
