# Updating NodeCM + COLMAP GCP for TerraScan

## Why NodeCM Doesn't Work Currently

NodeCM was last updated in 2020. It uses:
- Ubuntu 16.04 (EOL)
- NVIDIA CUDA 10.2 base image (removed from Docker Hub)
- Node.js 10 (EOL)
- Python 2 (EOL)
- COLMAP commit from 2019
- Ceres Solver 1.14 (old)
- OpenCV 3.4.6 (old)
- PDAL 2.1 (old)

All of these need to be updated for the project to build and run.

---

## NodeCM Architecture (What It Does)

```
NodeCM/
├── NodeODM/          # Git submodule — REST API server (Node.js)
│                     # Exposes /task/new, /task/{id}/info, /task/{id}/download
│                     # This is the web interface + API layer
│
├── run.py            # Main pipeline orchestrator (Python)
│                     # Calls each stage sequentially
│
├── stages/           # Pipeline stages (Python)
│   ├── dataset.py    # Load images, read EXIF GPS
│   ├── colmap.py     # Feature extraction, matching, sparse & dense reconstruction
│   ├── georeferencing.py  # Apply GPS-based georeferencing
│   ├── dem.py        # Generate DSM/DTM from point cloud
│   ├── mesh.py       # Surface mesh from point cloud
│   ├── mvstex.py     # Texture the mesh
│   └── ortho.py      # Generate orthophoto from mesh
│
├── app/              # Helper utilities
│   ├── colmap.py     # COLMAP CLI wrapper + georegistration extraction
│   ├── geo.py        # Coordinate transformations
│   ├── orthophoto.py # Ortho generation helpers
│   └── fs.py         # File system utilities
│
├── opendm/           # Shared library (borrowed from OpenDroneMap)
│   ├── config.py     # CLI argument parsing
│   ├── photo.py      # EXIF reading
│   ├── gpu.py        # GPU detection
│   ├── stage.py      # Stage base class
│   ├── system.py     # Shell command execution
│   └── progress.py   # Progress reporting to NodeODM
│
├── modules/          # C++ external projects (CMakeLists.txt)
│                     # Builds: dem2mesh, mvs-texturing
│
├── CMakeLists.txt    # Builds COLMAP + all C++ dependencies from source
├── Dockerfile        # Docker build (BROKEN — needs updating)
├── requirements.txt  # Python dependencies (Python 2 versions)
└── nodecm            # Shell script entry point
```

### How NodeODM Integrates

NodeODM (the submodule) is a Node.js server that:
1. Accepts image uploads via REST API (`POST /task/new`)
2. Saves images to a task directory
3. Calls `run.py` (the Python pipeline) as a child process
4. Monitors progress via stdout parsing
5. Serves results via `GET /task/{id}/download/all.zip`

NodeCM replaces OpenDroneMap's processing with COLMAP-based processing while keeping the same NodeODM API interface.

---

## What Needs to Be Updated

### 1. Dockerfile (Complete Rewrite)

| Component | Current | Update To |
|-----------|---------|-----------|
| Base image | `nvidia/cuda:10.2-devel-ubuntu16.04` | `ubuntu:22.04` |
| Node.js | 10 | 18 or 20 |
| Python | 2.7 | 3.10+ |
| COLMAP | Commit from 2019 | 3.9.1 (latest stable) |
| Ceres Solver | 1.14 | 2.2 |
| PDAL | 2.1 | 2.6+ |
| OpenCV | 3.4.6 | 4.8+ |
| CMake | 3.18 | 3.27+ |

### 2. Python Code (Python 2 → Python 3)

Files to update:
- `run.py` — `from pipes import quote` → `from shlex import quote`
- `requirements.txt` — update all package versions
- `stages/*.py` — fix any Python 2 syntax (print statements, string handling)
- `app/*.py` — same
- `opendm/*.py` — same

### 3. CMakeLists.txt (Dependency Updates)

The main CMakeLists.txt builds everything from source. Update:
- COLMAP: use tag `3.9.1` instead of old commit hash
- Ceres: use `2.2.0` URL
- PDAL: use `2.6.0`
- OpenCV: use `4.8.0`
- Remove PCL (not needed for basic pipeline)
- Add `-DCUDA_ENABLED=OFF` option for CPU-only builds

### 4. NodeODM Submodule

Update to latest NodeODM:
```bash
cd NodeODM
git checkout master
git pull
```

### 5. requirements.txt (Python Dependencies)

```
# Updated for Python 3.10+
utm
Pillow>=10.0
exifread>=3.0
pytz>=2023.3
xmltodict>=0.13
beautifulsoup4>=4.12
lxml>=4.9
pyproj>=3.6
psutil>=5.9
numpy>=1.24
```

---

## Step-by-Step Implementation Plan

### Phase 1: Fix the Dockerfile (Day 1-2)

