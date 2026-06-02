"""Celery application for distributed photogrammetry tasks (SRS §3.1)."""
from __future__ import annotations

from celery import Celery

from app.config import settings

celery_app = Celery(
    "drone_service",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.photogrammetry", "app.tasks.gcp_photogrammetry"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_time_limit=6 * 60 * 60,
    broker_connection_retry_on_startup=True,
    # Service-specific queue: drone-worker consumes only photogrammetry tasks.
    task_default_queue="drone",
)
