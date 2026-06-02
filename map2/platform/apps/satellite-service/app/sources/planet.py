"""Planet Labs integration (SRS FR-INT-003).

Searches the Planet Data API for commercial high-cadence imagery. The API
key is supplied as the HTTP basic-auth username.
"""
from __future__ import annotations

from typing import Any

import httpx

_QUICK_SEARCH_URL = "https://api.planet.com/data/v1/quick-search"


class PlanetError(Exception):
    """Raised when a Planet API request fails."""


class PlanetClient:
    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    @property
    def configured(self) -> bool:
        return bool(self._api_key)

    async def search(
        self,
        bbox: list[float],
        date_from: str,
        date_to: str,
        max_cloud_cover: float = 1.0,
        item_types: list[str] | None = None,
        limit: int = 25,
    ) -> list[dict[str, Any]]:
        if not self.configured:
            raise PlanetError("Planet API key is not configured")

        west, south, east, north = bbox
        geometry = {
            "type": "Polygon",
            "coordinates": [[
                [west, south], [east, south], [east, north],
                [west, north], [west, south],
            ]],
        }
        search_filter = {
            "type": "AndFilter",
            "config": [
                {"type": "GeometryFilter", "field_name": "geometry", "config": geometry},
                {
                    "type": "DateRangeFilter",
                    "field_name": "acquired",
                    "config": {
                        "gte": f"{date_from}T00:00:00Z",
                        "lte": f"{date_to}T23:59:59Z",
                    },
                },
                {
                    "type": "RangeFilter",
                    "field_name": "cloud_cover",
                    "config": {"lte": max_cloud_cover},
                },
            ],
        }
        body = {
            "item_types": item_types or ["PSScene"],
            "filter": search_filter,
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    _QUICK_SEARCH_URL, json=body, auth=(self._api_key, "")
                )
                response.raise_for_status()
                features = response.json().get("features", [])[:limit]
        except httpx.HTTPError as error:
            raise PlanetError(f"Planet search failed: {error}") from error

        return [
            {
                "id": feature.get("id"),
                "source": "PLANET",
                "acquiredAt": feature.get("properties", {}).get("acquired"),
                "cloudCover": feature.get("properties", {}).get("cloud_cover"),
            }
            for feature in features
        ]
