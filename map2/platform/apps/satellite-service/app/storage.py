"""Object-storage access (MinIO / S3-compatible)."""
from __future__ import annotations

from minio import Minio

from app.config import settings


def make_client() -> Minio:
    return Minio(
        settings.minio_endpoint.strip(),
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_use_ssl,
    )


def download_object(
    client: Minio, bucket: str, object_key: str, dest_path: str
) -> None:
    client.fget_object(bucket, object_key, dest_path)


def upload_object(
    client: Minio,
    bucket: str,
    object_key: str,
    src_path: str,
    content_type: str = "application/octet-stream",
) -> int:
    result = client.fput_object(
        bucket, object_key, src_path, content_type=content_type
    )
    return client.stat_object(bucket, result.object_name).size or 0
