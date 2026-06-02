"""PostgreSQL access via asyncpg (trusted backend worker)."""
from __future__ import annotations

import json
from typing import Any

import asyncpg

from app.config import settings

_pool: asyncpg.Pool | None = None


async def _register_codecs(conn: asyncpg.Connection) -> None:
    """UUID → str, JSONB → Python dict (so callers can `.get(...)` keys)."""
    await conn.set_type_codec(
        "uuid", encoder=str, decoder=str, schema="pg_catalog", format="text"
    )
    await conn.set_type_codec(
        "jsonb",
        encoder=json.dumps,
        decoder=json.loads,
        schema="pg_catalog",
        format="text",
    )
    await conn.set_type_codec(
        "json",
        encoder=json.dumps,
        decoder=json.loads,
        schema="pg_catalog",
        format="text",
    )


async def init_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(
        settings.asyncpg_dsn, min_size=1, max_size=5, init=_register_codecs
    )


async def close_pool() -> None:
    if _pool is not None:
        await _pool.close()


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialised")
    return _pool


async def connect() -> asyncpg.Connection:
    conn = await asyncpg.connect(settings.asyncpg_dsn)
    await _register_codecs(conn)
    return conn


async def ping(db: Any) -> bool:
    try:
        await db.fetchval("SELECT 1")
        return True
    except Exception:  # noqa: BLE001
        return False


async def get_job(db: Any, job_id: str) -> dict[str, Any] | None:
    row = await db.fetchrow(
        """
        SELECT id, organisation_id, project_id, mission_id, workspace_id,
               type, status, preset, config
        FROM jobs WHERE id = $1
        """,
        job_id,
    )
    if not row:
        return None
    record = dict(row)
    if isinstance(record.get("config"), str):
        record["config"] = json.loads(record["config"])
    return record


async def update_job_status(
    db: Any,
    job_id: str,
    status: str,
    *,
    progress: int | None = None,
    error_message: str | None = None,
    set_started: bool = False,
    set_completed: bool = False,
) -> None:
    await db.execute(
        """
        UPDATE jobs SET
          status = $2,
          progress_percent = COALESCE($3, progress_percent),
          error_message = COALESCE($4, error_message),
          started_at = CASE WHEN $5 THEN now() ELSE started_at END,
          completed_at = CASE WHEN $6 THEN now() ELSE completed_at END,
          updated_at = now()
        WHERE id = $1
        """,
        job_id,
        status,
        progress,
        error_message,
        set_started,
        set_completed,
    )


async def insert_processing_output(db: Any, output: dict[str, Any]) -> None:
    await db.execute(
        """
        INSERT INTO processing_outputs
          (organisation_id, job_id, project_id, mission_id, type, format,
           storage_key, size_bytes, statistics)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
        """,
        output["organisation_id"],
        output["job_id"],
        output["project_id"],
        output["mission_id"],
        output["type"],
        output["format"],
        output["storage_key"],
        output["size_bytes"],
        json.dumps(output.get("statistics")) if output.get("statistics") else None,
    )
