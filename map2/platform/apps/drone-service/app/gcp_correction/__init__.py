"""GCP Correction module — applies Helmert transformation to COLMAP outputs.

Implements the logic from https://github.com/lcmrl/COLMAP_GroundControlPoints
to triangulate GCPs in a COLMAP sparse model and compute a 3D similarity
transformation (Helmert: scale + rotation + translation) to align the
reconstruction with real-world survey coordinates.
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from typing import Any

import numpy as np

logger = logging.getLogger("drone.gcp_correction")


@dataclass
class GCPResult:
    """Result of GCP correction."""
    transformation_matrix: np.ndarray  # 4x4 similarity transform
    scale: float
    rmse: float  # Root mean square error in ground units
    residuals: list[dict[str, Any]]  # Per-GCP residuals
    num_gcps_used: int


@dataclass
class GCPPoint:
    """A single Ground Control Point."""
    id: str
    x: float  # Easting or longitude
    y: float  # Northing or latitude
    z: float  # Elevation


@dataclass
class GCPProjection:
    """A GCP's pixel projection in an image."""
    gcp_id: str
    image_name: str
    pixel_x: float
    pixel_y: float


def parse_gcp_file(gcp_file_path: str) -> list[GCPPoint]:
    """Parse ground truth GCP file (CSV: id,x,y,z)."""
    gcps = []
    with open(gcp_file_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split(",")
            if len(parts) >= 4:
                gcps.append(GCPPoint(
                    id=parts[0].strip(),
                    x=float(parts[1]),
                    y=float(parts[2]),
                    z=float(parts[3]),
                ))
    return gcps


def parse_projections_folder(projections_dir: str, delimiter: str = " ") -> list[GCPProjection]:
    """Parse GCP projections from per-image text files.

    Each file is named <image_name>.txt and contains lines:
        gcp_id pixel_x pixel_y
    """
    projections = []
    for filename in os.listdir(projections_dir):
        if not filename.endswith(".txt"):
            continue
        image_name = filename[:-4]  # Remove .txt
        filepath = os.path.join(projections_dir, filename)
        with open(filepath, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split(delimiter)
                if len(parts) >= 3:
                    projections.append(GCPProjection(
                        gcp_id=parts[0].strip(),
                        image_name=image_name,
                        pixel_x=float(parts[1]),
                        pixel_y=float(parts[2]),
                    ))
    return projections


def compute_helmert_transformation(
    source_points: np.ndarray,
    target_points: np.ndarray,
) -> tuple[np.ndarray, float, float]:
    """Compute 3D Helmert (7-parameter similarity) transformation.

    Args:
        source_points: Nx3 array of points in COLMAP coordinate system
        target_points: Nx3 array of corresponding points in ground truth

    Returns:
        (4x4 transformation matrix, scale factor, RMSE)
    """
    assert source_points.shape == target_points.shape
    n = source_points.shape[0]

    # Centroids
    src_centroid = source_points.mean(axis=0)
    tgt_centroid = target_points.mean(axis=0)

    # Center the points
    src_centered = source_points - src_centroid
    tgt_centered = target_points - tgt_centroid

    # Scale
    src_scale = np.sqrt((src_centered ** 2).sum() / n)
    tgt_scale = np.sqrt((tgt_centered ** 2).sum() / n)
    scale = tgt_scale / src_scale if src_scale > 0 else 1.0

    # Rotation via SVD
    H = src_centered.T @ tgt_centered
    U, S, Vt = np.linalg.svd(H)
    d = np.linalg.det(Vt.T @ U.T)
    sign_matrix = np.diag([1, 1, d])
    R = Vt.T @ sign_matrix @ U.T

    # Translation
    t = tgt_centroid - scale * R @ src_centroid

    # Build 4x4 matrix
    T = np.eye(4)
    T[:3, :3] = scale * R
    T[:3, 3] = t

    # Compute RMSE
    transformed = (scale * (R @ source_points.T)).T + t
    residuals = target_points - transformed
    rmse = np.sqrt((residuals ** 2).sum() / n)

    return T, scale, rmse


def apply_transformation_to_point_cloud(
    input_path: str,
    output_path: str,
    transform: np.ndarray,
) -> None:
    """Apply a 4x4 transformation matrix to a LAZ/LAS point cloud."""
    import rasterio
    # Use laspy if available, otherwise skip
    try:
        import laspy
    except ImportError:
        logger.warning("laspy not installed — skipping point cloud transformation")
        shutil.copy(input_path, output_path)
        return

    las = laspy.read(input_path)
    points = np.vstack([las.x, las.y, las.z]).T

    # Apply transformation
    R = transform[:3, :3]
    t = transform[:3, 3]
    transformed = (R @ points.T).T + t

    las.x = transformed[:, 0]
    las.y = transformed[:, 1]
    las.z = transformed[:, 2]
    las.write(output_path)


def apply_transformation_to_geotiff(
    input_path: str,
    output_path: str,
    transform: np.ndarray,
    target_crs: str = "EPSG:4326",
) -> None:
    """Apply transformation to a GeoTIFF by adjusting its georeferencing.

    For rasters, we transform the corner coordinates and recompute the
    affine transform rather than reprojecting every pixel.
    """
    import rasterio
    from rasterio.transform import from_bounds

    with rasterio.open(input_path) as src:
        bounds = src.bounds
        corners = np.array([
            [bounds.left, bounds.bottom, 0],
            [bounds.right, bounds.bottom, 0],
            [bounds.right, bounds.top, 0],
            [bounds.left, bounds.top, 0],
        ])

        R = transform[:3, :3]
        t = transform[:3, 3]
        transformed_corners = (R @ corners.T).T + t

        new_left = transformed_corners[:, 0].min()
        new_right = transformed_corners[:, 0].max()
        new_bottom = transformed_corners[:, 1].min()
        new_top = transformed_corners[:, 1].max()

        new_transform = from_bounds(
            new_left, new_bottom, new_right, new_top,
            src.width, src.height
        )

        profile = src.profile.copy()
        profile.update({
            "transform": new_transform,
            "crs": target_crs,
        })

        data = src.read()
        with rasterio.open(output_path, "w", **profile) as dst:
            dst.write(data)


def run_gcp_correction(
    sparse_model_dir: str,
    images_dir: str,
    projections_dir: str,
    ground_truth_path: str,
    colmap_exe: str = "colmap",
    projection_delimiter: str = " ",
    image_extension: str = ".jpg",
) -> GCPResult:
    """Run the full GCP correction pipeline.

    1. Read COLMAP sparse model
    2. Triangulate GCPs using their image projections
    3. Compute Helmert transformation from COLMAP coords to ground truth
    4. Return transformation parameters

    Args:
        sparse_model_dir: Path to COLMAP sparse model (cameras.txt, images.txt, points3D.txt)
        images_dir: Path to original images
        projections_dir: Path to GCP projection files (one per image)
        ground_truth_path: Path to ground truth CSV (id,x,y,z)
        colmap_exe: Path to COLMAP executable
        projection_delimiter: Delimiter in projection files
        image_extension: Image file extension

    Returns:
        GCPResult with transformation and accuracy metrics
    """
    # Parse inputs
    ground_truth = parse_gcp_file(ground_truth_path)
    gt_dict = {gcp.id: gcp for gcp in ground_truth}

    projections = parse_projections_folder(projections_dir, projection_delimiter)

    # Group projections by GCP
    gcp_projections: dict[str, list[GCPProjection]] = {}
    for proj in projections:
        gcp_projections.setdefault(proj.gcp_id, []).append(proj)

    # Read images.txt to get camera poses
    images_file = os.path.join(sparse_model_dir, "images.txt")
    image_poses: dict[str, dict] = {}
    with open(images_file, "r") as f:
        lines = [l.strip() for l in f.readlines() if l.strip() and not l.startswith("#")]
        for i in range(0, len(lines), 2):
            parts = lines[i].split()
            if len(parts) >= 10:
                name = parts[9]
                image_poses[name] = {
                    "id": int(parts[0]),
                    "qw": float(parts[1]), "qx": float(parts[2]),
                    "qy": float(parts[3]), "qz": float(parts[4]),
                    "tx": float(parts[5]), "ty": float(parts[6]),
                    "tz": float(parts[7]),
                    "camera_id": int(parts[8]),
                }

    # Read cameras.txt
    cameras_file = os.path.join(sparse_model_dir, "cameras.txt")
    cameras: dict[int, dict] = {}
    with open(cameras_file, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            cam_id = int(parts[0])
            cameras[cam_id] = {
                "model": parts[1],
                "width": int(parts[2]),
                "height": int(parts[3]),
                "params": [float(p) for p in parts[4:]],
            }

    # Triangulate GCPs using DLT (Direct Linear Transform)
    colmap_gcp_coords: dict[str, np.ndarray] = {}

    for gcp_id, projs in gcp_projections.items():
        if len(projs) < 2:
            logger.warning("GCP %s has < 2 projections, skipping", gcp_id)
            continue

        # Build projection matrices and triangulate
        A = []
        for proj in projs:
            img_name_with_ext = proj.image_name + image_extension
            if img_name_with_ext not in image_poses:
                # Try without extension
                if proj.image_name not in image_poses:
                    continue
                pose = image_poses[proj.image_name]
            else:
                pose = image_poses[img_name_with_ext]

            cam = cameras[pose["camera_id"]]
            params = cam["params"]

            # Build rotation matrix from quaternion
            qw, qx, qy, qz = pose["qw"], pose["qx"], pose["qy"], pose["qz"]
            R = np.array([
                [1 - 2*(qy**2 + qz**2), 2*(qx*qy - qz*qw), 2*(qx*qz + qy*qw)],
                [2*(qx*qy + qz*qw), 1 - 2*(qx**2 + qz**2), 2*(qy*qz - qx*qw)],
                [2*(qx*qz - qy*qw), 2*(qy*qz + qx*qw), 1 - 2*(qx**2 + qy**2)],
            ])
            t = np.array([pose["tx"], pose["ty"], pose["tz"]])

            # Camera intrinsics (assuming PINHOLE or SIMPLE_PINHOLE)
            if cam["model"] in ("SIMPLE_PINHOLE", "SIMPLE_RADIAL"):
                fx = fy = params[0]
                cx, cy = params[1], params[2]
            elif cam["model"] in ("PINHOLE", "RADIAL"):
                fx, fy = params[0], params[1]
                cx, cy = params[2], params[3]
            else:
                fx = fy = params[0]
                cx, cy = params[1], params[2]

            K = np.array([[fx, 0, cx], [0, fy, cy], [0, 0, 1]])
            P = K @ np.hstack([R, t.reshape(3, 1)])

            # DLT equations
            x, y = proj.pixel_x, proj.pixel_y
            A.append(x * P[2] - P[0])
            A.append(y * P[2] - P[1])

        if len(A) < 4:
            continue

        A = np.array(A)
        _, _, Vt = np.linalg.svd(A)
        X = Vt[-1]
        X = X[:3] / X[3]  # Homogeneous to 3D
        colmap_gcp_coords[gcp_id] = X

    # Match triangulated GCPs with ground truth
    common_ids = set(colmap_gcp_coords.keys()) & set(gt_dict.keys())
    if len(common_ids) < 3:
        raise ValueError(
            f"Need at least 3 common GCPs for Helmert transformation, "
            f"found {len(common_ids)}: {common_ids}"
        )

    source_pts = np.array([colmap_gcp_coords[gid] for gid in sorted(common_ids)])
    target_pts = np.array([[gt_dict[gid].x, gt_dict[gid].y, gt_dict[gid].z] for gid in sorted(common_ids)])

    # Compute transformation
    T, scale, rmse = compute_helmert_transformation(source_pts, target_pts)

    # Per-GCP residuals
    residuals = []
    R_mat = T[:3, :3]
    t_vec = T[:3, 3]
    for gid in sorted(common_ids):
        src = colmap_gcp_coords[gid]
        tgt = np.array([gt_dict[gid].x, gt_dict[gid].y, gt_dict[gid].z])
        transformed = R_mat @ src + t_vec
        error = np.linalg.norm(tgt - transformed)
        residuals.append({
            "gcp_id": gid,
            "ground_truth": {"x": tgt[0], "y": tgt[1], "z": tgt[2]},
            "computed": {"x": transformed[0], "y": transformed[1], "z": transformed[2]},
            "error_m": float(error),
        })

    return GCPResult(
        transformation_matrix=T,
        scale=scale,
        rmse=rmse,
        residuals=residuals,
        num_gcps_used=len(common_ids),
    )
