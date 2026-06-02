"""RabbitMQ consumer (SRS §3.2). Listens for `imagery.uploaded` and
`job.submitted`, and dispatches photogrammetry jobs to Celery."""
from __future__ import annotations

import json
import logging

import aio_pika

from app.messaging.events import (
    EVENT_IMAGERY_UPLOADED,
    EVENT_JOB_SUBMITTED,
    EVENTS_EXCHANGE,
)

logger = logging.getLogger("drone.consumer")

QUEUE_NAME = "drone-service.events"


async def _handle_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    async with message.process(requeue=False):
        try:
            event = json.loads(message.body.decode())
        except json.JSONDecodeError:
            logger.warning("Discarded malformed event")
            return

        event_type = event.get("eventType")
        payload = event.get("payload", {})

        if event_type == EVENT_IMAGERY_UPLOADED:
            logger.info(
                "imagery.uploaded — mission=%s files=%s",
                payload.get("missionId"),
                payload.get("fileCount"),
            )
            return

        if event_type == EVENT_JOB_SUBMITTED:
            job_id = payload.get("jobId")
            job_type = payload.get("jobType")
            if job_type == "PHOTOGRAMMETRY" and job_id:
                from app.tasks.photogrammetry import run_photogrammetry

                run_photogrammetry.delay(job_id)
                logger.info("Dispatched photogrammetry job %s", job_id)
            elif job_type == "GCP_PHOTOGRAMMETRY" and job_id:
                from app.tasks.gcp_photogrammetry import run_gcp_photogrammetry

                run_gcp_photogrammetry.delay(job_id)
                logger.info("Dispatched GCP-corrected photogrammetry job %s", job_id)
            return


async def start_consumer(rabbitmq_url: str) -> aio_pika.abc.AbstractRobustConnection:
    """Bind a durable queue and begin consuming. Returns the connection."""
    connection = await aio_pika.connect_robust(rabbitmq_url)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=16)
    exchange = await channel.declare_exchange(
        EVENTS_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True
    )
    queue = await channel.declare_queue(QUEUE_NAME, durable=True)
    await queue.bind(exchange, routing_key=EVENT_IMAGERY_UPLOADED)
    await queue.bind(exchange, routing_key=EVENT_JOB_SUBMITTED)
    await queue.consume(_handle_message)
    logger.info("Consuming %s and %s", EVENT_IMAGERY_UPLOADED, EVENT_JOB_SUBMITTED)
    return connection
