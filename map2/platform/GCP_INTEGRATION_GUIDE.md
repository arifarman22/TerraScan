# NodeCM + COLMAP GCP Integration Guide

## Repositories

- **NodeCM**: https://github.com/uav4geo/NodeCM — COLMAP-based photogrammetry engine (NodeODM-compatible API)
- **COLMAP_GCPs**: https://github.com/lcmrl/COLMAP_GroundControlPoints — GCP triangulation + Helmert transformation

## Pipeline Flow

```
Drone Images + GCP Data
        │
        ▼
┌──────────────────────┐
│ NodeCM / COLMAP      │  Reconstruction
│ Output: sparse model │  (cameras.txt, images.txt, points3D.txt)
│       + orthomosaic  │
│       + point cloud  │
│       + DSM/DTM      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ COLMAP GCP Correction│  Post-processing
│ Input: sparse model  │
│      + GCP coords    │
│      + GCP pixel pos │
│ Output: Helmert      │
│   transformation     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Apply Transformation │  Final step
│ → Corrected ortho    │
│ → Corrected DSM      │
│ → Corrected PC       │
│ → Accuracy report    │
└──────────────────────┘
```

## Server Requirements

| Resource | Minimum |
|----------|---------|
| RAM | 16 GB |
| CPU | 4+ cores |
| Disk | 50 GB SSD |
| GPU | Optional (speeds up 10x) |

## Step 1: Set Up COLMAP

Use the official COLMAP Docker image (avoids building from source):

```bash
docker pull colmap/colmap:latest
```

Or build NodeCM (requires fixing the outdated Dockerfile — see Issues section below).

## Step 2: COLMAP Reconstruction Pipeline

Run these COLMAP commands sequentially on the uploaded images:

```bash
# Feature extraction
colmap feature_extractor --database_path db.db --image_path ./images

# Feature matching
colmap exhaustive_matcher --database_path db.db

# Sparse reconstruction
colmap mapper --database_path db.db --image_path ./images --output_path ./sparse

# Dense reconstruction (optional, for point cloud)
colmap image_undistorter --image_path ./images --input_path ./sparse/0 --output_path ./dense
colmap patch_match_stereo --workspace_path ./dense
colmap stereo_fusion --workspace_path ./dense --output_path ./dense/fused.ply
```

Output: `./sparse/0/cameras.txt`, `./sparse/0/images.txt`, `./sparse/0/points3D.txt`

## Step 3: GCP Correction

### Input Files Required from User

**ground_truth.csv** — surveyed GCP coordinates:
```
gcp1,456789.12,2345678.45,45.67
gcp2,456790.23,2345679.56,46.78
gcp3,456791.34,2345680.67,47.89
```

**projections/<image_name>.txt** — pixel coordinates of GCPs in each image:
```
gcp1 1234.5 567.8
gcp2 2345.6 678.9
```

### Run GCP Correction

```bash
python main.py \
  -i "./images" \
  -e ".jpg" \
  -p "./projections" \
  -s "./sparse/0" \
  -g "./ground_truth.csv" \
  -c "/path/to/colmap" \
  -a "./AlignCC_for_linux"
```

Output: Helmert transformation parameters (scale, rotation, translation) + accuracy report (RMSE).

## Step 4: Apply Transformation to Outputs

Apply the computed transformation to:
- **Orthomosaic** (GeoTIFF) — adjust georeferencing bounds
- **Point cloud** (LAZ/LAS) — transform every XYZ coordinate
- **DSM/DTM** (GeoTIFF) — adjust georeferencing bounds

This is already implemented in: `apps/drone-service/app/gcp_correction/__init__.py`

## Step 5: Docker Compose Service

Add to `docker-compose.yml`:

```yaml
nodecm:
  image: colmap/colmap:latest  # or uav4geo/nodecm if built
  container_name: platform-nodecm
  restart: unless-stopped
  ports:
    - "3002:3000"
  volumes:
    - nodecm_data:/data
  networks:
    - platform_net
```

## Step 6: Environment Variables

Add to `.env`:
```
NODECM_URL=http://nodecm:3000
NODECM_PORT=3002
```

## Known Issues with NodeCM

NodeCM's repo is outdated (last updated 2020). To build it:

1. Replace base image: `nvidia/cuda:10.2-devel-ubuntu16.04` → `ubuntu:22.04`
2. Replace Node.js 10 → Node.js 18
3. Replace Python 2 → Python 3
4. Add `ln -sf /usr/bin/python3 /usr/bin/python`
5. Build COLMAP from source with `-DCUDA_ENABLED=OFF` for CPU-only
6. Update NodeODM submodule to latest version

**Easier alternative**: Skip NodeCM entirely. Use `colmap/colmap:latest` Docker image + a Python wrapper script that calls COLMAP CLI commands and exposes the same REST API.

## Files Already Implemented in TerraScan

| File | Purpose |
|------|---------|
| `apps/drone-service/app/nodecm/__init__.py` | NodeCM API client |
| `apps/drone-service/app/gcp_correction/__init__.py` | GCP correction (Helmert + DLT triangulation) |
| `apps/drone-service/app/tasks/gcp_photogrammetry.py` | Celery task orchestrating the full pipeline |
| `apps/drone-service/app/messaging/consumer.py` | Dispatches `GCP_PHOTOGRAMMETRY` jobs |
| `packages/shared-types/src/job.ts` | `GCP_PHOTOGRAMMETRY` enum value |
| `apps/host-shell/src/components/job-launcher.tsx` | UI for mode selection + GCP upload |
| `demo_gcp/` | Sample GCP data for testing |

## Testing Checklist

- [ ] COLMAP Docker image running and accessible
- [ ] Upload images to a mission
- [ ] Upload ground_truth.csv + projection files via UI
- [ ] Launch GCP-corrected job
- [ ] Verify reconstruction completes
- [ ] Verify GCP correction applies (check RMSE in output)
- [ ] Verify corrected outputs visible in map viewer
