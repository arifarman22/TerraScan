"""Asynchronous NodeODM REST client (SRS FR-INT-004)."""
from __future__ import annotations

import json
from typing import Any

import httpx

# NodeODM task status codes.
STATUS_QUEUED = 10
STATUS_RUNNING = 20
STATUS_FAILED = 30
STATUS_COMPLETED = 40
STATUS_CANCELED = 50


class NodeODMError(Exception):
    """Raised when NodeODM rejects a request or reports a task failure."""


class NodeODMUnavailableError(Exception):
    """Raised when NodeODM cannot be reached — a transient, retryable error."""


class NodeODMClient:
    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")

    async def info(self) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(f"{self._base_url}/info")
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as error:
            raise NodeODMUnavailableError(str(error)) from error

    async def create_task(
        self,
        image_paths: list[str],
        options: list[dict[str, Any]],
        name: str,
    ) -> str:
        """Create a NodeODM task; returns its UUID."""
        files: list[tuple[str, tuple[str, bytes, str]]] = []
        for path in image_paths:
            with open(path, "rb") as handle:
                files.append(
                    ("images", (path.rsplit("/", 1)[-1], handle.read(), "image/jpeg"))
                )
        data = {"name": name, "options": json.dumps(options)}
        try:
            async with httpx.AsyncClient(timeout=600) as client:
                response = await client.post(
                    f"{self._base_url}/task/new", data=data, files=files
                )
        except httpx.HTTPError as error:
            raise NodeODMUnavailableError(str(error)) from error

        body = response.json()
        if response.status_code != 200 or "uuid" not in body:
            raise NodeODMError(body.get("error", "NodeODM rejected the task"))
        return str(body["uuid"])

    async def task_info(self, uuid: str) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(f"{self._base_url}/task/{uuid}/info")
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as error:
            raise NodeODMUnavailableError(str(error)) from error

    async def download_all(self, uuid: str, dest_path: str) -> None:
        """Download the task's `all.zip` asset bundle."""
        try:
            async with httpx.AsyncClient(timeout=900) as client:
                async with client.stream(
                    "GET", f"{self._base_url}/task/{uuid}/download/all.zip"
                ) as response:
                    response.raise_for_status()
                    with open(dest_path, "wb") as handle:
                        async for chunk in response.aiter_bytes():
                            handle.write(chunk)
        except httpx.HTTPError as error:
            raise NodeODMUnavailableError(str(error)) from error

    async def remove_task(self, uuid: str) -> None:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                await client.post(
                    f"{self._base_url}/task/remove", data={"uuid": uuid}
                )
        except httpx.HTTPError:
            # Best-effort cleanup — never fail the job on a remove error.
            pass
