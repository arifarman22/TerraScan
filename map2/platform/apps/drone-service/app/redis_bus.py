"""Redis progress publishing.

Progress updates are published to the `job-progress` channel; the Core
Service WebSocket gateway relays them to subscribed clients (SRS §3.2).
"""
from __future__ import annotations

import json
from typing import Any

import redis.asyncio as redis

JOB_PROGRESS_CHANNEL = "job-progress"


async def publish_progress(redis_url: str, payload: dict[str, Any]) -> None:
    """Publish a single progress message, opening a short-lived connection."""
    client = redis.from_url(redis_url)
    try:
        await client.publish(JOB_PROGRESS_CHANNEL, json.dumps(payload))
    finally:
        await client.aclose()


async def ping(redis_url: str) -> bool:
    client = redis.from_url(redis_url)
    try:
        return bool(await client.ping())
    except Exception:  # noqa: BLE001
        return False
    finally:
        await client.aclose()
