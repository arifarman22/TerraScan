"""SentinelHub / Copernicus Data Space integration (SRS FR-INT-001).

Authenticates with the OAuth2 client-credentials grant and searches the
STAC Catalog API for available scenes.
"""
from __future__ import annotations

from typing import Any

import httpx


class SentinelHubError(Exception):
    """Raised when SentinelHub authentication or search fails."""


class SentinelHubClient:
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        token_url: str,
        catalog_url: str,
    ) -> None:
        self._client_id = client_id
        self._client_secret = client_secret
        self._token_url = token_url
        self._catalog_url = catalog_url

    @property
    def configured(self) -> bool:
        return bool(self._client_id and self._client_secret)

    async def _access_token(self) -> str:
        if not self.configured:
            raise SentinelHubError("SentinelHub credentials are not configured")
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    self._token_url,
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self._client_id,
                        "client_secret": self._client_secret,
                    },
                )
                response.raise_for_status()
                return str(response.json()["access_token"])
        except httpx.HTTPError as error:
            raise SentinelHubError(f"OAuth2 token request failed: {error}") from error

    async def search(
        self,
        bbox: list[float],
        date_from: str,
        date_to: str,
        max_cloud_cover: float = 100.0,
        collection: str = "sentinel-2-l2a",
        limit: int = 25,
    ) -> list[dict[str, Any]]:
        """Search the Catalog API; returns simplified scene descriptors."""
        token = await self._access_token()
        body = {
            "collections": [collection],
            "bbox": bbox,
            "datetime": f"{date_from}T00:00:00Z/{date_to}T23:59:59Z",
            "limit": limit,
            "filter": {
                "op": "<=",
                "args": [{"property": "eo:cloud_cover"}, max_cloud_cover],
            },
            "filter-lang": "cql2-json",
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    self._catalog_url,
                    json=body,
                    headers={"Authorization": f"Bearer {token}"},
                )
                response.raise_for_status()
                features = response.json().get("features", [])
        except httpx.HTTPError as error:
            raise SentinelHubError(f"Catalog search failed: {error}") from error

        return [
            {
                "id": feature.get("id"),
                "source": "SENTINEL_HUB",
                "collection": collection,
                "acquiredAt": feature.get("properties", {}).get("datetime"),
                "cloudCover": feature.get("properties", {}).get("eo:cloud_cover"),
                "bbox": feature.get("bbox"),
            }
            for feature in features
        ]
