"""Domain event construction (SRS §3.2). Mirrors the `DomainEvent` envelope
defined in @platform/shared-types."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

EVENTS_EXCHANGE = "platform.events"

EVENT_IMAGERY_UPLOADED = "imagery.uploaded"
EVENT_JOB_SUBMITTED = "job.submitted"
EVENT_JOB_STARTED = "job.started"
EVENT_JOB_COMPLETED = "job.completed"
EVENT_JOB_FAILED = "job.failed"


def _envelope(
    event_type: str,
    organisation_id: str,
    payload: dict[str, Any],
    correlation_id: str | None = None,
) -> dict[str, Any]:
    return {
        "eventId": str(uuid.uuid4()),
        "eventType": event_type,
        "occurredAt": datetime.now(timezone.utc).isoformat(),
        "organisationId": organisation_id,
        "correlationId": correlation_id or str(uuid.uuid4()),
        "payload": payload,
    }


def job_completed_event(
    organisation_id: str,
    job_id: str,
    job_type: str,
    output_types: list[str],
    duration_seconds: int,
) -> dict[str, Any]:
    return _envelope(
        EVENT_JOB_COMPLETED,
        organisation_id,
        {
            "jobId": job_id,
            "jobType": job_type,
            "outputTypes": output_types,
            "durationSeconds": duration_seconds,
        },
    )


def job_failed_event(
    organisation_id: str,
    job_id: str,
    job_type: str,
    error_message: str,
    retryable: bool,
    retry_count: int,
) -> dict[str, Any]:
    return _envelope(
        EVENT_JOB_FAILED,
        organisation_id,
        {
            "jobId": job_id,
            "jobType": job_type,
            "errorMessage": error_message,
            "retryable": retryable,
            "retryCount": retry_count,
        },
    )
