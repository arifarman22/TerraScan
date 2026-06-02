"""Spectral index computation (SRS §6.4).

Each index is a normalised band-math expression. Band reflectance arrays are
supplied keyed by role (`red`, `nir`, `green`, `blue`, `swir1`, `swir2`).
"""
from __future__ import annotations

from typing import Callable

import numpy as np

BandMap = dict[str, np.ndarray]


def _ratio(numerator: np.ndarray, denominator: np.ndarray) -> np.ndarray:
    """Element-wise divide, yielding 0 where the denominator is 0."""
    numerator = numerator.astype("float64")
    denominator = denominator.astype("float64")
    return np.divide(
        numerator,
        denominator,
        out=np.zeros_like(numerator),
        where=denominator != 0,
    )


def ndvi(bands: BandMap) -> np.ndarray:
    nir, red = bands["nir"], bands["red"]
    return _ratio(nir - red, nir + red)


def ndwi(bands: BandMap) -> np.ndarray:
    green, nir = bands["green"], bands["nir"]
    return _ratio(green - nir, green + nir)


def ndbi(bands: BandMap) -> np.ndarray:
    swir1, nir = bands["swir1"], bands["nir"]
    return _ratio(swir1 - nir, swir1 + nir)


def evi(bands: BandMap) -> np.ndarray:
    nir, red, blue = bands["nir"], bands["red"], bands["blue"]
    return 2.5 * _ratio(nir - red, nir + 6.0 * red - 7.5 * blue + 1.0)


def savi(bands: BandMap, soil_factor: float = 0.5) -> np.ndarray:
    nir, red = bands["nir"], bands["red"]
    return (1.0 + soil_factor) * _ratio(nir - red, nir + red + soil_factor)


def nbr(bands: BandMap) -> np.ndarray:
    nir, swir2 = bands["nir"], bands["swir2"]
    return _ratio(nir - swir2, nir + swir2)


def ndsi(bands: BandMap) -> np.ndarray:
    green, swir1 = bands["green"], bands["swir1"]
    return _ratio(green - swir1, green + swir1)


def bsi(bands: BandMap) -> np.ndarray:
    swir1, red = bands["swir1"], bands["red"]
    nir, blue = bands["nir"], bands["blue"]
    return _ratio((swir1 + red) - (nir + blue), (swir1 + red) + (nir + blue))


# index name → (function, required band roles, value range, description)
INDEX_REGISTRY: dict[str, dict[str, object]] = {
    "NDVI": {"fn": ndvi, "bands": ["nir", "red"], "range": [-1, 1],
             "description": "Normalized Difference Vegetation Index"},
    "NDWI": {"fn": ndwi, "bands": ["green", "nir"], "range": [-1, 1],
             "description": "Normalized Difference Water Index"},
    "NDBI": {"fn": ndbi, "bands": ["swir1", "nir"], "range": [-1, 1],
             "description": "Normalized Difference Built-Up Index"},
    "EVI": {"fn": evi, "bands": ["nir", "red", "blue"], "range": [-1, 1],
            "description": "Enhanced Vegetation Index"},
    "SAVI": {"fn": savi, "bands": ["nir", "red"], "range": [-1, 1],
             "description": "Soil-Adjusted Vegetation Index"},
    "NBR": {"fn": nbr, "bands": ["nir", "swir2"], "range": [-1, 1],
            "description": "Normalized Burn Ratio"},
    "NDSI": {"fn": ndsi, "bands": ["green", "swir1"], "range": [-1, 1],
             "description": "Normalized Difference Snow Index"},
    "BSI": {"fn": bsi, "bands": ["swir1", "red", "nir", "blue"], "range": [-1, 1],
            "description": "Bare Soil Index"},
}


def required_bands(index_name: str) -> list[str]:
    entry = INDEX_REGISTRY.get(index_name.upper())
    if entry is None:
        raise ValueError(f"Unknown spectral index: {index_name}")
    return list(entry["bands"])  # type: ignore[arg-type]


def compute_index(index_name: str, bands: BandMap) -> np.ndarray:
    """Compute a spectral index, validating the required bands are present."""
    name = index_name.upper()
    entry = INDEX_REGISTRY.get(name)
    if entry is None:
        raise ValueError(f"Unknown spectral index: {index_name}")
    missing = [b for b in entry["bands"] if b not in bands]  # type: ignore[union-attr]
    if missing:
        raise ValueError(
            f"{name} requires bands {entry['bands']}; missing: {missing}"
        )
    compute: Callable[[BandMap], np.ndarray] = entry["fn"]  # type: ignore[assignment]
    return compute(bands)
