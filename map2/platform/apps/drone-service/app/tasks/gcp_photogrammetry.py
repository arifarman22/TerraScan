"""GCP-Corrected Photogrammetry task — NodeCM + COLMAP GCP Correction.

Runs NodeCM for reconstruction, then applies GCP correction using
Helmert transformation for cm-level georeferencing accuracy.
"""
from __future__ import annotations

import asyncio
import logging
import os
import shutil
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
from app.gcp_correction import (
    apply_transformation_to_geotiff,
    apply_transformation_to_point_cloud,
    run_gcp_correction,
)
from app.messaging.events import job_completed_event, job_failed_event
from app.messaging.publisher import publish_event
from app.nodecm import (
    STATUS_CANCELED,
    STATUS_COMPLETED,
    STATUS_FAILED,
    NodeCMClient,
    NodeCMError,
    NodeCMUnavailableError,
)
from app.nodeodm.client import (
    STATUS_CANCELED as ODM_STATUS_CANCELED,
    STATUS_COMPLETED as ODM_STATUS_COMPLETED,
    STATUS_FAILED as ODM_STATUS_FAILED,
    NodeODMClient,
    NodeODMError,
    NodeODMUnavailableError,
)
from app.redis_bus import publish_progress
from app import storage

logger = logging.getLogger("drone.gcp_photogrammetry")

# NodeCM assets to extract and correct
_ASSETS = {
    "odm_orthophoto/odm_orthophoto.tif": ("ORTHOMOSAIC", "GEOTIFF", "image/tiff"),
    "odm_dem/dsm.tif": ("DSM", "GEOTIFF", "image/tiff"),
    "odm_dem/dtm.tif": ("DTM", "GEOTIFF", "image/tiff"),
    "odm_georeferencing/odm_georeferenced_model.laz": (
        "POINT_CLOUD", "LAZ", "application/octet-stream",
    ),
}


class GCPProcessingFailure(Exception):
    """Terminal processing failure."""


@celery_app.task(bind=True, name="photogrammetry.run_gcp", max_retries=3)
def run_gcp_photogrammetry(self, job_id: str) -> None:
    """Celery entry point for GCP-corrected photogrammetry."""
    try:
        asyncio.run(_run(job_id))
    except NodeODMUnavailableError as exc:
        countdown = 30 * (2 ** self.request.retries)
        logger.warning("Engine unavailable for job %s — retrying in %ss", job_id, countdown)
        raise self.retry(exc=exc, countdown=countdown)


