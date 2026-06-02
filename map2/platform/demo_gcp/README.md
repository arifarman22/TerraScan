# Demo GCP Data

This folder contains simulated Ground Control Point data for testing the
GCP-corrected processing pipeline.

## Files

### ground_truth.csv
Real-world coordinates of 5 GCPs (simulated RTK GPS measurements).
Format: `gcp_id,longitude,latitude,elevation_meters`

### projections/
One text file per drone image. Each file contains the pixel coordinates
where GCP targets are visible in that image.
Format: `gcp_id pixel_x pixel_y`

## GCP Layout

```
gcp4 (north-west)     gcp2 (north-center)     gcp5 (north-east)
        ·                    ·                       ·


gcp1 (south-west)                             gcp3 (south-east)
        ·                                           ·
```

## How to Test

1. Open the app at http://localhost:3100
2. Go to a mission with uploaded images
3. Click "Launch Job"
4. Select "GCP-Corrected Processing"
5. Upload `ground_truth.csv` as the ground truth file
6. Upload all files from `projections/` as the projection files
7. Launch the job

## Note

This is DEMO data with simulated pixel coordinates. In production,
pixel coordinates must be manually measured from the actual images
using a GCP marking tool.
