"""Satellite analytics Celery tasks (SRS §6.4 / §6.5).

`run_spectral_analysis` computes a spectral index over a multi-band scene;
`run_change_detection` produces a bi-temporal change mask. Both write a
Cloud-Optimized GeoTIFF output, record it, and publish the terminal event.
"""
from __future__ import annotations

import asyncio
import logging
import os
import shutil
import tempfile
import time

from app import storage
from app.analytics import change, raster
from app.analytics.indices import compute_index
from app.celery_app import celery_app
from app.config import settings
from app.db import connect, get_job, insert_processing_output, update_job_status
from app.messaging.events import job_completed_event, job_failed_event
from app.messaging.publisher import publish_event
from app.redis_bus import publish_progress

logger = logging.getLogger("satellite.analytics")


class AnalyticsError(Exception):
    """A terminal, non-retryable analytics failure."""


@celery_app.task(name="analytics.spectral")
def run_spectral_analysis(job_id: str) -> None:
    asyncio.run(_run_spectral(job_id))


@celery_app.task(name="analytics.change")
def run_change_detection(job_id: str) -> None:
    asyncio.run(_run_change(job_id))


async def _progress(
    org_id: str, job_id: str, status: str, percent: int, label: str
) -> None:
    await publish_progress(
        settings.redis_url,
        {
            "jobId": job_id,
            "organisationId": org_id,
            "status": status,
            "percent": percent,
            "stageLabel": label,
        },
    )


async def _fail(conn, job: dict | None, job_id: str, message: str) -> None:
    logger.warning("Job %s failed: %s", job_id, message)
    await update_job_status(conn, job_id, "FAILED", error_message=message)
    if job is not None:
        await _progress(job["organisation_id"], job_id, "FAILED", 0, message)
        await publish_event(
            settings.rabbitmq_url,
            "job.failed",
            job_failed_event(job["organisation_id"], job_id, job["type"], message),
        )


async def _run_spectral(job_id: str) -> None:
    conn = await connect()
    workdir = tempfile.mkdtemp(prefix=f"spectral-{job_id}-")
    started = time.monotonic()
    job: dict | None = None
    try:
        job = await get_job(conn, job_id)
        if job is None:
            logger.warning("Job %s not found", job_id)
            return
        org_id = job["organisation_id"]
        config = job.get("config") or {}

        await update_job_status(conn, job_id, "INITIALIZING", progress=5, set_started=True)
        await _progress(org_id, job_id, "INITIALIZING", 5, "Loading scene")

        input_key = config.get("inputKey")
        index_name = str(config.get("index", "NDVI")).upper()
        band_indices = config.get("bands")
        if not input_key or not isinstance(band_indices, dict):
            raise AnalyticsError("Job config must include 'inputKey' and 'bands'")

        client = storage.make_client()
        local_in = os.path.join(workdir, "scene.tif")
        await asyncio.to_thread(
            storage.download_object,
            client,
            settings.minio_bucket_raw,
            input_key,
            local_in,
        )

        await _progress(org_id, job_id, "INITIALIZING", 45, f"Computing {index_name}")
        bands, profile = raster.read_raster_bands(
            local_in, {role: int(idx) for role, idx in band_indices.items()}
        )
        result = compute_index(index_name, bands)
        stats = raster.raster_stats(result)

        local_out = os.path.join(workdir, "index.tif")
        raster.write_cog(local_out, result, profile)

        output_key = (
            f"{org_id}/{job['workspace_id']}/{job['project_id']}/"
            f"{job['mission_id']}/outputs/job-{job_id}/{index_name.lower()}.tif"
        )
        size = await asyncio.to_thread(
            storage.upload_object,
            client,
            settings.minio_bucket_processed,
            output_key,
            local_out,
            "image/tiff",
        )
        await insert_processing_output(
            conn,
            {
                "organisation_id": org_id,
                "job_id": job_id,
                "project_id": job["project_id"],
                "mission_id": job["mission_id"],
                "type": "SPECTRAL_INDEX",
                "format": "COG",
                "storage_key": output_key,
                "size_bytes": size,
                "statistics": stats,
            },
        )

        await update_job_status(conn, job_id, "COMPLETE", progress=100, set_completed=True)
        await _progress(org_id, job_id, "COMPLETE", 100, f"{index_name} ready")
        await publish_event(
            settings.rabbitmq_url,
            "job.completed",
            job_completed_event(
                org_id, job_id, job["type"], ["SPECTRAL_INDEX"],
                int(time.monotonic() - started),
            ),
        )
        logger.info("Job %s produced %s (stats=%s)", job_id, index_name, stats)
    except (AnalyticsError, ValueError) as error:
        await _fail(conn, job, job_id, str(error))
    except Exception as error:  # noqa: BLE001
        await _fail(conn, job, job_id, f"Analytics error: {error}")
    finally:
        await conn.close()
        shutil.rmtree(workdir, ignore_errors=True)


