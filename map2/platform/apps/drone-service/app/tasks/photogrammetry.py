"""Photogrammetry orchestration Celery task (SRS §5).

Loads a job, downloads its imagery, runs it through NodeODM while streaming
progress, ingests the outputs, and publishes the terminal job event. Transient
failures (NodeODM unreachable) are retried with exponential backoff; an
engine-reported failure is terminal (SRS FR-JOB-005/006).
"""
from __future__ import annotations

import asyncio
import logging
import os
import tempfile
import time
import zipfile

from app.celery_app import celery_app
from app.config import settings
from app.db import (
    connect,
    get_job,
    get_mission_images,
    insert_processing_output,
    update_job_status,
    update_mission_status,
)
from app.messaging.events import job_completed_event, job_failed_event
from app.messaging.publisher import publish_event
from app.nodeodm.client import (
    STATUS_CANCELED,
    STATUS_COMPLETED,
    STATUS_FAILED,
    NodeODMClient,
    NodeODMError,
    NodeODMUnavailableError,
)
from app.nodeodm.presets import build_odm_options
from app.redis_bus import publish_progress
from app import storage

logger = logging.getLogger("drone.photogrammetry")

# NodeODM progress (0-100) → platform JobStatus, approximating ODM stages.
_PROGRESS_STAGES = [
    (15, "FEATURE_EXTRACTION", "Extracting and matching image features"),
    (45, "POINT_CLOUD_GENERATION", "Reconstructing the dense point cloud"),
    (65, "SURFACE_RECONSTRUCTION", "Building the surface model"),
    (85, "ORTHOMOSAIC_GENERATION", "Generating the orthomosaic"),
    (101, "POST_PROCESSING", "Formatting and writing outputs"),
]

# ODM asset path → (output type, format, content type).
_ASSETS = {
    "odm_orthophoto/odm_orthophoto.tif": ("ORTHOMOSAIC", "GEOTIFF", "image/tiff"),
    "odm_dem/dsm.tif": ("DSM", "GEOTIFF", "image/tiff"),
    "odm_dem/dtm.tif": ("DTM", "GEOTIFF", "image/tiff"),
    "odm_georeferencing/odm_georeferenced_model.laz": (
        "POINT_CLOUD",
        "LAZ",
        "application/octet-stream",
    ),
}


class PhotogrammetryFailure(Exception):
    """A terminal, non-retryable processing failure."""


def _stage_for_progress(progress: float) -> tuple[str, str]:
    for threshold, status, label in _PROGRESS_STAGES:
        if progress < threshold:
            return status, label
    return "POST_PROCESSING", "Formatting and writing outputs"


@celery_app.task(bind=True, name="photogrammetry.run", max_retries=3)
def run_photogrammetry(self, job_id: str) -> None:  # noqa: ANN001
    """Celery entry point — retries transient NodeODM outages."""
    try:
        asyncio.run(_run(job_id))
    except NodeODMUnavailableError as exc:
        countdown = 30 * (2**self.request.retries)
        logger.warning("NodeODM unavailable for job %s — retrying in %ss", job_id, countdown)
        raise self.retry(exc=exc, countdown=countdown)


async def _run(job_id: str) -> None:
    conn = await connect()
    started = time.monotonic()
    workdir = tempfile.mkdtemp(prefix=f"job-{job_id}-")
    job: dict | None = None
    try:
        job = await get_job(conn, job_id)
        if job is None:
            logger.warning("Job %s not found — skipping", job_id)
            return
        org_id = job["organisation_id"]

        await update_job_status(conn, job_id, "INITIALIZING", progress=0, set_started=True)
        await update_mission_status(conn, job["mission_id"], "PROCESSING")
        await _progress(org_id, job_id, "INITIALIZING", 0, "Preparing the processing job")

        images = await get_mission_images(conn, job["mission_id"])
        if not images:
            raise PhotogrammetryFailure("No imagery is available to process")
        if len(images) < 3:
            # NodeODM bails with the unhelpful "Cannot process dataset" — replace
            # with a precise, actionable message before we even try.
            raise PhotogrammetryFailure(
                f"Photogrammetry needs at least 3 overlapping images — this mission has only "
                f"{len(images)}. Drone surveys typically require 20+ images with 70%+ overlap "
                "for a usable orthomosaic."
            )

        image_paths: list[str] = []
        minio_client = storage.make_client()
        for image in images:
            dest = os.path.join(workdir, image["file_name"])
            await asyncio.to_thread(
                storage.download_object,
                minio_client,
                settings.minio_bucket_raw,
                image["storage_key"],
                dest,
            )
            image_paths.append(dest)

        client = NodeODMClient(settings.nodeodm_url)
        options = build_odm_options(job.get("preset"), job.get("config"))
        task_uuid = await client.create_task(image_paths, options, f"job-{job_id}")
        await update_job_status(
            conn, job_id, "FEATURE_EXTRACTION", engine_version=f"NodeODM/{task_uuid}"
        )
        logger.info("Job %s submitted to NodeODM as task %s", job_id, task_uuid)

        while True:
            info = await client.task_info(task_uuid)
            code = int(info.get("status", {}).get("code", 0))
            progress = float(info.get("progress", 0) or 0)

            if code == STATUS_COMPLETED:
                break
            if code in (STATUS_FAILED, STATUS_CANCELED):
                message = info.get("status", {}).get(
                    "errorMessage", "The photogrammetry engine reported a failure"
                )
                raise PhotogrammetryFailure(str(message))

            status, label = _stage_for_progress(progress)
            await update_job_status(conn, job_id, status, progress=int(progress))
            await _progress(org_id, job_id, status, progress, label)
            await asyncio.sleep(5)

        await _progress(org_id, job_id, "POST_PROCESSING", 90, "Ingesting outputs")
        output_types = await _ingest_outputs(conn, client, task_uuid, job, workdir)
        await update_job_status(conn, job_id, "COMPLETE", progress=100, set_completed=True)
        await update_mission_status(conn, job["mission_id"], "COMPLETED")
        await _progress(org_id, job_id, "COMPLETE", 100, "Processing complete")
        await publish_event(
            settings.rabbitmq_url,
            "job.completed",
            job_completed_event(
                org_id, job_id, job["type"], output_types, int(time.monotonic() - started)
            ),
        )
        await client.remove_task(task_uuid)
        logger.info("Job %s completed with outputs: %s", job_id, output_types)

    except PhotogrammetryFailure as failure:
        await _fail(conn, job, job_id, str(failure))
    except NodeODMError as error:
        await _fail(conn, job, job_id, f"NodeODM error: {error}")
    finally:
        await conn.close()
        _cleanup(workdir)


