"""Asynchronous NodeCM REST client.

NodeCM exposes the same API as NodeODM, so this client is structurally
identical but points to the NodeCM service endpoint.
"""
from __future__ import annotations

import json
from typing import Any

import httpx

STATUS_QUEUED = 10
STATUS_RUNNING = 20
STATUS_FAILED = 30
STATUS_COMPLETED = 40
STATUS_CANCELED = 50


class NodeCMError(Exception):
    """Raised when NodeCM rejects a request or reports a task failure."""


class NodeCMUnavailableError(Exception):
    """Raised when NodeCM cannot be reached."""


class NodeCMClient:
    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")

    async def info(self) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(f"{self._base_url}/info")
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as error:
            raise NodeCMUnavailableError(str(error)) from error

    async def create_task(
        self,
        image_paths: list[str],
        options: list[dict[str, Any]],
        name: str,
    ) -> str:
        """Create a NodeCM task; returns its UUID."""
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
            raise NodeCMUnavailableError(str(error)) from error

        body = response.json()
        if response.status_code != 200 or "uuid" not in body:
            raise NodeCMError(body.get("error", "NodeCM rejected the task"))
        return str(body["uuid"])

    async def task_info(self, uuid: str) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(f"{self._base_url}/task/{uuid}/info")
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as error:
            raise NodeCMUnavailableError(str(error)) from error

    async def download_all(self, uuid: str, dest_path: str) -> None:
        """Download the task's all.zip asset bundle."""
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
            raise NodeCMUnavailableError(str(error)) from error

    async def download_asset(self, uuid: str, asset_path: str, dest_path: str) -> None:
        """Download a specific asset from the task."""
        try:
            async with httpx.AsyncClient(timeout=300) as client:
                async with client.stream(
                    "GET", f"{self._base_url}/task/{uuid}/download/{asset_path}"
                ) as response:
                    response.raise_for_status()
                    with open(dest_path, "wb") as handle:
                        async for chunk in response.aiter_bytes():
                            handle.write(chunk)
        except httpx.HTTPError as error:
            raise NodeCMUnavailableError(str(error)) from error

    async def remove_task(self, uuid: str) -> None:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                await client.post(
                    f"{self._base_url}/task/remove", data={"uuid": uuid}
                )
        except httpx.HTTPError:
            pass
