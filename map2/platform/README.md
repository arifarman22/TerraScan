# Enterprise Drone & Satellite Image Processing Platform

Multi-tenant SaaS for ingesting, processing, and visualising drone and satellite
imagery. Implements **SRS v2.0** (see `../srs.md`).

## Monorepo layout

| Path | Description | Phase |
|---|---|---|
| `apps/host-shell` | Next.js 16 — routing, auth shell, Module Federation host | 4 |
| `apps/mfe-dashboard` | React 19 MFE — projects, uploads, jobs | 4 |
| `apps/mfe-viewer` | React 19 MFE — deck.gl + MapLibre geospatial viewer | 5 |
| `apps/core-service` | NestJS 11 — auth, RBAC, tenants, projects, metering | 1 |
| `apps/drone-service` | FastAPI — photogrammetry, NodeODM orchestration | 2 |
| `apps/satellite-service` | FastAPI — Sentinel/GEE/Planet, spectral analytics | 3 |
| `packages/shared-types` | TypeScript domain types shared across all apps | 0 |
| `packages/shared-ui` | Design-system components | 4 |
| `packages/geo-utils` | Shared GDAL/projection utilities | 2 |
| `infra/` | docker-compose stacks, Kubernetes manifests | 0 |

## Prerequisites

- Node.js 24 LTS · npm 11
- Python 3.13
- Docker Engine 24+ with Compose v2

## Quick start

```bash
cp .env.example .env        # then fill in real values
npm install
npm run infra:up            # postgres, redis, rabbitmq, minio, nodeodm
npm run infra:ps            # confirm every service reports (healthy)
npm run build               # build shared packages
```

## Infrastructure endpoints (local)

| Service | Endpoint |
|---|---|
| PostgreSQL + PostGIS | `localhost:5432` |
| Redis | `localhost:6379` |
| RabbitMQ (AMQP) | `localhost:5672` |
| RabbitMQ Management UI | http://localhost:15672 |
| MinIO API | http://localhost:9000 |
| MinIO Console | http://localhost:9001 |
| NodeODM | http://localhost:3000 |

## Build phases

The platform is delivered in eight phases (0–7) per the SRS. This repository
currently contains **Phase 0 — scaffold & infrastructure**.

## Security baseline

- All secrets live in `.env` (git-ignored); only `.env.example` is committed.
- Object-storage buckets are created **private** — no anonymous access.
- `infra/docker-compose.prod.yml` removes public ports for internal services
  and requires strong credentials (SRS NFR-SEC-008, NFR-SEC-013).
