"""RabbitMQ consumer — dispatches satellite analytics jobs to Celery."""
from __future__ import annotations

import json
import logging

import aio_pika

from app.messaging.events import EVENT_JOB_SUBMITTED, EVENTS_EXCHANGE

logger = logging.getLogger("satellite.consumer")

QUEUE_NAME = "satellite-service.events"
_ANALYTICS_JOB_TYPES = {"SPECTRAL_ANALYSIS", "CHANGE_DETECTION"}


async def _handle_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    async with message.process(requeue=False):
        try:
            event = json.loads(message.body.decode())
        except json.JSONDecodeError:
            logger.warning("Discarded malformed event")
            return

        if event.get("eventType") != EVENT_JOB_SUBMITTED:
            return

        payload = event.get("payload", {})
        job_id = payload.get("jobId")
        job_type = payload.get("jobType")
        if job_type not in _ANALYTICS_JOB_TYPES or not job_id:
            return

        from app.tasks.analytics import run_change_detection, run_spectral_analysis

        if job_type == "SPECTRAL_ANALYSIS":
            run_spectral_analysis.delay(job_id)
        else:
            run_change_detection.delay(job_id)
        logger.info("Dispatched %s job %s", job_type, job_id)


async def start_consumer(rabbitmq_url: str) -> aio_pika.abc.AbstractRobustConnection:
    connection = await aio_pika.connect_robust(rabbitmq_url)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=16)
    exchange = await channel.declare_exchange(
        EVENTS_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True
    )
    queue = await channel.declare_queue(QUEUE_NAME, durable=True)
    await queue.bind(exchange, routing_key=EVENT_JOB_SUBMITTED)
    await queue.consume(_handle_message)
    logger.info("Consuming %s for analytics jobs", EVENT_JOB_SUBMITTED)
    return connection