```dockerfile
FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive

# System dependencies
RUN apt-get update && apt-get install -y \
    nodejs npm \
    python3 python3-pip \
    git build-essential cmake \
    libboost-all-dev libeigen3-dev libsuitesparse-dev \
    libfreeimage-dev libgoogle-glog-dev libgflags-dev \
    libglew-dev libatlas-base-dev libsqlite3-dev \
    libcgal-dev libflann-dev \
    gdal-bin libgdal-dev python3-gdal \
    exiftool wget curl \
    && ln -sf /usr/bin/python3 /usr/bin/python

# Build Ceres Solver 2.2
RUN git clone --branch 2.2.0 --depth 1 https://github.com/ceres-solver/ceres-solver /tmp/ceres && \
    cd /tmp/ceres && mkdir build && cd build && \
    cmake .. -DBUILD_EXAMPLES=OFF -DBUILD_TESTING=OFF && \
    make -j$(nproc) && make install && rm -rf /tmp/ceres

# Build COLMAP 3.9.1 (CPU only)
RUN git clone --branch 3.9.1 --depth 1 https://github.com/colmap/colmap /tmp/colmap && \
    cd /tmp/colmap && mkdir build && cd build && \
    cmake .. -DCUDA_ENABLED=OFF -DGUI_ENABLED=OFF -DCMAKE_BUILD_TYPE=Release && \
    make -j$(nproc) && make install && rm -rf /tmp/colmap

# Build PDAL
RUN git clone --branch 2.6.0 --depth 1 https://github.com/PDAL/PDAL /tmp/pdal && \
    cd /tmp/pdal && mkdir build && cd build && \
    cmake .. -DWITH_TESTS=OFF -DCMAKE_BUILD_TYPE=Release && \
    make -j$(nproc) && make install && rm -rf /tmp/pdal

# Build dem2mesh
RUN git clone https://github.com/OpenDroneMap/dem2mesh /tmp/dem2mesh && \
    cd /tmp/dem2mesh && make -j$(nproc) && \
    cp dem2mesh /usr/local/bin/ && rm -rf /tmp/dem2mesh

# Copy project
ADD . /app
WORKDIR /app

# Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# NodeODM
RUN cd NodeODM && npm install

# Symlinks and cleanup
RUN ldconfig && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app/NodeODM
EXPOSE 3000
ENTRYPOINT ["node", "index.js", "--odm_path", "/app"]
```

### Phase 2: Fix Python Code (Day 2-3)

**run.py** — Change line 2:
```python
# Old
from pipes import quote
# New
from shlex import quote
```

**requirements.txt** — Replace entirely:
```
utm
Pillow>=10.0
exifread>=3.0
pytz>=2023.3
xmltodict>=0.13
beautifulsoup4>=4.12
lxml>=4.9
pyproj>=3.6
psutil>=5.9
numpy>=1.24
```

**All .py files** — Run a Python 2→3 conversion:
```bash
# Inside the container or locally with Python 3
2to3 -w run.py stages/ app/ opendm/
```

Key changes to look for:
- `print "text"` → `print("text")`
- `except Exception, e:` → `except Exception as e:`
- `dict.iteritems()` → `dict.items()`
- `unicode` → `str`
- `raw_input` → `input`

### Phase 3: Fix CMakeLists.txt for Modules (Day 3)

Replace the entire `CMakeLists.txt` with a minimal version that only builds what's needed (dem2mesh and mvs-texturing), since COLMAP is now installed via the Dockerfile:

```cmake
cmake_minimum_required(VERSION 3.16)
project(nodecm_modules)

include(ExternalProject)

ExternalProject_Add(dem2mesh
    GIT_REPOSITORY https://github.com/OpenDroneMap/dem2mesh.git
    GIT_TAG master
    BUILD_IN_SOURCE 1
    BUILD_COMMAND make -j${nproc}
    INSTALL_COMMAND cp <SOURCE_DIR>/dem2mesh /usr/local/bin/
    CONFIGURE_COMMAND ""
)

ExternalProject_Add(mvs-texturing
    GIT_REPOSITORY https://github.com/OpenDroneMap/mvs-texturing
    GIT_TAG master
    CMAKE_ARGS -DRESEARCH=OFF -DCMAKE_BUILD_TYPE=Release
)
```

### Phase 4: Update NodeODM Submodule (Day 3)

```bash
cd NodeCM
git submodule update --init
cd NodeODM
git checkout master
git pull origin master
npm install
```

If NodeODM's latest version has breaking changes with NodeCM's integration, pin to a known working tag:
```bash
git checkout v2.4.0  # or latest stable
```

### Phase 5: Add GCP Support to the Pipeline (Day 4-5)

NodeCM's README explicitly lists "GCPs support" as a TODO. Add it by:

1. **Create `stages/gcp.py`** — a new stage that runs after `sparse` and before `georegister`:

