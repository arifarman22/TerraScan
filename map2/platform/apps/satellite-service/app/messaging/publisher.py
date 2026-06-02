"""Publishes domain events to the durable RabbitMQ topic exchange."""
from __future__ import annotations

import json
from typing import Any

import aio_pika

from app.messaging.events import EVENTS_EXCHANGE


async def publish_event(
    rabbitmq_url: str, routing_key: str, event: dict[str, Any]
) -> None:
    connection = await aio_pika.connect_robust(rabbitmq_url)
    try:
        channel = await connection.channel(publisher_confirms=True)
        exchange = await channel.declare_exchange(
            EVENTS_EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True
        )
        await exchange.publish(
            aio_pika.Message(
                body=json.dumps(event).encode(),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key=routing_key,
        )
    finally:
        await connection.close()
