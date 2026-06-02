# Developer Report — Enterprise Drone & Satellite Image Processing Platform

**Date:** May 2026  
**Status:** Phase 0 Complete (Scaffold & Infrastructure)  
**Target:** Production-ready, client-deliverable SaaS platform  

---

## Executive Summary

The project has a solid architectural foundation — monorepo tooling, Docker infrastructure, inter-service communication, database schema with Row-Level Security, authentication system, and service skeletons are all wired up and building successfully. However, the platform is at **~25% completion** relative to what's needed for a client-ready product. This report details every remaining work item organized by phase, priority, and estimated effort.

---

## 1. Current State Assessment

### ✅ What's Done (Phase 0)

| Component | Status | Notes |
|---|---|---|
| Monorepo (Turborepo + npm workspaces) | ✅ Complete | Builds successfully with Webpack |
| Shared types package | ✅ Complete | Domain types for all entities |
| Docker Compose (dev) | ✅ Complete | PostgreSQL, Redis, RabbitMQ, MinIO, NodeODM |
| Docker Compose (prod overlay) | ✅ Complete | Resource limits, port isolation, Redis auth |
| Database schema + migrations | ✅ Complete | 5 migrations, RLS, least-privilege role |
| Core Service (NestJS) scaffold | ✅ Complete | Auth, RBAC, tenants, projects, uploads, jobs, audit, metrics |
| Drone Service (FastAPI) scaffold | ✅ Complete | RabbitMQ consumer, NodeODM client, Celery tasks |
| Satellite Service (FastAPI) scaffold | ✅ Complete | SentinelHub, Planet clients, spectral indices |
| Host Shell (Next.js 16) | ✅ Complete | Auth middleware, pages, components, geo-viewer |
| Authentication system | ✅ Complete | Register, login, MFA (TOTP), session management, JWT rotation |
| RBAC system | ✅ Complete | Permission resolution, caching, guard |
| Upload system | ✅ Complete | Chunked, resumable, SHA-256 verification, direct-to-storage |
| Geospatial viewer | ✅ Complete | MapLibre + deck.gl, raster layers, point cloud (LAZ decode + UTM reproject) |

### 🟡 What's Partially Done

| Component | Status | Missing |
|---|---|---|
| Photogrammetry pipeline | 70% | End-to-end job execution, output post-processing (COG tiling) |
| Satellite analytics pipeline | 60% | Actual raster computation tasks, GEE integration, change detection |
| Job monitoring (WebSocket) | 70% | Real-time progress from Celery workers to browser needs testing |
| API key system | 80% | Rate limiting enforcement per key |
| Audit logging | 80% | Immutability enforcement in prod, retention policy |

### ❌ What's Not Started

| Component | SRS Section |
|---|---|
| Module Federation (MFE-1 Dashboard, MFE-2 Viewer as remotes) | §3.1 |
| Enterprise SSO (SAML 2.0, OIDC, SCIM) | §5.2 |
| Custom roles | §6.1 FR-RBAC-004 |
| GCP file upload and association | §8.2 FR-IMG-010/011 |
| Volume calculations | §9.3 FR-PHOTO-015 |
| Bi-temporal change detection | §10.2 FR-SAT-006 |
| 3D terrain draping, sun simulation | §11.1 FR-VIEW-005 |
| 4D temporal analysis (timeline, playback) | §11.2 FR-VIEW-007 |
| Measurement tools | §11.2 FR-VIEW-008 |
| Annotations system | §11.2 FR-VIEW-009 |
| Swipe comparison tool | §11.2 FR-VIEW-010 |
| ML/CV features (detection, segmentation, thermal) | §12 |
| PDF report generation | §13 FR-EXP-003 |
| Export with crop/reproject/resample | §13 FR-EXP-002 |
| Webhooks | §18 FR-API-004 |
| Subscription/quota enforcement | §16 |
| Data retention & soft-delete | §15 FR-DATA-007/009 |
| Organisation data export (portability) | §15 FR-DATA-008 |
| Kubernetes manifests (full) | §19 |
| Observability (structured logging, tracing, alerting) | §19.7 |
| Secrets management integration | NFR-SEC-006 |
| TLS everywhere | NFR-SEC-001 |
| Penetration testing | NFR-SEC-005 |
| GDPR compliance (erasure, data inventory) | §19.6 |
| Accessibility (WCAG 2.1 AA) | §19.9 |
| Automated test suite | §20 |

