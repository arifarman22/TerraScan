"""Quality preset → NodeODM/ODM option mapping (SRS FR-PHOTO-002 / §5.1.1).

Each preset is a balance of reconstruction quality against processing time.
The job's output selection adds DSM/DTM/point-cloud classification options.
"""
from __future__ import annotations

from typing import Any

# Base ODM options per quality preset.
_PRESET_OPTIONS: dict[str, dict[str, Any]] = {
    "DRAFT": {
        "feature-quality": "low",
        "pc-quality": "low",
        "mesh-size": 100000,
        "min-num-features": 8000,
        "orthophoto-resolution": 20,
        "fast-orthophoto": True,
    },
    "STANDARD": {
        "feature-quality": "medium",
        "pc-quality": "medium",
        "mesh-size": 200000,
        "min-num-features": 10000,
        "orthophoto-resolution": 5,
    },
    "HIGH": {
        "feature-quality": "high",
        "pc-quality": "high",
        "mesh-size": 300000,
        "min-num-features": 12000,
        "orthophoto-resolution": 2,
    },
    "ULTRA": {
        "feature-quality": "ultra",
        "pc-quality": "ultra",
        "mesh-size": 600000,
        "min-num-features": 15000,
        "orthophoto-resolution": 1,
    },
}

DEFAULT_PRESET = "DRAFT"


def options_dict_for_preset(preset: str | None) -> dict[str, Any]:
    """Return the raw option dictionary for a preset (used for inspection)."""
    return dict(_PRESET_OPTIONS.get((preset or DEFAULT_PRESET).upper(), _PRESET_OPTIONS[DEFAULT_PRESET]))


def build_odm_options(
    preset: str | None, config: dict[str, Any] | None
) -> list[dict[str, Any]]:
    """Build the NodeODM `options` array from a preset and job config."""
    options = options_dict_for_preset(preset)

    outputs = (config or {}).get("outputs", {})
    if isinstance(outputs, dict):
        if outputs.get("dsm"):
            options["dsm"] = True
        if outputs.get("dtm"):
            options["dtm"] = True
        if outputs.get("pointCloud"):
            options["pc-classify"] = True
        if outputs.get("mesh3d") is False:
            options["skip-3dmodel"] = True

    crs = (config or {}).get("crs")
    # NodeODM expects EPSG codes via a PROJ string when supplied.
    if isinstance(crs, int) and crs > 0:
        options["crs"] = f"EPSG:{crs}"

    # NodeODM's /task/new expects an array of {name, value} entries.
    return [{"name": name, "value": value} for name, value in options.items()]
