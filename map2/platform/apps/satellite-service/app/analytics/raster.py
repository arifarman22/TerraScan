"""Raster I/O with rasterio — reads source bands and writes Cloud-Optimized
GeoTIFFs (SRS FR-PHOTO-010 / §6.4)."""
from __future__ import annotations

from typing import Any

import numpy as np
import rasterio


def read_raster_bands(
    path: str, band_indices: dict[str, int]
) -> tuple[dict[str, np.ndarray], dict[str, Any]]:
    """Read named bands from a raster. `band_indices` maps role → 1-based band."""
    bands: dict[str, np.ndarray] = {}
    with rasterio.open(path) as dataset:
        profile = dict(dataset.profile)
        for role, index in band_indices.items():
            if index < 1 or index > dataset.count:
                raise ValueError(
                    f"Band {index} for '{role}' is out of range "
                    f"(raster has {dataset.count} bands)"
                )
            bands[role] = dataset.read(index).astype("float64")
    return bands, profile


def write_cog(path: str, array: np.ndarray, source_profile: dict[str, Any]) -> None:
    """Write a single-band float32 Cloud-Optimized GeoTIFF."""
    profile: dict[str, Any] = {
        "driver": "COG",
        "dtype": "float32",
        "count": 1,
        "height": int(array.shape[0]),
        "width": int(array.shape[1]),
        "crs": source_profile.get("crs"),
        "transform": source_profile.get("transform"),
        "compress": "deflate",
    }
    with rasterio.open(path, "w", **profile) as dataset:
        dataset.write(array.astype("float32"), 1)


def raster_stats(array: np.ndarray) -> dict[str, float]:
    finite = array[np.isfinite(array)]
    if finite.size == 0:
        return {"minValue": 0.0, "maxValue": 0.0, "meanValue": 0.0}
    return {
        "minValue": round(float(np.min(finite)), 6),
        "maxValue": round(float(np.max(finite)), 6),
        "meanValue": round(float(np.mean(finite)), 6),
    }