---

## 2. Development Phases & Task Breakdown

### Phase 1 — Core Service Completion (Est. 3–4 weeks)

| # | Task | Priority | Effort |
|---|---|---|---|
| 1.1 | **Password reset flow** — email link, single-use token, session invalidation (FR-AUTH-008) | Must | 2d |
| 1.2 | **Security notification emails** — new device, password change, MFA change (FR-AUTH-009) | Should | 2d |
| 1.3 | **Enterprise SSO** — SAML 2.0 + OIDC federation, JIT provisioning (FR-AUTH-010) | Must | 5d |
| 1.4 | **SCIM 2.0 provisioning** — user sync from IdP (FR-AUTH-011) | Should | 3d |
| 1.5 | **Custom roles** — admin creates roles from permission catalogue (FR-RBAC-004) | Should | 2d |
| 1.6 | **Project sharing** — share with users or external reviewer link (FR-RBAC-007) | Must | 2d |
| 1.7 | **Organisation lifecycle** — suspend/close with cascading access changes (FR-TEN-008) | Must | 2d |
| 1.8 | **Subscription plan enforcement** — storage quota, concurrent jobs, seat limits (FR-SUB-001–004) | Must | 3d |
| 1.9 | **Rate limiting** — per API key and per org, HTTP 429 + Retry-After (FR-SUB-006) | Must | 2d |
| 1.10 | **Usage metering** — storage, processing minutes, API calls, exposed to billing (FR-SUB-002/005) | Must | 3d |
| 1.11 | **Webhook system** — outbound signed payloads on job events (FR-API-004) | Should | 2d |
| 1.12 | **Data retention** — soft-delete recycle bin, configurable retention, org data purge (FR-DATA-007/009) | Must | 3d |
| 1.13 | **Full data export** — org-level archive for portability (FR-DATA-008) | Must | 2d |

### Phase 2 — Drone Photogrammetry Pipeline (Est. 3 weeks)

| # | Task | Priority | Effort |
|---|---|---|---|
| 2.1 | **End-to-end job execution** — download images from MinIO → NodeODM → poll status → collect outputs | Must | 3d |
| 2.2 | **Output post-processing** — convert NodeODM outputs to COG (with overviews), 3D Tiles, LAZ | Must | 4d |
| 2.3 | **Progress reporting** — Celery task → Redis pub/sub → Core Service WebSocket → browser | Must | 2d |
| 2.4 | **Job retry & failure handling** — auto-retry on node failure, partial output delivery (FR-JOB-005/006) | Must | 2d |
| 2.5 | **GCP integration** — parse CSV/DXF, pass to NodeODM as GCP file (FR-IMG-010/011) | Should | 2d |
| 2.6 | **Exclusion zones** — pass drawn polygons as NodeODM boundary (FR-PHOTO-005) | Should | 1d |
| 2.7 | **Volume calculations** — compute fill/cut/total from DSM + base plane, generate PDF (FR-PHOTO-015) | Should | 3d |
| 2.8 | **Contour generation** — extract contour lines from DSM at user-defined intervals | Should | 2d |
| 2.9 | **Output versioning** — each re-run creates a new version, prior versions retained (FR-DATA-004) | Must | 1d |

### Phase 3 — Satellite & Analytics Pipeline (Est. 3 weeks)