async def _run_change(job_id: str) -> None:
    conn = await connect()
    workdir = tempfile.mkdtemp(prefix=f"change-{job_id}-")
    started = time.monotonic()
    job: dict | None = None
    try:
        job = await get_job(conn, job_id)
        if job is None:
            return
        org_id = job["organisation_id"]
        config = job.get("config") or {}

        await update_job_status(conn, job_id, "INITIALIZING", progress=5, set_started=True)
        await _progress(org_id, job_id, "INITIALIZING", 5, "Loading scenes")

        key_a = config.get("inputKeyA")
        key_b = config.get("inputKeyB")
        band_index = int(config.get("bandIndex", 1))
        threshold = float(config.get("threshold", 0.2))
        if not key_a or not key_b:
            raise AnalyticsError("Change detection requires 'inputKeyA' and 'inputKeyB'")

        client = storage.make_client()
        local_a = os.path.join(workdir, "a.tif")
        local_b = os.path.join(workdir, "b.tif")
        await asyncio.to_thread(
            storage.download_object, client, settings.minio_bucket_raw, key_a, local_a
        )
        await asyncio.to_thread(
            storage.download_object, client, settings.minio_bucket_raw, key_b, local_b
        )

        await _progress(org_id, job_id, "INITIALIZING", 50, "Detecting change")
        bands_a, profile = raster.read_raster_bands(local_a, {"band": band_index})
        bands_b, _ = raster.read_raster_bands(local_b, {"band": band_index})
        delta = change.difference(bands_a["band"], bands_b["band"])
        mask = change.threshold_mask(delta, threshold)
        summary = change.change_summary(delta, threshold)

        local_out = os.path.join(workdir, "change.tif")
        raster.write_cog(local_out, mask.astype("float32"), profile)

        output_key = (
            f"{org_id}/{job['workspace_id']}/{job['project_id']}/"
            f"{job['mission_id']}/outputs/job-{job_id}/change-mask.tif"
        )
        size = await asyncio.to_thread(
            storage.upload_object,
            client,
            settings.minio_bucket_processed,
            output_key,
            local_out,
            "image/tiff",
        )
        await insert_processing_output(
            conn,
            {
                "organisation_id": org_id,
                "job_id": job_id,
                "project_id": job["project_id"],
                "mission_id": job["mission_id"],
                "type": "CHANGE_LAYER",
                "format": "COG",
                "storage_key": output_key,
                "size_bytes": size,
                "statistics": summary,
            },
        )

        await update_job_status(conn, job_id, "COMPLETE", progress=100, set_completed=True)
        await _progress(org_id, job_id, "COMPLETE", 100, "Change layer ready")
        await publish_event(
            settings.rabbitmq_url,
            "job.completed",
            job_completed_event(
                org_id, job_id, job["type"], ["CHANGE_LAYER"],
                int(time.monotonic() - started),
            ),
        )
    except (AnalyticsError, ValueError) as error:
        await _fail(conn, job, job_id, str(error))
    except Exception as error:  # noqa: BLE001
        await _fail(conn, job, job_id, f"Change detection error: {error}")
    finally:
        await conn.close()
        shutil.rmtree(workdir, ignore_errors=True)