async def _run(job_id: str) -> None:
    conn = await connect()
    started = time.monotonic()
    workdir = tempfile.mkdtemp(prefix=f"gcp-job-{job_id}-")
    job: dict | None = None
    try:
        job = await get_job(conn, job_id)
        if job is None:
            logger.warning("Job %s not found — skipping", job_id)
            return
        org_id = job["organisation_id"]
        config = job.get("config") or {}

        await update_job_status(conn, job_id, "INITIALIZING", progress=0, set_started=True)
        await update_mission_status(conn, job["mission_id"], "PROCESSING")
        await _progress(org_id, job_id, "INITIALIZING", 0, "Preparing GCP-corrected processing")

        # Validate GCP data exists in job config
        gcp_ground_truth = config.get("gcpGroundTruth")
        gcp_projections = config.get("gcpProjections")
        if not gcp_ground_truth or not gcp_projections:
            raise GCPProcessingFailure(
                "GCP-corrected processing requires ground truth coordinates and "
                "image projections. Please upload GCP data before launching this job."
            )

        # Download images
        images = await get_mission_images(conn, job["mission_id"])
        if not images:
            raise GCPProcessingFailure("No imagery available to process")
        if len(images) < 3:
            raise GCPProcessingFailure(
                f"Need at least 3 images, this mission has only {len(images)}."
            )

        await _progress(org_id, job_id, "INITIALIZING", 5, "Downloading images")
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

        # --- STEP 1: Run reconstruction (try NodeCM, fallback to NodeODM) ---
        await _progress(org_id, job_id, "FEATURE_EXTRACTION", 10, "Submitting to processing engine")

        # Use NodeODM as the reconstruction engine (NodeCM fallback)
        client = NodeODMClient(settings.nodeodm_url)
        options = [
            {"name": "orthophoto-resolution", "value": 5},
            {"name": "pc-quality", "value": "medium"},
            {"name": "feature-quality", "value": "medium"},
            {"name": "min-num-features", "value": 10000},
        ]
        task_uuid = await client.create_task(image_paths, options, f"gcp-job-{job_id}")
        await update_job_status(
            conn, job_id, "FEATURE_EXTRACTION", engine_version=f"NodeODM-GCP/{task_uuid}"
        )
        logger.info("Job %s submitted to NodeODM for GCP pipeline as task %s", job_id, task_uuid)

        # Poll for completion
        while True:
            info = await client.task_info(task_uuid)
            code = int(info.get("status", {}).get("code", 0))
            progress = float(info.get("progress", 0) or 0)

            if code == ODM_STATUS_COMPLETED:
                break
            if code in (ODM_STATUS_FAILED, ODM_STATUS_CANCELED):
                message = info.get("status", {}).get(
                    "errorMessage", "Processing engine reported a failure"
                )
                raise GCPProcessingFailure(str(message))

            # Map progress 0-100 to our 10-60 range
            mapped_progress = 10 + (progress * 0.5)
            await update_job_status(conn, job_id, "POINT_CLOUD_GENERATION", progress=int(mapped_progress))
            await _progress(org_id, job_id, "POINT_CLOUD_GENERATION", mapped_progress,
                          f"NodeCM processing: {int(progress)}%")
            await asyncio.sleep(5)

        # --- STEP 2: Download NodeCM outputs ---
        await _progress(org_id, job_id, "SURFACE_RECONSTRUCTION", 62, "Downloading reconstruction outputs")

        archive = os.path.join(workdir, "all.zip")
        await client.download_all(task_uuid, archive)
        extract_dir = os.path.join(workdir, "outputs")
        os.makedirs(extract_dir, exist_ok=True)
        with zipfile.ZipFile(archive) as zf:
            zf.extractall(extract_dir)

        # --- STEP 3: Prepare GCP data ---
        await _progress(org_id, job_id, "SURFACE_RECONSTRUCTION", 65, "Preparing GCP correction data")

        # Write ground truth file
        gt_path = os.path.join(workdir, "ground_truth.txt")
        with open(gt_path, "w") as f:
            for gcp in gcp_ground_truth:
                f.write(f"{gcp['id']},{gcp['x']},{gcp['y']},{gcp['z']}\n")

        # Write projection files (one per image)
        proj_dir = os.path.join(workdir, "projections")
        os.makedirs(proj_dir, exist_ok=True)
        for img_name, projs in gcp_projections.items():
            proj_path = os.path.join(proj_dir, f"{img_name}.txt")
            with open(proj_path, "w") as f:
                for proj in projs:
                    f.write(f"{proj['id']} {proj['x']} {proj['y']}\n")

        # Locate sparse model from NodeCM output
        sparse_dir = None
        for candidate in [
            os.path.join(extract_dir, "odm_georeferencing"),
            os.path.join(extract_dir, "opensfm", "undistorted", "reconstruction.json"),
            os.path.join(extract_dir, "colmap_sparse"),
            os.path.join(extract_dir, "sparse"),
        ]:
            if os.path.exists(candidate):
                sparse_dir = candidate
                break

        if not sparse_dir:
            # Look for cameras.txt anywhere in the output
            for root, dirs, files in os.walk(extract_dir):
                if "cameras.txt" in files and "images.txt" in files:
                    sparse_dir = root
                    break

        if not sparse_dir:
            raise GCPProcessingFailure(
                "Could not find COLMAP sparse model in NodeCM output. "
                "GCP correction requires the sparse reconstruction."
            )

        # --- STEP 4: Run GCP correction ---
        await _progress(org_id, job_id, "ORTHOMOSAIC_GENERATION", 70, "Running GCP correction (Helmert transformation)")

        images_dir = os.path.join(workdir, "images_for_gcp")
        os.makedirs(images_dir, exist_ok=True)
        for p in image_paths:
            shutil.copy(p, images_dir)

        gcp_result = await asyncio.to_thread(
            run_gcp_correction,
            sparse_model_dir=sparse_dir,
            images_dir=images_dir,
            projections_dir=proj_dir,
            ground_truth_path=gt_path,
        )

        logger.info(
            "Job %s GCP correction: %d GCPs used, RMSE=%.4f, scale=%.6f",
            job_id, gcp_result.num_gcps_used, gcp_result.rmse, gcp_result.scale,
        )

        # --- STEP 5: Apply transformation to outputs ---
        await _progress(org_id, job_id, "POST_PROCESSING", 80, "Applying GCP correction to outputs")

        corrected_dir = os.path.join(workdir, "corrected")
        os.makedirs(corrected_dir, exist_ok=True)

        prefix = (
            f"{job['organisation_id']}/{job['workspace_id']}/{job['project_id']}/"
            f"{job['mission_id']}/outputs/job-{job['id']}"
        )
        produced: list[str] = []

        for asset_path, (output_type, fmt, content_type) in _ASSETS.items():
            local_path = os.path.join(extract_dir, asset_path)
            if not os.path.exists(local_path):
                continue

            corrected_path = os.path.join(corrected_dir, os.path.basename(asset_path))

            # Apply transformation
            if local_path.endswith((".tif", ".tiff")):
                await asyncio.to_thread(
                    apply_transformation_to_geotiff,
                    local_path, corrected_path,
                    gcp_result.transformation_matrix,
                )
            elif local_path.endswith((".laz", ".las")):
                await asyncio.to_thread(
                    apply_transformation_to_point_cloud,
                    local_path, corrected_path,
                    gcp_result.transformation_matrix,
                )
            else:
                shutil.copy(local_path, corrected_path)

            # Upload corrected output
            object_key = f"{prefix}/{os.path.basename(asset_path)}"
            size = await asyncio.to_thread(
                storage.upload_object,
                minio_client,
                settings.minio_bucket_processed,
                object_key,
                corrected_path,
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
                    "statistics": {
                        "gcp_correction": {
                            "num_gcps": gcp_result.num_gcps_used,
                            "rmse_m": gcp_result.rmse,
                            "scale": gcp_result.scale,
                            "residuals": gcp_result.residuals,
                        }
                    },
                },
            )
            produced.append(output_type)

        # --- Done ---
        await update_job_status(conn, job_id, "COMPLETE", progress=100, set_completed=True)
        await update_mission_status(conn, job["mission_id"], "COMPLETED")
        await _progress(org_id, job_id, "COMPLETE", 100,
                       f"GCP-corrected processing complete (RMSE: {gcp_result.rmse:.3f}m, {gcp_result.num_gcps_used} GCPs)")
        await publish_event(
            settings.rabbitmq_url,
            "job.completed",
            job_completed_event(
                org_id, job_id, job["type"], produced, int(time.monotonic() - started)
            ),
        )
        await client.remove_task(task_uuid)
        logger.info("Job %s GCP-corrected processing completed: %s", job_id, produced)

    except GCPProcessingFailure as failure:
        await _fail(conn, job, job_id, str(failure))
    except (NodeODMError, NodeCMError) as error:
        await _fail(conn, job, job_id, f"Processing error: {error}")
    except NodeODMUnavailableError as exc:
        raise exc
    except Exception as exc:
        await _fail(conn, job, job_id, f"Unexpected error: {exc}")
        raise
    finally:
        await conn.close()
        _cleanup(workdir)


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
        shutil.rmtree(workdir, ignore_errors=True)
    except Exception:
        pass
