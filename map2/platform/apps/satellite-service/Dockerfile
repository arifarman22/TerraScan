# ============================================================
# Satellite & Analytics Service
# Build context: apps/satellite-service
# rasterio ships manylinux wheels with GDAL bundled, but GDAL still links
# against a few system libraries absent from python:3.13-slim.
# ============================================================
FROM python:3.13-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Runtime libraries required by rasterio's bundled GDAL.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libexpat1 \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN groupadd --system app && useradd --system --gid app app
USER app

EXPOSE 8010
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8010"]
