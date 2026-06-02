"""Bi-temporal change detection (SRS §6.5)."""
from __future__ import annotations

import numpy as np


def difference(earlier: np.ndarray, later: np.ndarray) -> np.ndarray:
    """Signed change between two co-registered single-band rasters."""
    return later.astype("float64") - earlier.astype("float64")


def threshold_mask(change: np.ndarray, threshold: float) -> np.ndarray:
    """Binary mask (1) where the absolute change meets the threshold."""
    return (np.abs(change) >= threshold).astype("uint8")


def change_summary(change: np.ndarray, threshold: float) -> dict[str, float]:
    mask = threshold_mask(change, threshold)
    total = mask.size or 1
    increased = int(np.count_nonzero((change >= threshold)))
    decreased = int(np.count_nonzero((change <= -threshold)))
    return {
        "changedPixels": int(np.count_nonzero(mask)),
        "increasedPixels": increased,
        "decreasedPixels": decreased,
        "changedFraction": round(float(np.count_nonzero(mask)) / total, 6),
    }