```python
from opendm.stage import Stage
from opendm import log

class GCPStage(Stage):
    def process(self, args, outputs):
        if not args.gcp_file:
            log.ODM_INFO("No GCP file provided, skipping GCP correction")
            return

        # Run COLMAP_GroundControlPoints logic here
        # 1. Read sparse model from outputs["sparse_dir"]
        # 2. Read GCP projections + ground truth
        # 3. Triangulate GCPs
        # 4. Compute Helmert transformation
        # 5. Apply to sparse model
        # 6. Write corrected model back

        log.ODM_INFO("GCP correction applied successfully")
```

2. **Add GCP arguments to `opendm/config.py`**:
```python
parser.add_argument('--gcp-file', type=str, default=None,
                    help='Path to GCP ground truth file (CSV: id,x,y,z)')
parser.add_argument('--gcp-projections', type=str, default=None,
                    help='Path to folder with GCP projection files')
```

3. **Insert GCP stage in `run.py`**:
```python
from stages.gcp import GCPStage

gcp = GCPStage('gcp', args, progress=31.0)

# Pipeline with GCP
dataset.connect(features) \
    .connect(matching) \
    .connect(sparse) \
    .connect(gcp) \        # <-- NEW: GCP correction before georegister
    .connect(georegister) \
    .connect(dense) \
    .connect(georeferencing) \
    .connect(dem) \
    .connect(mesh) \
    .connect(texture) \
    .connect(ortho)
```

### Phase 6: Integrate COLMAP_GCPs Logic (Day 5-6)

Copy the core logic from `COLMAP_GroundControlPoints/main.py` into `stages/gcp.py`:

1. Read `cameras.txt` and `images.txt` from sparse model
2. Read GCP projection files (pixel coordinates per image)
3. Create a new COLMAP database with GCP observations as keypoints
4. Run `colmap point_triangulator` to triangulate GCPs
5. Run the AlignCC tool (or implement Helmert in Python) to compute transformation
6. Apply transformation to the sparse model

The Python implementation is already in your project at:
`apps/drone-service/app/gcp_correction/__init__.py`

You can reuse `compute_helmert_transformation()` and `run_gcp_correction()` directly.

### Phase 7: Build and Test (Day 6-7)

```bash
cd NodeCM
docker build -t uav4geo/nodecm:updated .
docker run --rm -p 3002:3000 uav4geo/nodecm:updated
```

Test with sample images:
```bash
# Upload images via API
curl -X POST http://localhost:3002/task/new \
  -F "images=@DJI_0001.jpg" \
  -F "images=@DJI_0002.jpg" \
  -F "images=@DJI_0003.jpg" \
  -F 'options=[{"name":"orthophoto-resolution","value":5}]'
```

### Phase 8: Connect to TerraScan (Day 7)

Once NodeCM is running, update `.env`:
```
NODECM_URL=http://nodecm:3002
```

Update `docker-compose.yml` to use the new image:
```yaml
nodecm:
  image: uav4geo/nodecm:updated
  container_name: platform-nodecm
  ports:
    - "3002:3000"
  volumes:
    - nodecm_data:/app/NodeODM/data
  networks:
    - platform_net
```

The existing `gcp_photogrammetry.py` Celery task will work with NodeCM since it uses the same NodeODM-compatible API.

---

## Summary of Changes

| File/Component | Action | Effort |
|---------------|--------|--------|
| `Dockerfile` | Complete rewrite | 1 day |
| `requirements.txt` | Update all versions | 30 min |
| `run.py` | Fix Python 2→3 imports | 30 min |
| `stages/*.py` | Run 2to3, fix issues | 1 day |
| `app/*.py` | Run 2to3, fix issues | 1 day |
| `opendm/*.py` | Run 2to3, fix issues | 1 day |
| `CMakeLists.txt` | Simplify (COLMAP from Dockerfile) | 2 hours |
| `NodeODM/` | Update submodule | 1 hour |
| `stages/gcp.py` | New file — GCP correction stage | 1 day |
| `opendm/config.py` | Add GCP CLI arguments | 30 min |
| Testing | Build, run, debug | 2 days |

**Total estimated effort: 7-10 days**

---

## Server Requirements for Building

Building NodeCM (compiling COLMAP + Ceres from source) requires:
- 8 GB RAM minimum (for compilation)
- 20 GB disk space
- 30-60 minutes build time

Running NodeCM for processing requires:
- 16 GB RAM minimum
- 4+ CPU cores
- 50 GB disk for processing workspace

---

## Alternative: Skip NodeCM, Use COLMAP Directly

If updating NodeCM is too much effort, you can:

1. Use `colmap/colmap:latest` Docker image (pre-built, works immediately)
2. Write a Python wrapper that calls COLMAP CLI commands
3. Expose it as a REST API (FastAPI) with the same endpoints as NodeODM
4. This avoids all the NodeCM legacy code issues

Estimated effort for this approach: **3-5 days** (faster than fixing NodeCM).
