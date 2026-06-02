"""Preset band combinations for visualisation (SRS §6.3)."""
from __future__ import annotations

# Combination name → band roles assigned to the R, G, B render channels.
BAND_COMBINATIONS: dict[str, dict[str, str]] = {
    "TRUE_COLOR": {"r": "red", "g": "green", "b": "blue"},
    "FALSE_COLOR": {"r": "nir", "g": "red", "b": "green"},
    "AGRICULTURE": {"r": "swir1", "g": "nir", "b": "blue"},
    "GEOLOGY": {"r": "swir2", "g": "swir1", "b": "nir"},
    "URBAN": {"r": "swir2", "g": "nir", "b": "red"},
    "ATMOSPHERIC_PENETRATION": {"r": "swir2", "g": "swir1", "b": "red"},
}


def channels_for(combination: str) -> dict[str, str]:
    key = combination.upper()
    if key not in BAND_COMBINATIONS:
        raise ValueError(f"Unknown band combination: {combination}")
    return dict(BAND_COMBINATIONS[key])