| # | Task | Priority | Effort |
|---|---|---|---|
| 3.1 | **Scene download & storage** — download selected scenes to MinIO, track provenance | Must | 2d |
| 3.2 | **Band combination rendering** — apply preset/custom band mapping, produce preview PNG/COG | Must | 3d |
| 3.3 | **Spectral index computation** — run index math on raster, output single-band COG with colour ramp | Must | 3d |
| 3.4 | **Google Earth Engine integration** — service account auth, on-demand computation (FR-INT-002) | Must | 3d |
| 3.5 | **Bi-temporal change detection** — band diff, index diff, NDVI delta with threshold (FR-SAT-006) | Should | 3d |
| 3.6 | **Planet Labs full integration** — scene search + download for entitled orgs (FR-INT-003) | Should | 2d |
| 3.7 | **Circuit breaker & retry** — timeout, backoff, circuit breaking on external sources (FR-INT-007) | Should | 2d |

### Phase 4 — Frontend: Dashboard & Workspace (Est. 3–4 weeks)

| # | Task | Priority | Effort |
|---|---|---|---|
| 4.1 | **Module Federation setup** — host-shell loads MFE-1 (dashboard) and MFE-2 (viewer) as remotes | Must | 3d |
| 4.2 | **Organisation settings UI** — members, roles, SSO config, billing view | Must | 3d |
| 4.3 | **Workspace management** — create, rename, archive, member assignment | Must | 2d |
| 4.4 | **Project dashboard** — card/list view, search, filter, status indicators | Must | 2d |
| 4.5 | **Mission management** — create, image library view, GPS footprint map, statistics | Must | 3d |
| 4.6 | **Job launcher** — guided setup, quality presets, output toggles, CRS picker | Must | 2d |
| 4.7 | **Jobs dashboard** — all jobs, status, progress, ETA, cancel/retry actions | Must | 2d |
| 4.8 | **Notification system** — in-app banners, toast, optional email preferences | Must | 2d |
| 4.9 | **Storage meter** — per-project and org-level usage vs quota | Must | 1d |
| 4.10 | **Responsive design** — mobile-friendly layouts for non-viewer pages | Should | 2d |

### Phase 5 — Geospatial Viewer Enhancements (Est. 4 weeks)

| # | Task | Priority | Effort |
|---|---|---|---|
| 5.1 | **3D terrain draping** — orthomosaic over DSM, vertical exaggeration (FR-VIEW-005) | Must | 4d |
| 5.2 | **Sun/shadow simulation** — date/time/location lighting (FR-VIEW-005) | Should | 3d |
| 5.3 | **Measurement tools** — distance, area, elevation query, terrain profile, volume (FR-VIEW-008) | Must | 5d |
| 5.4 | **Annotations** — point, line, polygon, text, photo pins; save, export GeoJSON/KML (FR-VIEW-009) | Must | 4d |
| 5.5 | **Swipe comparison** — draggable divider between two layers/dates (FR-VIEW-010) | Must | 2d |
| 5.6 | **4D temporal analysis** — timeline slider, animated playback, side-by-side (FR-VIEW-007) | Should | 4d |
| 5.7 | **COG streaming** — tile-by-tile HTTP range-request loading for large orthomosaics | Must | 3d |
| 5.8 | **Contour overlay** — render contour lines at user-defined intervals (FR-VIEW-005) | Should | 1d |

### Phase 6 — Machine Learning & Computer Vision (Est. 3 weeks)

| # | Task | Priority | Effort |
|---|---|---|---|
| 6.1 | **Object detection** — run pre-trained model on orthomosaic, output bounding boxes (FR-ML-001) | Should | 4d |
| 6.2 | **Land-cover segmentation** — classify pixels into standard classes, output raster + stats (FR-ML-002) | Should | 4d |
| 6.3 | **Thermal analysis** — calibrated temperature map, hot-spot detection (FR-ML-004) | Should | 3d |
| 6.4 | **Anomaly detection** — flag zones changed vs historical norms (FR-ML-003) | Could | 3d |
| 6.5 | **Model versioning** — record model name/version on every ML output (FR-ML-005) | Must | 1d |

