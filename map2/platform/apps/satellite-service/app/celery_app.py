"""Celery application for satellite analytics tasks (SRS §3.1)."""
from __future__ import annotations

from celery import Celery

from app.config import settings

celery_app = Celery(
    "satellite_service",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.analytics"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_time_limit=2 * 60 * 60,
    broker_connection_retry_on_startup=True,
    # Service-specific queue: satellite-worker consumes only analytics tasks.
    task_default_queue="satellite",
)