async def _ingest_outputs(
    conn, client: NodeODMClient, task_uuid: str, job: dict, workdir: str
) -> list[str]:
    """Download NodeODM outputs and record them as processing_outputs."""
    archive = os.path.join(workdir, "all.zip")
    await client.download_all(task_uuid, archive)
    extract_dir = os.path.join(workdir, "outputs")
    os.makedirs(extract_dir, exist_ok=True)
    with zipfile.ZipFile(archive) as zip_file:
        zip_file.extractall(extract_dir)

    minio_client = storage.make_client()
    prefix = (
        f"{job['organisation_id']}/{job['workspace_id']}/{job['project_id']}/"
        f"{job['mission_id']}/outputs/job-{job['id']}"
    )
    produced: list[str] = []
    for asset_path, (output_type, fmt, content_type) in _ASSETS.items():
        local_path = os.path.join(extract_dir, asset_path)
        if not os.path.exists(local_path):
            continue
        # NodeODM emits rasters in the local UTM zone; the in-browser COG
        # viewer (MapLibre + cog protocol) only renders Web-Mercator/WGS84.
        # Reproject every raster output to EPSG:3857 before upload.
        if local_path.lower().endswith((".tif", ".tiff")):
            await asyncio.to_thread(_reproject_to_webmercator, local_path)
        object_key = f"{prefix}/{os.path.basename(asset_path)}"
        size = await asyncio.to_thread(
            storage.upload_object,
            minio_client,
            settings.minio_bucket_processed,
            object_key,
            local_path,
            content_type,
        )
        await insert_processing_output(
            conn,
            {
                "organisation_id": job["organisation_id"],
                "job_id": job["id"],
                "project_id": job["project_id"],
                "mission_id": job["mission_id"],
                "type": output_type,
                "format": fmt,
                "storage_key": object_key,
                "size_bytes": size,
            },
        )
        produced.append(output_type)
    return produced


def _reproject_to_webmercator(path: str) -> None:
    """Reproject a GeoTIFF in place to EPSG:3857 as a Cloud-Optimized GeoTIFF.

    The web viewer's COG protocol only renders Web-Mercator / WGS84 sources
    directly; UTM-zoned rasters from NodeODM would still load over HTTP but
    paint outside the visible tile space. Reprojection is in-place: we
    write to a sibling temp file, then atomically replace the original so
    downstream code keeps the same path/key.
    """
    import rasterio  # local import — heavy native dep, defer until needed
    from rasterio.warp import (
        Resampling,
        calculate_default_transform,
        reproject,
    )

    tmp = path + ".webmerc.tif"
    try:
        with rasterio.open(path) as src:
            if src.crs is None or str(src.crs).upper() == "EPSG:3857":
                return  # already Web-Mercator (or unreferenced — leave alone)
            transform, width, height = calculate_default_transform(
                src.crs, "EPSG:3857", src.width, src.height, *src.bounds
            )
            profile = {
                "driver": "COG",
                "dtype": src.dtypes[0],
                "count": src.count,
                "height": height,
                "width": width,
                "crs": "EPSG:3857",
                "transform": transform,
                "compress": "deflate",
            }
            with rasterio.open(tmp, "w", **profile) as dst:
                for band in range(1, src.count + 1):
                    reproject(
                        source=rasterio.band(src, band),
                        destination=rasterio.band(dst, band),
                        src_transform=src.transform,
                        src_crs=src.crs,
                        dst_transform=transform,
                        dst_crs="EPSG:3857",
                        resampling=Resampling.bilinear,
                    )
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass


async def _fail(conn, job: dict | None, job_id: str, message: str) -> None:
    logger.warning("Job %s failed: %s", job_id, message)
    await update_job_status(conn, job_id, "FAILED", error_message=message)
    if job is not None:
        await update_mission_status(conn, job["mission_id"], "FAILED")
        await _progress(job["organisation_id"], job_id, "FAILED", 0, message)
        await publish_event(
            settings.rabbitmq_url,
            "job.failed",
            job_failed_event(
                job["organisation_id"], job_id, job["type"], message, False, 0
            ),
        )


async def _progress(
    org_id: str, job_id: str, status: str, percent: float, label: str
) -> None:
    await publish_progress(
        settings.redis_url,
        {
            "jobId": job_id,
            "organisationId": org_id,
            "status": status,
            "percent": round(percent),
            "stageLabel": label,
        },
    )


def _cleanup(workdir: str) -> None:
    try:
        import shutil

        shutil.rmtree(workdir, ignore_errors=True)
    except Exception:  # noqa: BLE001
        pass