### Phase 7 — Production Hardening & DevOps (Est. 4–5 weeks)

| # | Task | Priority | Effort |
|---|---|---|---|
| 7.1 | **Secrets management** — integrate HashiCorp Vault or AWS Secrets Manager; remove all plaintext secrets | Must | 3d |
| 7.2 | **TLS everywhere** — terminate at gateway, internal mTLS, wss:// WebSocket (NFR-SEC-001) | Must | 2d |
| 7.3 | **Kubernetes manifests** — Deployments, Services, HPA, Ingress, NetworkPolicy, ExternalSecrets | Must | 5d |
| 7.4 | **CI/CD pipeline** — build, lint, test, SAST, dependency scan, container scan, deploy | Must | 3d |
| 7.5 | **Structured logging** — JSON logs, correlation ID propagation, no secrets in logs (NFR-OBS-001) | Must | 2d |
| 7.6 | **Metrics & dashboards** — Prometheus + Grafana, request rate, latency, queue depth (NFR-OBS-002) | Must | 2d |
| 7.7 | **Distributed tracing** — OpenTelemetry across gateway → services → workers (NFR-OBS-003) | Should | 2d |
| 7.8 | **Alerting** — SLA breach, error rate, queue backlog, storage pressure (NFR-OBS-004) | Must | 2d |
| 7.9 | **Backup & DR** — automated backups, encrypted, separate failure domain, RPO ≤1h (NFR-DR-001–003) | Must | 3d |
| 7.10 | **API Gateway** — Traefik/NGINX config: TLS, rate limiting, CORS, auth forwarding | Must | 2d |
| 7.11 | **Security headers** — HSTS, CSP, X-Frame-Options, Referrer-Policy (NFR-SEC-011) | Must | 1d |
| 7.12 | **Credential rotation** — rotate all current secrets (they're compromised), 90-day policy (NFR-SEC-007) | Must | 1d |
| 7.13 | **CORS lockdown** — remove wildcard, explicit origins only (NFR-SEC-009) | Must | 0.5d |
| 7.14 | **Penetration test** — engage third-party, remediate high/critical (NFR-SEC-005) | Must | 5d |
| 7.15 | **Load testing** — validate NFR-PERF targets (tile <2s, point cloud <3s, NDVI <10s) | Must | 3d |
| 7.16 | **Zero-downtime deploys** — rolling/blue-green strategy (NFR-AVAIL-004) | Must | 2d |

### Phase 8 — Compliance, Testing & Documentation (Est. 2–3 weeks)

| # | Task | Priority | Effort |
|---|---|---|---|
| 8.1 | **Automated test suite** — unit + integration + e2e; CI gating on coverage threshold | Must | 5d |
| 8.2 | **GDPR compliance** — data-subject access/erasure, processing inventory (NFR-PRIV-001/002) | Must | 3d |
| 8.3 | **Accessibility audit** — WCAG 2.1 AA on core flows, keyboard nav, screen reader (NFR-ACC-001) | Must | 3d |
| 8.4 | **Cross-browser testing** — Chrome, Firefox, Safari, Edge (latest 2 versions) (NFR-COMPAT-001) | Must | 2d |
| 8.5 | **OpenAPI spec** — machine-readable, kept in sync with implementation (FR-API-005) | Must | 2d |
| 8.6 | **User documentation** — admin guide, API reference, onboarding guide | Must | 3d |
| 8.7 | **Requirements Traceability Matrix** — every FR/NFR → test case → verification method | Must | 2d |

---

## 3. Critical Security Remediation (Do Immediately)

These items from SRS Appendix B must be resolved **before any non-local deployment**:

| # | Issue | Action |
|---|---|---|
| 1 | GEE service-account key committed as plaintext file | Remove from repo, add to `.gitignore`, store in secrets manager |
| 2 | SentinelHub secret + Planet API key in `.env` | Rotate immediately (treat as compromised), move to secrets store |
| 3 | Default credentials (`minioadmin`, `map_admin_pass`, `map_mq_pass`) | Replace with high-entropy unique values |
| 4 | `MINIO_API_CORS_ORIGIN="*"` | Restrict to explicit platform origins |
| 5 | Plaintext `http://` and `ws://` URLs | Switch to `https://` and `wss://` |
| 6 | Credentials embedded in connection strings | Inject from secrets store at runtime |
| 7 | No environment separation | Create isolated dev/staging/prod environments |
| 8 | Redis, RabbitMQ, MinIO, NodeODM have no auth beyond defaults | Configure authentication on all internal services |

---

## 4. Technology Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Frontend Host | Next.js (Webpack) | 16.2.6 |
| Frontend UI | React + Tailwind CSS | 19.2.6 / 4.3.0 |
| Geospatial | MapLibre GL JS + deck.gl + loaders.gl | 5.24 / 9.3 / 4.4 |
| Core Backend | NestJS + TypeORM | 11.1 / 1.0 |
| Python Services | FastAPI + Celery | 0.136 / 5.6 |
| Database | PostgreSQL + PostGIS | 17 / 3.5 |
| Cache/Broker | Redis | 8 |
| Message Bus | RabbitMQ | 4.1 |
| Object Storage | MinIO (S3-compatible) | latest |
| Photogrammetry | NodeODM (OpenDroneMap) | latest |
| Geo Processing | Rasterio + GDAL + NumPy | 1.5 / — / 2.4 |
| Build System | Turborepo | 2.9 |
| Container | Docker Compose (dev), Kubernetes (prod) | — |

---

## 5. Estimated Timeline

| Phase | Duration |
|---|---|---|
| Security remediation | 1 week
| Phase 1 — Core service | 3–4 weeks 
| Phase 2 — Drone pipeline | 3 weeks 
| Phase 3 — Satellite pipeline | 3 weeks
| Phase 4 — Frontend dashboard | 3–4 weeks 
| Phase 5 — Viewer enhancements | 4 weeks 
| Phase 6 — ML/CV | 3 weeks | Week 22 
| Phase 7 — Production hardening | 4–5 weeks
| Phase 8 — Compliance & testing | 2–3 weeks 

Total Time: 4-5 weeks(Estimated)

---

## 7. Key Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| NodeODM processing time for large missions (5000+ images) | User experience, SLA | Horizontal scaling of NodeODM pool; split-merge strategy |
| External API rate limits (SentinelHub, Planet, GEE) | Feature availability | Caching, request queuing, circuit breakers |
| Point cloud rendering performance (>10M points) | Browser crash | Progressive LOD streaming, octree tiling, WebGPU future path |
| Multi-tenant data leakage | Critical security | RLS at DB layer (done), penetration testing, automated cross-tenant tests |
| Secret exposure (current state) | Account compromise | Immediate rotation + secrets manager integration |
| Node.js 24 requirement | Developer onboarding | Already relaxed to Node 20+; document in README |

---

## 8. Deliverables Checklist for Client Handoff

- [ ] All "Must" requirements from SRS pass acceptance criteria
- [ ] Penetration test report with zero high/critical open findings
- [ ] Load test report confirming NFR-PERF targets
- [ ] Automated test suite with >80% coverage, CI-gated
- [ ] OpenAPI 3 specification published and in sync
- [ ] Kubernetes deployment manifests (production-ready)
- [ ] DR drill completed and documented
- [ ] GDPR data-processing inventory
- [ ] Accessibility audit (WCAG 2.1 AA) — no violations on core flows
- [ ] Admin guide + API reference documentation
- [ ] Requirements Traceability Matrix (100% Must requirements mapped)
- [ ] Credential rotation runbook
- [ ] Monitoring dashboards + alerting configured
- [ ] `.env.example` with no real secrets; all secrets in managed store

---

*End of Report*
