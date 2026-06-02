# SOFTWARE REQUIREMENTS SPECIFICATION
## Enterprise Drone & Satellite Image Processing Platform — SaaS Edition

| Field | Value |
|---|---|
| **Document version** | 2.0 — Production-Grade Release |
| **Supersedes** | v1.0 (May 2026, Core Module — Non-Technical) |
| **Date** | May 2026 |
| **Classification** | Confidential — Internal Use Only |
| **Status** | Draft for stakeholder approval |
| **Product model** | Multi-tenant Software-as-a-Service (SaaS) |
| **Standards basis** | ISO/IEC/IEEE 29148:2018 (Requirements Engineering) |

---

## 0. DOCUMENT CONTROL

### 0.1 Revision History

| Version | Date | Author | Summary of Change |
|---|---|---|---|
| 1.0 | May 2026 | Product Team | Initial release. Non-technical, Core Processing Module only. No security, auth, billing, or multi-tenancy. |
| 2.0 | May 2026 | Product + Architecture + Security | Production-grade rewrite. Adds traceable requirement IDs, acceptance criteria, MoSCoW prioritisation, multi-tenancy, RBAC, identity & authentication, security, subscription/quota, observability, compliance, DR, and a verification framework. Aligns architecture with the deployed technology stack. |

### 0.2 Approval & Sign-Off

Development shall not begin against this document until all roles below have approved.

| Role | Name | Responsibility | Signature / Date |
|---|---|---|---|
| Product Owner | _________ | Scope and functional completeness | _________ |
| Engineering Lead | _________ | Technical feasibility | _________ |
| Security Officer | _________ | Security & compliance requirements | _________ |
| QA Lead | _________ | Verifiability of acceptance criteria | _________ |
| Data Protection Officer | _________ | Privacy & data-residency requirements | _________ |
| Client / Stakeholder | _________ | Commercial scope approval | _________ |

### 0.3 Distribution List

Product Management · UX/UI Design · Backend Engineering · Frontend Engineering · DevOps / SRE · Security · QA · Drone & GIS Specialists · Stakeholders / Clients.

### 0.4 List of Figures

| Figure | Title | Section |
|---|---|---|
| Figure 1 | Platform Capability Model — The Three Pillars | §2.2 |
| Figure 2 | System Reference Architecture | §3.1 |
| Figure 3 | Asynchronous Processing Flow | §3.2 |
| Figure 4 | Multi-Tenant Isolation Hierarchy | §4.1 |
| Figure 5 | RBAC Scope & Role Model | §6 |
| Figure 6 | Photogrammetry Job Lifecycle | §9.2 |
| Figure 7 | Network Security Zones | §19.5 |
| Figure 8 | Requirements Traceability Chain | §20 |

---

## SECTION 1 — INTRODUCTION

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the complete functional and non-functional requirements for the **Enterprise Drone & Satellite Image Processing Platform**, delivered as a multi-tenant SaaS product. It is the authoritative contract between stakeholders and the engineering organisation. Every requirement herein is uniquely identified, prioritised, and accompanied by acceptance criteria so that it can be traced through design, implementation, and verification.

### 1.2 Scope

#### 1.2.1 In Scope

- Multi-tenant organisation, workspace, and project management.
- Identity, authentication, session management, and Role-Based Access Control (RBAC).
- Drone imagery ingestion, validation, and resumable upload.
- Automated photogrammetry processing (orthomosaics, elevation models, point clouds, meshes).
- Satellite imagery retrieval, band combination, spectral index computation, and change detection.
- Geospatial 2D/3D/4D visualisation, measurement, and annotation.
- Machine-learning analysis (object detection, segmentation, anomaly detection, thermal analysis).
- Output export, report generation, and delivery.
- Asynchronous job orchestration, notifications, and system monitoring.
- Data storage, lifecycle, integrity, retention, and residency.
- Subscription plans, usage metering, quota enforcement, and rate limiting.
- External data-source integrations (Sentinel/Copernicus, Google Earth Engine, Planet Labs, NodeODM).
- Public API, WebSocket, and webhook interfaces.
- Non-functional requirements: performance, scalability, availability, security, observability, compliance, accessibility.

#### 1.2.2 Out of Scope (Companion Documents)

- **Payment processing and invoicing** — the platform meters usage and enforces quotas (Section 16); integration with a payment provider and invoice generation is specified in *SRS-BILLING-001*.
- **Native mobile applications** — the platform is responsive web only; native apps are specified separately.
- **Marketing site, onboarding funnel, and CRM integration.**
- **Hardware drone-fleet management and flight planning** beyond mission record-keeping.

### 1.3 Intended Readers

| Reader | Purpose |
|---|---|
| Product Managers | Validate scope, priority, and functional completeness |
| UX/UI Designers | Derive user flows and screen-level requirements |
| Backend Engineers | Implement service responsibilities and data contracts |
| Frontend Engineers | Implement UI module and viewer behaviour |
| DevOps / SRE | Implement deployment, observability, and reliability requirements |
| Security Engineers | Implement and audit security and compliance requirements |
| QA & Test Engineers | Derive acceptance criteria and test cases from requirement IDs |
| Drone & GIS Specialists | Validate photogrammetry and geospatial accuracy requirements |
| Stakeholders / Clients | Review and approve scope before development begins |

### 1.4 Requirement Notation & Conventions

#### 1.4.1 Identifier Scheme

Every requirement has a unique, immutable identifier:

- **Functional:** `FR-<MODULE>-<NNN>` (e.g., `FR-RBAC-004`)
- **Non-functional:** `NFR-<CATEGORY>-<NNN>` (e.g., `NFR-SEC-011`)

Modules: `AUTH` `TEN` `RBAC` `PROJ` `IMG` `PHOTO` `SAT` `VIEW` `ML` `EXP` `JOB` `DATA` `SUB` `INT` `API`.
NFR categories: `PERF` `SCAL` `AVAIL` `SEC` `PRIV` `OBS` `MAINT` `ACC` `COMPAT` `DR`.

Identifiers are never reused. A retired requirement is marked *Deprecated*, not deleted.

#### 1.4.2 Priority (MoSCoW)

| Code | Meaning |
|---|---|
| **M** | Must — release-blocking; the product is not viable without it |
| **S** | Should — important; included unless time-constrained, scheduled next |
| **C** | Could — desirable; included if capacity allows |
| **W** | Won't (this release) — recorded for the roadmap, explicitly deferred |

#### 1.4.3 Verb Convention

"**Shall**" denotes a binding requirement. "Should" denotes a recommendation. "May" denotes an option. Informative text uses no modal verb.

### 1.5 References & Standards

| Ref | Standard / Document |
|---|---|
| R1 | ISO/IEC/IEEE 29148:2018 — Requirements Engineering |
| R2 | OWASP Application Security Verification Standard (ASVS) v4.0 — Level 2 |
| R3 | OWASP API Security Top 10 (2023) |
| R4 | SOC 2 Type II — Trust Services Criteria |
| R5 | ISO/IEC 27001:2022 — Information Security Management |
| R6 | EU General Data Protection Regulation (GDPR) 2016/679 |
| R7 | WCAG 2.1 Level AA — Web Content Accessibility Guidelines |
| R8 | OGC standards — GeoTIFF, Cloud-Optimized GeoTIFF, 3D Tiles |
| R9 | RFC 6749 / RFC 7519 — OAuth 2.0 / JSON Web Tokens |
| R10 | SAML 2.0; SCIM 2.0 (RFC 7644) — Enterprise SSO & provisioning |

---

## SECTION 2 — OVERALL DESCRIPTION

### 2.1 Product Perspective

The platform is an enterprise-grade, multi-tenant SaaS web application. It enables operators, surveyors, and analysts to ingest raw drone imagery or retrieve satellite imagery, transform it into professional geospatial products, and visualise those products in an interactive multi-dimensional map. Every tenant (customer organisation) operates within a logically isolated environment; no tenant can observe or access another tenant's data, jobs, or usage.

At its core the platform is an intelligent imagery pipeline: raw data enters, is transformed by specialised processing engines, and emerges as orthomosaics, elevation maps, spectral indices, and 3D terrain models.

### 2.2 The Three Core Pillars

- **Pillar 1 — Data Ingestion.** Two imagery types are accepted: drone imagery (overlapping photos from a flight mission) and satellite imagery (raster scenes from orbital sources). Each has a distinct ingestion path.
- **Pillar 2 — Processing Engine.** Drone imagery enters an asynchronous photogrammetry pipeline; satellite imagery enters an asynchronous spectral analytics engine. The user is notified on completion rather than waiting.
- **Pillar 3 — Geospatial Visualisation.** All outputs are rendered in a purpose-built browser-based geospatial viewer supporting 2D overlays, 3D terrain, 4D time-series, measurement, and comparison.

**Figure 1 — Platform Capability Model (The Three Pillars)**

```
   ┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
   │  PILLAR 1            │   │  PILLAR 2            │   │  PILLAR 3            │
   │  DATA INGESTION      │══▶│  PROCESSING ENGINE   │══▶│  GEOSPATIAL VISUAL.  │
   │                      │   │                      │   │                      │
   │  • Drone imagery     │   │  • Photogrammetry    │   │  • 2D map overlays   │
   │  • Satellite scenes  │   │  • Spectral engine   │   │  • 3D terrain        │
   │  • Validation        │   │  • ML / comp. vision │   │  • 4D time-series    │
   │  • Resumable upload  │   │  • Fully async       │   │  • Measure & export  │
   └──────────────────────┘   └──────────────────────┘   └──────────────────────┘
        RAW DATA IN              ASYNC TRANSFORM            DELIVERABLES OUT
```

### 2.3 User Classes

User classes and their RBAC roles are defined normatively in Section 6. Informatively:

| Class | Description |
|---|---|
| Platform Operator | Vendor-side staff who operate, support, and audit the SaaS itself |
| Organisation Administrator | Customer-side user who manages an organisation, its members, and settings |
| Operator | Creates projects, uploads imagery, launches and monitors processing jobs |
| Analyst | Runs analytics and ML, computes spectral indices, exports deliverables |
| Viewer | Explores the map, measures, generates reports — read-only |
| External Reviewer (Guest) | Time-limited, scoped read-only access to specific shared projects |

### 2.4 Operating Environment

- **Client:** Modern desktop web browsers (see `NFR-COMPAT-001`). No desktop software installation. WebGL 2.0 required for the 3D viewer.
- **Server:** Containerised microservices orchestrated on a container platform (Kubernetes recommended), deployable to a public cloud or on-premises.
- **Connectivity:** The platform assumes intermittent client connectivity and shall recover gracefully (resumable uploads, reconnecting WebSockets).

### 2.5 Assumptions & Dependencies

| ID | Assumption / Dependency |
|---|---|
| A1 | Tenants hold valid licences/credentials for commercial data sources (Planet Labs) where required. |
| A2 | External data sources (Copernicus, Google Earth Engine, Planet) maintain their published APIs and SLAs. A source outage degrades only the affected feature. |
| A3 | The photogrammetry engine (NodeODM) is available as a managed pool of worker nodes. |
| A4 | A managed secrets store (e.g., HashiCorp Vault, AWS Secrets Manager, or cloud KMS) is available in every environment. |
| A5 | A transactional email provider and an object-storage service (S3-compatible) are available. |
| A6 | Payment/invoicing is delivered by the companion billing system; this platform exposes metering data to it. |

### 2.6 Design Constraints

| ID | Constraint |
|---|---|
| C1 | The platform shall be **multi-tenant by construction**; tenant isolation is a non-negotiable architectural property (Section 4). |
| C2 | All inter-service and client-server communication shall use TLS 1.2+ in every environment except local developer loopback. |
| C3 | No secret (password, API key, private key, token) shall be stored in source control, container images, or plaintext configuration files in any non-local environment. |
| C4 | All processing is asynchronous and horizontally scalable; no request shall block on long-running work. |
| C5 | All geospatial outputs shall use OGC-standard, web-streamable formats (COG, 3D Tiles). |

---

## SECTION 3 — SYSTEM ARCHITECTURE & TECHNOLOGY BASELINE

This section records the architecture the requirements are written against. It is normative for interface boundaries and constraints; component-internal design is left to engineering.

### 3.1 Reference Architecture

**Frontend — Microfrontend composition**
- **Host Shell** (Next.js): routing, global state, layout, session, tenant context.
- **MFE-1 — Dashboard & Workspace Management** (React): organisations, projects, uploads, mission planning, job dashboard.
- **MFE-2 — Geospatial Viewer** (React + Deck.gl + MapLibre): 2D/3D/4D visualisation.
- Composition via Webpack Module Federation; each MFE is independently deployable.

**Backend — Microservices**
- **API Gateway** (Traefik or NGINX): TLS termination, routing, rate limiting, request authentication.
- **Core Management Service** (Node.js / NestJS): identity, RBAC, tenants, organisations, projects, missions, metering. Backed by PostgreSQL + PostGIS.
- **Drone Photogrammetry Service** (Python / FastAPI): consumes upload events, orchestrates NodeODM, manages photogrammetry jobs.
- **Satellite & Analytics Service** (Python / FastAPI): integrates Copernicus/Sentinel, Google Earth Engine, Planet Labs; runs raster math (NDVI, indices) with Rasterio/GDAL.

**Platform services**
- **PostgreSQL + PostGIS** — relational + spatial system of record.
- **Redis** — caching, Celery broker, result backend, ephemeral pub/sub.
- **RabbitMQ** — durable, guaranteed-delivery event bus between services.
- **Object Storage** — S3-compatible (MinIO on-prem / AWS S3 on cloud) for all raw and processed files.
- **Celery** — distributed task workers, including edge-compute nodes.
- **NodeODM** — photogrammetry engine pool.

**Figure 2 — System Reference Architecture**

```
        ╔══════════════════════════════════════════════════════════════╗
        ║                     CLIENT — WEB BROWSER                     ║
        ║   Host Shell (Next.js · Webpack Module Federation)           ║
        ║   ┌────────────────────────┐  ┌───────────────────────────┐  ║
        ║   │ MFE-1  Dashboard &     │  │ MFE-2  Geospatial Viewer  │  ║
        ║   │ Workspace Management   │  │ (Deck.gl · MapLibre)      │  ║
        ║   └────────────────────────┘  └───────────────────────────┘  ║
        ╚═══════════════════════════════╤══════════════════════════════╝
                                        │  HTTPS / WSS  (TLS 1.2+)
                          ┌─────────────▼──────────────┐
                          │   API GATEWAY              │
                          │   Traefik / NGINX          │
                          │   TLS · AuthN · RBAC ·     │
                          │   Rate-limiting · CORS     │
                          └──┬───────────┬──────────┬──┘
            ┌────────────────┘           │          └────────────────┐
            ▼                            ▼                           ▼
 ┌────────────────────┐     ┌────────────────────┐    ┌────────────────────┐
 │ CORE MANAGEMENT    │     │ DRONE PHOTOGRAM.   │    │ SATELLITE &        │
 │ Node.js / NestJS   │     │ Python / FastAPI   │    │ ANALYTICS          │
 │                    │     │                    │    │ Python / FastAPI   │
 │ Identity · RBAC    │     │ NodeODM orchestr.  │    │ Sentinel · GEE ·   │
 │ Tenants · Projects │     │ Photogrammetry     │    │ Planet · Rasterio  │
 │ Missions · Metering│     │ pipeline           │    │ GDAL · Spectral idx│
 └─────────┬──────────┘     └─────────┬──────────┘    └─────────┬──────────┘
           │                          │                         │
           └──────────────┬───────────┴───────────┬─────────────┘
                          ▼                       ▼
   ╔══════════════════════════════════╗  ╔══════════════════════════════╗
   ║  MESSAGING & CACHE               ║  ║  PERSISTENCE                 ║
   ║  • RabbitMQ — durable event bus  ║  ║  • PostgreSQL + PostGIS      ║
   ║  • Redis — cache · Celery broker ║  ║  • Object Storage (S3/MinIO) ║
   ║    · result backend · pub/sub    ║  ║  • NodeODM worker pool       ║
   ╚══════════════════════════════════╝  ╚══════════════════════════════╝
                          │
                          ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │ EXTERNAL DATA SOURCES                                            │
   │ Copernicus / Sentinel-1/2  ·  Google Earth Engine  ·  Planet Labs│
   └──────────────────────────────────────────────────────────────────┘
```

### 3.2 Event-Driven Flow

Imagery is uploaded directly to object storage. The Core Service persists metadata and publishes a durable event (e.g., `imagery.uploaded`) to RabbitMQ. The relevant processing service consumes the event and begins asynchronous work, emitting progress to Redis pub/sub, surfaced to the client over WebSocket.

**Figure 3 — Asynchronous Processing Flow**

```
 ╔════════════════════════ ASYNCHRONOUS PROCESSING FLOW ═════════════════════════╗

  [1]  MFE-1 requests short-lived signed upload URLs ......... Core Service
  [2]  Browser uploads imagery in resumable ≤10 MB chunks .... Object Storage
  [3]  Upload confirmed — SHA-256 checksum verified .......... Object Storage
  [4]  Core Service persists metadata, publishes event ...... RabbitMQ bus
             │
             ▼  event: "imagery.uploaded"
  [5]  Processing service consumes the durable event ........ Drone / Satellite Svc
  [6]  Service orchestrates NodeODM / runs spectral math .... Worker pool
  [7]  Processed outputs (COG · 3D Tiles · LAZ …) written ... Object Storage
  [8]  Live progress  Redis pub/sub ─▶ WSS ─▶ browser ....... Client
  [9]  "job.completed" / "job.failed" ─▶ notification ....... Client + email

 ╚═══════════════════════════════════════════════════════════════════════════════╝
   No synchronous request ever blocks on processing.  (FR-JOB-001)
```

### 3.3 Environments

`local` → `development` → `staging` → `production`. Staging shall be configuration-equivalent to production. Each environment has isolated data stores, credentials, and object-storage buckets.

---

## SECTION 4 — MULTI-TENANCY & TENANT ISOLATION

### 4.1 Tenancy Model

The platform organises all data and access under a strict hierarchy.

**Figure 4 — Multi-Tenant Isolation Hierarchy**

```
╔══════════════════════════════════════════════════════════════════════╗
║  ORGANISATION   (TENANT — isolation boundary · data-residency region) ║
║                                                                      ║
║   ┌─────────────────────────────┐   ┌─────────────────────────────┐  ║
║   │ WORKSPACE  "Survey Team A"   │   │ WORKSPACE  "Client XYZ"     │  ║
║   │                             │   │                             │  ║
║   │  ┌───────────────────────┐  │   │  ┌───────────────────────┐  │  ║
║   │  │ PROJECT               │  │   │  │ PROJECT               │  │  ║
║   │  │  ┌─────────────────┐  │  │   │  │  ┌─────────────────┐  │  │  ║
║   │  │  │ MISSION         │  │  │   │  │  │ MISSION         │  │  │  ║
║   │  │  │ Imagery · Jobs  │  │  │   │  │  │ Imagery · Jobs  │  │  │  ║
║   │  │  │ · Outputs       │  │  │   │  │  │ · Outputs       │  │  │  ║
║   │  │  └─────────────────┘  │  │   │  │  └─────────────────┘  │  │  ║
║   │  └───────────────────────┘  │   │  └───────────────────────┘  │  ║
║   └─────────────────────────────┘   └─────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════╝
  Isolation enforced by:  PostgreSQL Row-Level Security (organisation_id)
  + per-tenant object-storage namespacing + scoped, expiring signed URLs.
  ▲ No request, query, token, or URL may cross this boundary (FR-TEN-003).
```

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-TEN-001 | M | An **Organisation** shall be the top-level tenant boundary. Every user, workspace, project, mission, file, job, and usage record shall belong to exactly one organisation. | No platform record can be persisted without a resolvable `organisation_id`. A schema/constraint test confirms non-nullability. |
| FR-TEN-002 | M | Each organisation shall support one or more **Workspaces** as sub-containers for separating teams, clients, or business units. | A user with the right role can create, rename, and archive workspaces; projects always belong to a workspace. |
| FR-TEN-003 | M | The system shall enforce **logical tenant isolation** so that no request can read, list, or mutate data belonging to another organisation. | A penetration test attempting cross-tenant access by manipulating IDs in URLs, payloads, and tokens returns `403/404` for 100% of attempts; no data leaks. |
| FR-TEN-004 | M | Tenant isolation shall be enforced at the **data layer**, not solely in application code (e.g., PostgreSQL Row-Level Security keyed on `organisation_id`). | Direct database queries without a tenant context return zero rows. Verified by automated test. |
| FR-TEN-005 | M | Object-storage paths shall be **namespaced per organisation**; signed URLs shall be scoped to a single object and expire. | Generated download URLs include the tenant prefix, expire ≤ 15 minutes, and cannot be modified to reach another tenant's object. |
| FR-TEN-006 | M | Every organisation shall be assignable to a **data-residency region** at creation; its data shall not leave that region. | Creating an EU-region organisation stores all raw/processed data and backups in EU infrastructure; verified by storage-location audit. |
| FR-TEN-007 | S | An organisation profile shall capture: legal name, primary contact, region, subscription plan, and lifecycle status (`Active`, `Suspended`, `Closed`). | All fields are editable by an Organisation Owner and shown in organisation settings. |
| FR-TEN-008 | M | When an organisation is `Suspended`, all members shall lose write access while retaining read access; when `Closed`, data shall be retained per the retention policy then irreversibly deleted. | Suspending an org blocks new uploads/jobs within 60 s; closing it triggers the `DATA` retention workflow. |

---

## SECTION 5 — IDENTITY, AUTHENTICATION & SESSION MANAGEMENT

### 5.1 Account & Credential Requirements

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-AUTH-001 | M | Users shall authenticate with an email address and a password, or via federated SSO (FR-AUTH-010). | A user with valid credentials obtains an authenticated session; invalid credentials are rejected with a generic error. |
| FR-AUTH-002 | M | Passwords shall be stored only as salted, adaptive one-way hashes (e.g., bcrypt/argon2id). Plaintext or reversible storage is prohibited. | A database inspection shows no recoverable password material. |
| FR-AUTH-003 | M | The system shall enforce a configurable password policy: minimum 12 characters and a check against a known-breached-password list. | A password of 11 chars or one present in the breach list is rejected with a clear message. |
| FR-AUTH-004 | M | The system shall support **Multi-Factor Authentication (MFA)** via TOTP authenticator apps; organisations may mandate MFA for all members. | When MFA is enrolled, login requires a valid second factor; when org-mandated, members without MFA are forced to enrol before access. |
| FR-AUTH-005 | M | After 5 failed login attempts within 15 minutes, the account shall be temporarily locked for 15 minutes, and the user notified by email. | The 6th attempt is rejected even with correct credentials until the lockout expires. |
| FR-AUTH-006 | M | Sessions shall use short-lived access tokens (≤ 15 min) and rotating refresh tokens; tokens shall be invalidatable server-side. | An administrator-initiated session revocation blocks the affected token within 60 seconds. |
| FR-AUTH-007 | M | Users shall be able to view all active sessions (device, location, last activity) and revoke any of them. | Revoking a session ends access on that device on its next request. |
| FR-AUTH-008 | M | Users shall be able to reset a forgotten password via a single-use, time-limited (≤ 30 min) email link. | A used or expired link is rejected; a successful reset invalidates all existing sessions. |
| FR-AUTH-009 | S | The system shall send a security notification email on: new-device login, password change, MFA change, and email change. | Each event triggers one email to the account address within 2 minutes. |

### 5.2 Enterprise SSO & Provisioning

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-AUTH-010 | M | Organisations shall be able to configure **federated SSO** via SAML 2.0 and OpenID Connect with their identity provider. | A member from a configured IdP signs in without a platform password; just-in-time account creation succeeds. |
| FR-AUTH-011 | S | The system shall support **SCIM 2.0** for automated user provisioning and de-provisioning from the organisation's IdP. | De-provisioning a user in the IdP disables their platform access within 15 minutes. |
| FR-AUTH-012 | S | Organisations using SSO shall be able to enforce **SSO-only** login, disabling password authentication for their members. | With SSO-only enabled, a password login attempt for that org is rejected and redirected to the IdP. |
| FR-AUTH-013 | M | The system shall support scoped, revocable **API keys / service accounts** for programmatic access, each bound to an organisation and an RBAC role. | An API key authenticates API requests, respects its role's permissions, and stops working immediately when revoked. |

---

## SECTION 6 — AUTHORIZATION & ROLE-BASED ACCESS CONTROL (RBAC)

RBAC is a core SaaS requirement. Every action in the platform is permission-gated. Permissions are grouped into roles; roles are assigned to users at a defined scope.

**Figure 5 — RBAC Scope & Role Model**

```
  ┌──────────────────────────────────────────────────────────────────┐
  │  PLATFORM SCOPE       Super Admin · Support                       │
  │  (vendor staff)       break-glass, audited tenant access only      │
  └────────────────────────────────┬─────────────────────────────────┘
                                    │ operates the SaaS
  ┌────────────────────────────────▼─────────────────────────────────┐
  │  ORGANISATION SCOPE   Owner · Admin · Billing Administrator        │
  └────────────────────────────────┬─────────────────────────────────┘
                                    │ governs
  ┌────────────────────────────────▼─────────────────────────────────┐
  │  WORKSPACE SCOPE      Manager · Operator · Analyst · Viewer        │
  └────────────────────────────────┬─────────────────────────────────┘
                                    │ may share a project ▼
  ┌────────────────────────────────▼─────────────────────────────────┐
  │  PROJECT SCOPE        External Reviewer (Guest)                    │
  │                       time-limited · read-only                    │
  └───────────────────────────────────────────────────────────────────┘

  Model:  PERMISSIONS ─▶ ROLES ─▶ USERS @ SCOPE
          (permissions are NEVER assigned directly to users — FR-RBAC-001)
  Enforced server-side on every request · deny-by-default · least privilege
```

### 6.1 Role Model

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-RBAC-001 | M | Authorization shall be **role-based**, with permissions assigned to roles and roles assigned to users — never permissions assigned directly to users. | Every effective permission of a user traces to a role assignment; verified by an authorization audit query. |
| FR-RBAC-002 | M | Roles shall be assignable at two scopes: **Organisation scope** and **Workspace scope**. A workspace-scoped role grants no access outside that workspace. | A user who is Operator in Workspace A has no access to Workspace B unless separately granted. |
| FR-RBAC-003 | M | The platform shall ship the predefined roles in §6.2. Their permission sets are normative (Appendix C). | Each predefined role exists on every new organisation and matches the Appendix C matrix. |
| FR-RBAC-004 | S | Organisation Administrators shall be able to create **custom roles** by composing the platform's permission catalogue. | An admin creates a custom role, assigns it, and the user receives exactly the selected permissions — no more. |
| FR-RBAC-005 | M | Authorization shall be enforced **server-side on every request** at the API Gateway and/or service layer. UI hiding of controls is a usability aid only, never the enforcement mechanism. | A direct API call for an action the user's role lacks returns `403`, even when the UI control is hidden. |
| FR-RBAC-006 | M | Authorization decisions shall follow **least privilege** and **deny-by-default**: any action not explicitly granted is denied. | A request against a newly added endpoint with no permission mapping is denied until a mapping is added. |
| FR-RBAC-007 | M | The platform shall support **resource sharing**: a project may be shared with specific users or with an External Reviewer link at a read-only scope, with an optional expiry. | Sharing a project read-only lets the grantee view but not modify it; an expired share returns `403`. |
| FR-RBAC-008 | S | Role and permission changes shall take effect within 60 seconds for active sessions without requiring re-login. | After an admin removes a user's role, the user's next request beyond 60 s is denied. |
| FR-RBAC-009 | M | All role assignments, removals, and permission changes shall be written to the immutable audit log (NFR-SEC-014). | Every RBAC change appears in the audit log with actor, target, before/after, and timestamp. |

### 6.2 Predefined Roles

| Role | Scope | Summary |
|---|---|---|
| **Platform Super Admin** | Platform | Vendor staff. Operates the SaaS, manages tenants. Cannot read tenant imagery content without a logged break-glass grant. |
| **Platform Support** | Platform | Vendor staff. Read-only diagnostics; tenant-data access only via time-boxed, audited, consent-based impersonation. |
| **Organisation Owner** | Organisation | Full control of the organisation, including billing, SSO, deletion, and ownership transfer. |
| **Organisation Admin** | Organisation | Manages members, roles, workspaces, and org settings. No billing, no org deletion. |
| **Billing Administrator** | Organisation | Manages subscription, payment method, quotas, and invoices only. No project data access. |
| **Workspace Manager** | Workspace | Creates/configures projects, manages workspace members, configures processing. |
| **Operator** | Workspace | Creates projects and missions, uploads imagery, launches and monitors jobs. |
| **Analyst** | Workspace | Runs analytics, spectral indices, ML, change detection; exports deliverables. No member management. |
| **Viewer** | Workspace | Read-only: explores the map, measures, annotates own session, generates reports. |
| **External Reviewer (Guest)** | Project | Time-limited, read-only access to specifically shared projects. Cannot export unless explicitly permitted. |

The complete action-by-role permission matrix is **Appendix C** and is normative.

---

## SECTION 7 — PROJECT & WORKSPACE MANAGEMENT

### 7.1 Projects

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-PROJ-001 | M | A user with project-create permission shall create a **Project** by providing: name, type (`Drone Survey` / `Satellite Analysis` / `Combined`), optional geographic Region of Interest, and optional description. | A project created with a name and type persists, receives a unique identifier, and appears immediately on the dashboard with status `Draft`. |
| FR-PROJ-002 | M | The system shall maintain a project **status lifecycle**: `Draft`, `Uploading`, `Processing`, `Completed`, `Failed`, `Archived`. | Status transitions occur automatically on the triggering events and are reflected in the UI within 5 s. |
| FR-PROJ-003 | M | Within a project, users shall create **Mission Records**, each representing one data-collection event (one drone flight or one satellite request). | A mission captures collection date/time, source type, coverage area, file count, raw size, and processing status. |
| FR-PROJ-004 | M | The dashboard shall display all projects the user may access, in card or list form, showing: name, type, last-activity date, status indicator, primary-output thumbnail (when available), and quick actions. | All accessible projects render with the listed fields; projects the user cannot access are not shown. |
| FR-PROJ-005 | S | Users shall be able to search and filter projects by name, type, status, workspace, and date range. | A search returns matching projects within 1 s for a workspace of up to 1,000 projects. |
| FR-PROJ-006 | S | Archiving a project shall make it read-only and exclude it from active dashboards while retaining all data. | An archived project disables uploads/jobs and is reachable via an "Archived" filter. |

---

## SECTION 8 — DRONE IMAGE INGESTION

Drone surveys typically produce 100–5,000 images per mission, each 10–50 MB.

### 8.1 Supported Input Formats

| Image Type | Supported Formats |
|---|---|
| Standard Colour (RGB) | JPEG (.jpg, .jpeg), PNG (.png), TIFF (.tif, .tiff) |
| Multispectral | TIFF with band metadata; MicaSense RedEdge / Sequoia |
| Thermal Infrared | TIFF / RJPEG from FLIR, DJI Zenmuse XT |
| Raw Camera | DNG from DJI, Sony, Phase One |
| 360° Panoramic | JPEG / TIFF with equirectangular metadata |

### 8.2 Upload Requirements

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-IMG-001 | M | The upload screen shall provide a drag-and-drop zone accepting an entire folder in one gesture, plus a click-to-browse multi-file selector. | Dropping a folder of 500 images queues all 500; the file browser allows multi-select. |
| FR-IMG-002 | M | Before upload, the system shall validate each file for: supported format, non-corruption/non-empty, and presence of GPS/EXIF metadata (missing GPS warns, does not block). | Unsupported or corrupt files are listed in a rejection panel with a plain-language reason; the user may proceed without them or cancel. |
| FR-IMG-003 | M | The system shall display the estimated total upload size before upload begins. | The displayed estimate is within 5% of the actual transferred size. |
| FR-IMG-004 | M | Uploads shall be **chunked** (≤ 10 MB/chunk) and **resumable**: after a network interruption, upload resumes from the last confirmed chunk without user action. | A simulated mid-upload disconnect resumes automatically on reconnect; no chunk is re-sent unnecessarily and no file is corrupted. |
| FR-IMG-005 | M | A progress bar shall show overall and per-file completion in real time. | Progress reflects actual bytes transferred and reaches 100% only when all chunks are confirmed. |
| FR-IMG-006 | M | Files shall be uploaded **directly to object storage** via short-lived signed URLs; image bytes shall not transit application services. | Network inspection shows image data flowing to storage endpoints, not to the Core Service. |
| FR-IMG-007 | M | During ingestion the system shall extract and store from EXIF/XMP: GPS lat/lon/altitude, camera make/model, focal length, sensor dimensions, capture timestamp, gimbal pitch/roll/yaw, and AGL flight altitude where present. | For a sample image with full metadata, every listed field is extracted and queryable. |
| FR-IMG-008 | M | Each uploaded file shall be checksummed (SHA-256) at upload and the checksum re-verified before processing. | A file altered between upload and processing fails verification and is flagged, not processed. |
| FR-IMG-009 | M | After upload, the system shall present an **Image Library** view: thumbnail grid, GPS-footprint map overview, summary statistics (image count, total area, average overlap %, altitude range), and a highlighted list of images missing GPS. | All elements render for a completed upload; images missing GPS are visibly marked amber. |
| FR-IMG-010 | S | Users shall optionally upload **Ground Control Point (GCP)** files in CSV (`label, latitude, longitude, elevation, pixel_x, pixel_y, image_filename`) or DXF/LandXML. | A valid GCP file is parsed; each GCP is plotted on the footprint map; an invalid file is rejected with a reason. |
| FR-IMG-011 | S | Users shall be able to confirm or manually adjust GCP-to-image associations before processing. | The user can reassign a GCP to a different image, and the change persists into the processing job. |

---

## SECTION 9 — DRONE PHOTOGRAMMETRY PROCESSING

### 9.1 Job Configuration

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-PHOTO-001 | M | A guided setup screen shall let users configure a photogrammetry job, with sensible defaults pre-selected for one-click start. | Opening setup and clicking "Start" without changes launches a valid job. |
| FR-PHOTO-002 | M | Users shall select a **quality preset**: `Draft (Fast)`, `Standard`, `High`, or `Ultra (Archive)`. | The selected preset is recorded on the job and governs engine parameters. |
| FR-PHOTO-003 | M | Users shall toggle desired **outputs**: Orthomosaic, DSM, DTM, Dense Point Cloud, 3D Mesh, Contour Lines, Volume Calculations (volume requires a defined base plane). | Only toggled-on outputs are produced; enabling Volume without a base plane blocks job start with a clear message. |
| FR-PHOTO-004 | M | Users shall specify the output **Coordinate Reference System** from a searchable list (WGS84, UTM zones, national grids, custom EPSG). | The chosen CRS is applied to all georeferenced outputs; an invalid EPSG code is rejected. |
| FR-PHOTO-005 | S | Users shall be able to draw **exclusion zones** on the footprint map to skip degraded areas (water, reflective surfaces, obstructions). | Drawn exclusion zones are passed to the engine and visibly omitted from reconstruction. |

### 9.2 Job Lifecycle & Monitoring

**Figure 6 — Photogrammetry Job Lifecycle**

```
  ┌───────────┐  ┌──────────────┐  ┌────────────────────┐  ┌─────────────────┐
  │ SUBMITTED │─▶│ INITIALIZING │─▶│ FEATURE EXTRACTION │─▶│ POINT CLOUD GEN.│
  └───────────┘  └──────────────┘  └────────────────────┘  └────────┬────────┘
                                                                     │
       ┌─────────────────┐  ┌────────────────────┐  ┌────────────────▼────────┐
       │    COMPLETE     │◀─│  POST-PROCESSING   │◀─│ SURFACE RECONSTRUCTION  │
       │  outputs ready  │  │  tile · compress   │  └────────────┬────────────┘
       └─────────────────┘  └─────────▲──────────┘               │
                                      │             ┌────────────▼────────────┐
                                      └─────────────│ ORTHOMOSAIC GENERATION  │
                                                    └─────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────────┐
  │ FAILED ◀─ any stage, on unrecoverable error                                │
  │   → plain-language message · full technical detail in collapsible panel    │
  │   → Retry with editable parameters · partial outputs still delivered       │
  └───────────────────────────────────────────────────────────────────────────┘
```

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-PHOTO-006 | M | A job shall progress through: `Submitted` → `Initializing` → `Feature Extraction` → `Point Cloud Generation` → `Surface Reconstruction` → `Orthomosaic Generation` → `Post-Processing` → `Complete`, or terminate at `Failed`. | The current stage is queryable and displayed; transitions follow the defined order. |
| FR-PHOTO-007 | M | Progress shall update in real time over WebSocket without page refresh, showing: current stage + progress bar, dynamic ETA, images processed / total, and a plain-language log of the last 20 engine messages. | All elements update live during a real job; the connection auto-reconnects after a drop. |
| FR-PHOTO-008 | S | An optional advanced view shall show CPU and memory utilisation of the processing node. | When enabled, utilisation figures update at least every 10 s. |
| FR-PHOTO-009 | M | Users shall receive an in-app notification, and optionally email, when a job completes or fails. | Completion and failure each generate the configured notifications within 2 minutes. |

### 9.3 Output Specifications

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-PHOTO-010 | M | **Orthomosaic** shall be produced as a Cloud-Optimized GeoTIFF (COG) in the selected CRS, with embedded GeoTIFF tags, a built-in tile pyramid (overviews 1:1 to 1:16384), and lossless or near-lossless compression. | The output opens correctly in standard GIS software and streams tile-by-tile in the viewer. |
| FR-PHOTO-011 | M | **DSM** shall be a float32 COG of elevation values, with min/max statistics in metadata, rendered in the viewer with a standard elevation gradient and an optional hillshade overlay. | DSM pixel values are float32; the viewer applies the gradient and hillshade toggle. |
| FR-PHOTO-012 | S | **DTM** shall be produced as a float32 COG with vegetation and structures filtered to bare ground. | Buildings/trees present in the DSM are absent from the DTM for the same area. |
| FR-PHOTO-013 | M | **Dense Point Cloud** shall be produced in LAS/LAZ and in 3D Tiles for web streaming, with classification (ground, vegetation, building, noise) and ≥ 50 points/m² at the Standard preset. | Output files validate against format specs; measured density meets the threshold. |
| FR-PHOTO-014 | S | **3D Mesh** shall be produced as OBJ + texture atlas or GLB/glTF; polygon count is governed by preset; texture up to 4K/tile for High/Ultra. | The GLB renders in the 3D viewer; texture resolution matches the preset. |
| FR-PHOTO-015 | S | **Volume Calculations** shall output a PDF reporting fill, cut, and total volume in m³, computed by cross-section integration over the user-defined base plane, with an uncertainty estimate. | The report contains all three figures plus an uncertainty band. |

---

## SECTION 10 — SATELLITE IMAGERY RETRIEVAL & PROCESSING

### 10.1 Data Sources

| Source | Description |
|---|---|
| Sentinel-2 (ESA / Copernicus) | Free optical. 10 m, 13 bands, 5-day revisit. Vegetation, water, agriculture. |
| Sentinel-1 (ESA / Copernicus) | Free SAR radar. Cloud/dark penetration. Flood and deformation mapping. |
| Landsat-8/9 (NASA/USGS) | Free optical. 30 m. Long historical archive. Long-term change detection. |
| Planet Labs (Commercial) | 3 m daily imagery. Subscription required. High-cadence monitoring. |
| Google Earth Engine | Petabyte multi-source archive, on-demand computation. Regional analytics. |

### 10.2 Search, Band Combination, Indices

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-SAT-001 | M | Users shall search satellite imagery by: geographic area (drawn polygon/rectangle or entered coordinates), date range (with quick presets), maximum cloud-cover % (0–100 slider), satellite source (single/multi), and spectral resolution. | A search returns matching scenes; each filter measurably narrows results. |
| FR-SAT-002 | M | Search results shall list scenes showing: acquisition date, cloud-cover %, source, AOI coverage %, and thumbnail; users shall preview any scene on the map before download/processing. | Results render all fields; previewing a scene overlays it on the map without committing a job. |
| FR-SAT-003 | M | For multispectral data, the system shall offer one-click preset band combinations — True Colour, False Colour (NIR-R-G), Agriculture, Geology, Urban Highlight, Atmospheric Penetration — and a Custom user-defined combination. | Selecting a preset re-renders the scene with that band mapping; Custom lets the user assign any band to R/G/B(/A). |
| FR-SAT-004 | M | The analytics engine shall compute, on demand, the spectral indices: NDVI, NDWI, NDBI, EVI, SAVI, NBR, NDSI, BSI — each returned as a single-band raster with an appropriate colour gradient. | Each index produces a new viewer layer; values fall within the index's defined range. |
| FR-SAT-005 | M | Spectral index computation shall use the correct band-wavelength metadata of the source sensor. | A computed NDVI for a known scene matches a reference value within tolerance. |
| FR-SAT-006 | S | The platform shall support **bi-temporal change detection** between two scenes of the same area/source, with methods: band difference, index difference, NDVI delta; users shall adjust a sensitivity threshold interactively. | Selecting two scenes and a method produces a change layer; moving the threshold updates the result without re-running the full job. |

---

## SECTION 11 — GEOSPATIAL VIEWER

### 11.1 Base Layers, Navigation, Layer Management

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-VIEW-001 | M | The viewer shall offer base maps via a layer switcher: OpenStreetMap (default), satellite imagery, terrain/topographic, and blank. | Switching base maps re-renders within 2 s. |
| FR-VIEW-002 | M | A **Layer Management Panel** shall list all layers for the open project and allow: toggle on/off, opacity (0–100% slider), drag-reorder, rename, remove-from-view (without deleting data), and expand-to-view metadata (resolution, CRS, processing date, bands). | Each control performs its action and persists across the session. |
| FR-VIEW-003 | M | The viewer shall support 2D navigation: pan (drag), zoom (wheel/pinch/buttons), optional rotate, reset-to-extent, and fly-to-coordinates (lat/lon or address). | Each navigation action behaves as specified. |
| FR-VIEW-004 | M | When a DSM, DTM, or point cloud loads, the viewer shall offer a **3D mode** with tilt/pitch, 360° orbit, fly-through between saved viewpoints, and adjustable FOV and camera height. | 3D mode activates and all listed controls function. |
| FR-VIEW-005 | M | 3D terrain shall drape the orthomosaic over the DSM, with adjustable vertical exaggeration (1×–10×), date/time/location sun-and-shadow simulation, and contour overlay at user-defined intervals. | Each control visibly changes the rendered terrain. |
| FR-VIEW-006 | M | The viewer shall render **point clouds of millions of points** via progressive level-of-detail streaming, with colour modes (true colour, elevation, intensity, classification), point-size/density controls, and a 3D clipping-box tool. | A 1M-point cloud renders within 3 s (NFR-PERF-002); all controls function. |

### 11.2 Temporal Analysis, Measurement, Annotation

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-VIEW-007 | S | The viewer shall support **4D temporal analysis** when multi-date data is loaded: a timeline slider, animated playback at configurable speed, side-by-side snapshot comparison with a synchronised swipe divider, and a difference heat-map overlay. | Each temporal control functions with a multi-date dataset. |
| FR-VIEW-008 | M | The viewer shall provide **measurement tools**: point-elevation query, distance (polyline), area (polygon, ha + m²), perimeter, terrain profile graph, volume (polygon + base elevation), and pixel inspector (raw band values on hover). | Each tool returns a result; measured values match reference values within tolerance. |
| FR-VIEW-009 | M | Users shall add **annotations**: point markers, lines, polygons, geo-anchored text boxes, and photo pins. All annotations shall be editable after creation, exportable as GeoJSON/KML, and includable in PDF reports. | Each annotation type can be created, edited, exported, and appears in a report. |
| FR-VIEW-010 | M | The viewer shall include a **swipe comparison tool** with a draggable vertical or horizontal divider between two layers or two dates, updating in real time. | Dragging the divider reveals each layer smoothly without lag. |
| FR-VIEW-011 | M | Annotations and viewer state shall be scoped to the project and the RBAC permissions of the user; a Viewer cannot persist annotations onto a project they lack edit rights to. | A read-only user's annotations exist only in their session and cannot be saved to the shared project. |

---

## SECTION 12 — MACHINE LEARNING & COMPUTER VISION

ML features run **on demand** by the user, never automatically.

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-ML-001 | S | The system shall detect and count objects within an orthomosaic across agriculture, construction, infrastructure, and environmental classes; results render as bounding boxes / point markers with a summary count table, filterable by class and confidence threshold. | A detection job returns a layer of detections and a count table; filters narrow the displayed set. |
| FR-ML-002 | S | The system shall perform **semantic segmentation (land-cover classification)** of an orthomosaic or satellite image into standard classes (bare soil, water, dense/sparse vegetation, built-up, road/impervious, shadow, cloud), output as a colour-coded raster with an area-statistics table (m² and % per class). | The classified raster covers 100% of the input extent; class percentages sum to 100%. |
| FR-ML-003 | C | For time-series datasets, the system shall flag **anomalous zones** that have changed significantly versus historical norms. | An anomaly job over ≥ 3 dated datasets returns flagged zones with a deviation score. |
| FR-ML-004 | S | For thermal imagery, the system shall display a calibrated temperature map with an adjustable cold-to-hot ramp, point temperature query (°C/°F), hot-spot detection above a user threshold, and a thermal anomaly report (coordinates + temperature per hot spot). | Clicking a point shows a temperature; hot spots above the threshold are marked and listed in the report. |
| FR-ML-005 | M | Every ML output shall record the model name and version used, displayed in layer metadata and included in reports. | The model identifier and version are visible for any ML-generated layer. |

---

## SECTION 13 — EXPORT & DELIVERY

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-EXP-001 | M | Outputs shall be downloadable in industry-standard formats selected per output type: Orthomosaic (COG GeoTIFF, JPEG2000, PNG+world file, KMZ); DSM/DTM (GeoTIFF float32, ASCII Grid, XYZ); Point Cloud (LAS, LAZ, PLY, XYZ, E57); 3D Mesh (OBJ+MTL, GLB, FBX); Spectral Index (GeoTIFF, PNG+colorbar); Contours (DXF, SHP, GeoJSON, KML); Volume Report (PDF, CSV); Annotations (GeoJSON, KML, SHP). | A download in each format produces a valid file that opens in the relevant standard software. |
| FR-EXP-002 | S | On download, users shall be able to configure: spatial crop to a drawn AOI, resolution resampling, CRS reprojection to any EPSG code, and GeoTIFF compression (None/LZW/DEFLATE). | Each option measurably changes the produced file (extent, resolution, CRS, size). |
| FR-EXP-003 | M | The system shall generate a formatted **PDF report** for a completed project including: project summary, orthomosaic thumbnail with scale bar and north arrow, key statistics (point density, GSD, vertical accuracy estimate), active annotations and measurements, spectral index maps with legends, and processing metadata (engine version, date, preset). | A generated report contains every listed element and is paginated correctly. |
| FR-EXP-004 | M | Downloads shall be delivered via short-lived signed URLs scoped to a single object; the action shall be permission-gated and audit-logged. | A download URL expires within 15 minutes and cannot be reused for another object; the download appears in the audit log. |
| FR-EXP-005 | S | Export shall be available via the public API so deliverables can be retrieved programmatically. | An authorised API call initiates an export and retrieves the result. |

---

## SECTION 14 — JOB ORCHESTRATION, NOTIFICATIONS & MONITORING

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-JOB-001 | M | All long-running work (photogrammetry, spectral analysis, ML, change detection, export) shall execute as **asynchronous jobs** placed on a durable queue. | Submitting a job returns immediately with a job ID; the API never blocks on processing. |
| FR-JOB-002 | M | A **Jobs Dashboard** shall show all jobs across all projects the user may access, per job displaying: project + mission identifier, job type, colour-coded status, start time and elapsed duration, progress %, estimated completion, and actions (pause where supported, cancel, view details). | The dashboard lists all authorised jobs with every field; actions perform as labelled. |
| FR-JOB-003 | M | Job state changes shall be driven by durable events on the message bus so that no completion or failure is lost if a service restarts. | Killing and restarting a processing service mid-job does not lose the job; it resumes or is retried. |
| FR-JOB-004 | M | The notification system shall deliver: upload completed (in-app banner), job started (in-app), job completed (in-app + optional email), job failed (urgent in-app + optional email with error detail), storage 80% (in-app warning), storage exceeded (in-app blocking alert). | Each event produces exactly the specified notification(s) within 2 minutes. |
| FR-JOB-005 | M | On job failure the system shall: preserve all input data, show a plain-language error (never a raw stack trace), offer a Retry with editable parameters, expose full technical detail in a collapsible panel, and allow **partial completion** (deliver outputs that succeeded). | A simulated failure preserves inputs, shows a plain message, and delivers any output that completed. |
| FR-JOB-006 | M | A job interrupted by node failure shall be **automatically retried** up to a configurable limit before being marked `Failed`. | A killed worker's job is re-queued and completes on a healthy worker without user action. |
| FR-JOB-007 | S | Concurrent processing jobs shall be subject to per-organisation concurrency limits derived from the subscription plan (Section 16). | Submitting beyond the plan limit queues the excess rather than rejecting it, and the UI shows it as queued. |

---

## SECTION 15 — DATA STORAGE & LIFECYCLE MANAGEMENT

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-DATA-001 | M | All files (raw uploads and processed outputs) shall be organised in a hierarchical structure tied to organisation → workspace → project → mission. Users shall never see raw storage paths. | The UI presents only logical containers; no storage path or bucket name is exposed to end users. |
| FR-DATA-002 | M | From a project/mission view, permitted users shall: list raw files (name, size, upload date), preview any image full-screen, delete individual raw files before processing, delete an entire mission with all data, and duplicate a mission (same raw files, no outputs) for re-processing. | Each action performs as specified and respects RBAC. |
| FR-DATA-003 | M | Every destructive action (file, mission, project, or organisation deletion) shall require explicit confirmation summarising exactly what will be removed. | The confirmation lists item counts and total size; cancelling makes no change. |
| FR-DATA-004 | M | No processed output shall ever be overwritten by a new job; each run shall create a new **versioned** copy. | Re-processing a mission yields a new output version; prior versions remain retrievable. |
| FR-DATA-005 | M | Each project shall display a real-time **storage meter**: storage used by raw uploads, by processed outputs, and project usage versus the organisation's available quota. | The meter matches actual storage within 5% and updates after uploads/deletions. |
| FR-DATA-006 | M | Data at rest shall be **encrypted** in object storage and databases; backups shall be encrypted (NFR-SEC-003). | Storage and backup configuration shows encryption enabled; verified by audit. |
| FR-DATA-007 | M | The platform shall enforce a configurable **data-retention policy** per organisation, and shall purge data of a `Closed` organisation after the retention window. | Closing an org schedules deletion; after the window, the data is irrecoverably removed and the action is logged. |
| FR-DATA-008 | M | An organisation shall be able to **export all of its data** (raw and processed) in standard formats for portability/offboarding. | A full-export request produces a downloadable archive of the organisation's data within the SLA. |
| FR-DATA-009 | S | Deletion shall support a soft-delete grace period (recycle bin) before permanent removal, except where a user explicitly chooses immediate deletion. | A deleted project is recoverable within the grace period, then permanently removed. |

---

## SECTION 16 — SUBSCRIPTION, QUOTAS & USAGE METERING

Payment processing is out of scope (Section 1.2.2); the requirements below cover plan tiers, metering, quota enforcement, and rate limiting.

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-SUB-001 | M | Each organisation shall be assigned a **subscription plan** that defines limits: storage capacity, member seats, concurrent jobs, monthly processing minutes, and API rate limits. | Plan limits are visible in organisation settings and enforced by the requirements below. |
| FR-SUB-002 | M | The platform shall **meter usage** per organisation: storage consumed, processing minutes, jobs run, API calls, and seats used. | A metering dashboard shows each metric, updated at least hourly. |
| FR-SUB-003 | M | When storage reaches 80% of quota, the system shall warn; at 100% it shall block new uploads until usage is reduced or the plan upgraded. | At 80% a warning banner appears; at 100% upload is blocked with a clear upgrade path. |
| FR-SUB-004 | M | Quota enforcement shall be **fail-safe**: if metering is temporarily unavailable, the system denies new resource-consuming actions rather than allowing unlimited use. | With metering disabled, new uploads/jobs are blocked, not silently allowed. |
| FR-SUB-005 | M | Metered usage data shall be exposed to the companion billing system via a documented, authenticated interface. | The billing system retrieves per-organisation usage for a billing period via the interface. |
| FR-SUB-006 | M | The public API shall enforce **rate limiting** per API key and per organisation; exceeding the limit returns HTTP 429 with a `Retry-After` header. | Bursting past the limit returns 429; requests within the limit succeed. |
| FR-SUB-007 | S | A Billing Administrator shall be able to view current usage versus plan limits and request a plan change. | The role sees all usage metrics and can submit an upgrade/downgrade request. |

---

## SECTION 17 — EXTERNAL INTEGRATIONS

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-INT-001 | M | The Satellite & Analytics Service shall integrate with **Copernicus Data Space (Sentinel-1/2)** via OAuth client credentials for scene search and retrieval. | A search returns live Sentinel results; an expired token is auto-refreshed transparently. |
| FR-INT-002 | M | The platform shall integrate with **Google Earth Engine** via a service account for on-demand regional computation. | A GEE-backed computation returns a result; the integration uses a least-privilege service account. |
| FR-INT-003 | S | The platform shall integrate with **Planet Labs** via API key for commercial high-cadence imagery, available only to organisations with the entitlement. | Planet imagery is retrievable for entitled orgs; non-entitled orgs see the feature disabled with an explanation. |
| FR-INT-004 | M | The platform shall orchestrate **NodeODM** as a managed worker pool for photogrammetry. | The Drone Service dispatches jobs to a NodeODM node and retrieves outputs reliably. |
| FR-INT-005 | M | All third-party credentials (OAuth secrets, API keys, service-account keys) shall be retrieved at runtime from the managed secrets store — never from source, images, or plaintext config (cross-ref NFR-SEC-006). | A code/image/config scan finds zero embedded third-party secrets. |
| FR-INT-006 | M | A failure or outage of any single external source shall degrade only the dependent feature, with a clear user message, and shall not crash the service or affect other features. | Simulating a source outage disables only that source's features; the rest of the platform remains operational. |
| FR-INT-007 | S | Outbound calls to external sources shall apply timeouts, retries with backoff, and circuit breaking. | Under an induced slow/erroring upstream, requests fail fast and recover automatically when the upstream returns. |

---

## SECTION 18 — API & INTERFACE REQUIREMENTS

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| FR-API-001 | M | The platform shall expose a **versioned REST API** under `/api/v1`; breaking changes require a new version path, and a deprecated version is supported for ≥ 6 months. | The API responds under `/api/v1`; introducing a breaking change yields `/api/v2` while `/api/v1` continues. |
| FR-API-002 | M | Every API endpoint shall require authentication (session token or API key) and shall enforce RBAC (FR-RBAC-005). | An unauthenticated or under-privileged call returns `401`/`403`. |
| FR-API-003 | M | The platform shall provide a **WebSocket** interface for real-time job and notification updates, secured with TLS (`wss://`) and authenticated. | Job progress streams over an authenticated `wss://` connection; an unauthenticated connection is rejected. |
| FR-API-004 | S | The platform shall support outbound **webhooks** so an organisation can receive job-completion and failure events at its own endpoint, with signed payloads. | A configured webhook fires on job completion with a verifiable signature. |
| FR-API-005 | M | The API shall be documented with a machine-readable OpenAPI 3 specification kept in sync with the implementation. | The published OpenAPI document validates and matches live endpoint behaviour. |
| FR-API-006 | M | API error responses shall use consistent, structured bodies (code, message, correlation ID) and shall never leak stack traces or internal details. | Inducing errors returns structured bodies; no response contains a stack trace or internal hostname. |
| FR-API-007 | M | CORS shall be restricted to an explicit allow-list of the platform's own origins; wildcard (`*`) origins are prohibited in non-local environments. | The CORS configuration lists named origins only; a request from an unlisted origin is rejected. |

---

## SECTION 19 — NON-FUNCTIONAL REQUIREMENTS

### 19.1 Performance

| ID | Pri | Requirement | Target / Acceptance Criteria |
|---|---|---|---|
| NFR-PERF-001 | M | Orthomosaic tile load time in the viewer. | First tile visible within **2 s** on a 10 Mbps connection. |
| NFR-PERF-002 | M | Point-cloud initial render (1M points). | Initial render within **3 s** in the 3D viewer. |
| NFR-PERF-003 | M | NDVI computation request-to-display. | Within **10 s** for datasets up to 1 GB. |
| NFR-PERF-004 | M | Server-side upload throughput, single user. | At least **50 MB/s**. |
| NFR-PERF-005 | M | Dashboard time-to-interactive. | Under **1.5 s** (p95). |
| NFR-PERF-006 | S | API read endpoints latency. | p95 < **300 ms**, p99 < **800 ms** under nominal load. |

### 19.2 Scalability

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| NFR-SCAL-001 | M | Object storage shall scale to petabytes with no architectural change. | A storage-growth test to the planned ceiling requires no schema or topology change. |
| NFR-SCAL-002 | M | Processing shall be distributable across multiple compute nodes; ≥ 10 concurrent jobs per node pool without degradation. | A 10-job load test meets all PERF targets. |
| NFR-SCAL-003 | M | No hard limit on images per mission; missions of 10,000+ images shall be supported. | A 10,000-image mission ingests and processes successfully. |
| NFR-SCAL-004 | M | All stateless services shall scale horizontally; the platform shall support adding capacity without downtime. | Scaling a service out under load adds throughput with no dropped requests. |
| NFR-SCAL-005 | S | The platform shall support at least 1,000 concurrent active users across tenants without breaching PERF targets. | A 1,000-user load test meets PERF p95 targets. |

### 19.3 Availability & Reliability

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| NFR-AVAIL-001 | M | The platform shall provide a **99.9% monthly uptime** SLA for the web application and API. | Uptime monitoring confirms ≥ 99.9% over a rolling month. |
| NFR-AVAIL-002 | M | No single failed job shall affect other concurrently running jobs. | Failing one job in a 10-job test leaves the other 9 unaffected. |
| NFR-AVAIL-003 | M | No uploaded data shall be lost due to a system or node failure. | Killing services mid-workflow loses no confirmed-uploaded data. |
| NFR-AVAIL-004 | M | Deployments shall be zero-downtime (rolling or blue-green). | A production deploy completes with no failed user requests. |
| NFR-AVAIL-005 | S | The platform shall expose `liveness` and `readiness` health endpoints for every service. | Orchestrator health checks pass against each service. |

### 19.4 Disaster Recovery

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| NFR-DR-001 | M | Databases and object storage shall be backed up on an automated schedule; backups shall be encrypted and stored in a separate failure domain. | Backups exist, are encrypted, and reside in a separate region/zone. |
| NFR-DR-002 | M | **Recovery Point Objective (RPO) ≤ 1 hour.** | A simulated loss recovers data no older than 1 hour. |
| NFR-DR-003 | M | **Recovery Time Objective (RTO) ≤ 4 hours.** | A full DR drill restores service within 4 hours. |
| NFR-DR-004 | S | A DR restore drill shall be performed at least every 6 months and documented. | Drill records exist for the last two periods. |

### 19.5 Security

Security requirements target OWASP ASVS Level 2 (R2) and the OWASP API Security Top 10 (R3).

**Figure 7 — Network Security Zones**

```
                         ▲  INTERNET  — HTTPS / WSS only
                         │
╔════════════════════════╪═══════════ DMZ / PUBLIC ZONE ═══════════════════════╗
║              ┌─────────▼──────────┐                                          ║
║              │   API GATEWAY      │  ◀── the ONLY publicly reachable node     ║
║              │   Traefik / NGINX  │                                          ║
║              └─────────┬──────────┘                                          ║
╚════════════════════════╪══════════════════════════════════════════════════════╝
                         │  mTLS
╔════════════════════════╪═════════ PRIVATE APPLICATION ZONE ═══════════════════╗
║   ┌──────────────┐ ┌───▼──────────────┐ ┌────────────────────┐               ║
║   │ Core Service │ │ Drone Service    │ │ Satellite Service  │               ║
║   └──────┬───────┘ └───────┬──────────┘ └─────────┬──────────┘               ║
╚══════════╪═════════════════╪══════════════════════╪══════════════════════════╝
           │                 │                      │
╔══════════╪═════════════════╪══════════════════════╪═══════ DATA ZONE ═════════╗
║   ┌──────▼──────┐ ┌─────────▼─────────┐ ┌──────────▼──────────────┐           ║
║   │ PostgreSQL  │ │ Redis · RabbitMQ  │ │ Object Storage · NodeODM│           ║
║   │ + PostGIS   │ │                   │ │ worker pool             │           ║
║   └─────────────┘ └───────────────────┘ └─────────────────────────┘           ║
║   No inbound path from the internet — reachable only from the                 ║
║   application zone.  (NFR-SEC-013)                                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| NFR-SEC-001 | M | All network traffic — client↔platform and service↔service — shall use **TLS 1.2+**. Plaintext `http://`/`ws://` is prohibited outside local loopback. | A network scan finds no plaintext platform traffic; `http`/`ws` endpoints redirect to `https`/`wss`. |
| NFR-SEC-002 | M | All data **in transit** shall be encrypted (per NFR-SEC-001). | Verified by scan. |
| NFR-SEC-003 | M | All data **at rest** — databases, object storage, backups — shall be encrypted (AES-256 or equivalent). | Storage and backup configs show encryption enabled. |
| NFR-SEC-004 | M | The application shall be free of OWASP Top 10 vulnerabilities; SAST and dependency scanning shall run in CI and block on high/critical findings. | A CI run with an introduced critical vulnerability fails the build. |
| NFR-SEC-005 | M | A third-party **penetration test** shall be completed before production launch and at least annually; all high/critical findings remediated before release. | A pen-test report exists with high/critical items closed. |
| NFR-SEC-006 | M | **No secret** (DB password, API key, OAuth secret, service-account private key, JWT signing key) shall appear in source control, container images, logs, or plaintext config in any non-local environment. All secrets shall be retrieved at runtime from a managed secrets store. | Automated secret scanning of repo, images, and logs finds zero secrets; runtime config resolves from the secrets store. |
| NFR-SEC-007 | M | All credentials shall be **rotatable without downtime**, with a maximum rotation interval of 90 days for service credentials and immediate rotation on suspected exposure. | A credential rotation completes with zero failed requests; a documented rotation runbook exists. |
| NFR-SEC-008 | M | Default, shared, or weak credentials are prohibited in staging and production; every credential shall be unique and high-entropy. | A config audit finds no default credentials (e.g., `minioadmin`, `*_pass`); entropy meets policy. |
| NFR-SEC-009 | M | Object-storage CORS shall be restricted to explicit platform origins; storage buckets shall not be publicly listable or readable. | Buckets reject anonymous access and list requests; CORS has no wildcard. |
| NFR-SEC-010 | M | Service-to-service and service-to-datastore credentials shall follow **least privilege**; each service holds only the permissions it needs. | An access-review audit confirms minimal scopes per service account. |
| NFR-SEC-011 | M | The platform shall set security headers: HSTS, `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`/frame-ancestors, and `Referrer-Policy`. | A header scan confirms all are present and correctly configured. |
| NFR-SEC-012 | M | All user and API input shall be validated and sanitised server-side; the platform shall be resistant to injection (SQL, command, path) and SSRF. | Injection and SSRF test suites pass with no successful exploit. |
| NFR-SEC-013 | M | Network segmentation shall isolate internal services (databases, brokers, NodeODM, MinIO) from the public internet; only the API Gateway is publicly reachable. | A port scan from the public internet reaches only the gateway. |
| NFR-SEC-014 | M | The platform shall maintain an **immutable, tamper-evident audit log** of security-relevant events: logins, failures, RBAC changes, data exports, deletions, admin actions, and impersonation. Each entry records actor, action, target, timestamp, and source IP. | Audit entries cannot be edited or deleted by any user role; a sample of each event type appears correctly. |
| NFR-SEC-015 | M | Vendor (Platform) staff access to tenant data shall require **break-glass / consent-based, time-boxed impersonation**, fully audit-logged and visible to the tenant. | A support impersonation session is time-limited, logged, and surfaced in the tenant's audit view. |
| NFR-SEC-016 | S | Dependencies shall be continuously monitored for known CVEs; critical CVEs shall be patched within 7 days. | A dependency dashboard shows current CVE status and patch SLAs met. |

### 19.6 Privacy & Compliance

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| NFR-PRIV-001 | M | The platform shall comply with **GDPR** (R6): lawful basis, data-subject access, rectification, and erasure ("right to be forgotten"). | A data-subject erasure request removes the individual's personal data within the statutory window. |
| NFR-PRIV-002 | M | Personal data shall be inventoried; a Record of Processing Activities shall be maintained. | A current data-processing inventory exists. |
| NFR-PRIV-003 | M | The platform shall honour the per-organisation **data-residency** region (FR-TEN-006) for all primary data and backups. | A residency audit shows no data outside the assigned region. |
| NFR-PRIV-004 | S | The platform's controls shall be designed to satisfy a **SOC 2 Type II** audit (R4) and align with **ISO/IEC 27001** (R5). | A readiness assessment maps platform controls to SOC 2 / ISO 27001 criteria with no critical gaps. |
| NFR-PRIV-005 | M | Tenant data shall be used only to provide the service; it shall not be used to train shared models without explicit, revocable opt-in. | The data-use policy and configuration enforce opt-in; default is opt-out. |

### 19.7 Observability

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| NFR-OBS-001 | M | All services shall emit **structured logs** (JSON) with a correlation ID propagated across the request/event path; logs shall never contain secrets or full personal data. | A single request is traceable end-to-end by correlation ID; a log scan finds no secrets. |
| NFR-OBS-002 | M | The platform shall expose **metrics** (request rate, latency, error rate, queue depth, job durations, resource use) to a monitoring system. | A metrics dashboard shows all listed metrics in real time. |
| NFR-OBS-003 | S | The platform shall support **distributed tracing** across gateway, services, and workers. | A trace spans all services involved in a photogrammetry job. |
| NFR-OBS-004 | M | **Alerting** shall notify on-call staff on SLA breach, elevated error rate, queue backlog, storage pressure, and security anomalies. | A simulated error spike triggers an alert within 5 minutes. |
| NFR-OBS-005 | S | Logs and metrics shall be retained for at least 90 days, and audit logs for at least 1 year. | Retention configuration matches; older audit entries remain queryable for 1 year. |

### 19.8 Data Accuracy

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| NFR-DATA-ACC-001 | M | Orthomosaic absolute positional accuracy with GPS-tagged images shall be within **1–3 GSD**. | Verified against surveyed checkpoints for a reference dataset. |
| NFR-DATA-ACC-002 | M | With GCPs, accuracy shall be within **1–2 cm horizontal, 2–3 cm vertical** (sub-centimetre achievable with RTK drones). | Verified against GCP checkpoints for a reference dataset. |
| NFR-DATA-ACC-003 | M | Spectral index calculations shall use correct sensor band-wavelength metadata. | A computed index for a known scene matches a reference value within tolerance. |

### 19.9 Accessibility, Compatibility & Maintainability

| ID | Pri | Requirement | Acceptance Criteria |
|---|---|---|---|
| NFR-ACC-001 | M | The application (excluding inherently visual 3D rendering) shall conform to **WCAG 2.1 Level AA** (R7): keyboard navigation, screen-reader labels, and sufficient contrast. | An accessibility audit reports no Level AA violations on core flows. |
| NFR-COMPAT-001 | M | The full application, including the 3D viewer, shall operate on the latest two major versions of Chrome, Firefox, Safari, and Edge. | A cross-browser test suite passes on all eight targets. |
| NFR-MAINT-001 | M | The platform shall maintain automated test coverage with CI gating; a defined minimum coverage threshold blocks merges below it. | CI rejects a merge that drops coverage below the threshold. |
| NFR-MAINT-002 | M | Infrastructure shall be defined as code; environments shall be reproducible from version-controlled definitions. | A non-production environment is recreated from IaC with no manual steps. |
| NFR-MAINT-003 | S | Each microservice and microfrontend shall be independently deployable without redeploying others. | Deploying the Geospatial Viewer MFE requires no redeploy of the Host Shell or other MFEs. |

---

## SECTION 20 — VERIFICATION, VALIDATION & ACCEPTANCE

### 20.1 Verification Methods

Each requirement shall be verified by one or more of: **T** Test (automated/manual), **D** Demonstration, **I** Inspection (code/config review), **A** Analysis.

**Figure 8 — Requirements Traceability Chain**

```
  SRS REQUIREMENT        DESIGN             IMPLEMENTATION        VERIFICATION
  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   ┌───────────────┐
  │ FR-RBAC-005  │──▶│ ADR / design │──▶│ Gateway + service│──▶│ Test case(s)  │
  │ NFR-SEC-014  │   │ document     │   │ code · config    │   │ method T/D/I/A│
  └──────┬───────┘   └──────────────┘   └──────────────────┘   └──────┬────────┘
         │                                                            │
         └──────────── REQUIREMENTS TRACEABILITY MATRIX ◀──────────────┘
            every requirement ⇄ ≥1 test case ⇄ ≥1 verification method
            release-eligible only when 100% of MUST requirements pass
```

### 20.2 Acceptance Process

| ID | Requirement |
|---|---|
| V-001 | Every `FR-*` and `NFR-*` requirement shall be linked, in a **Requirements Traceability Matrix (RTM)**, to at least one test case and at least one verification method. |
| V-002 | A release is acceptance-eligible only when 100% of **Must (M)** requirements pass and no high/critical defect is open. |
| V-003 | Scaffolding verification: the Host Shell, Dashboard MFE, and Viewer MFE initialise with Module Federation; the Host Shell loads the Viewer MFE from its own deployment. |
| V-004 | Microservice event verification: the Core Service emits an event that triggers a background task in a Python service via RabbitMQ, observed end-to-end. |
| V-005 | Multi-tenant isolation verification: an automated cross-tenant access suite (FR-TEN-003) passes with zero leakage. |
| V-006 | RBAC verification: an automated matrix test exercises every role against every permission-gated action and confirms Appendix C. |
| V-007 | Security verification: SAST, dependency scan, secret scan, and a third-party penetration test all pass before production launch. |
| V-008 | Performance verification: a load test confirms all `NFR-PERF-*` and `NFR-SCAL-*` targets. |
| V-009 | DR verification: a restore drill confirms `NFR-DR-002` (RPO) and `NFR-DR-003` (RTO). |

---

## APPENDIX A — GLOSSARY

| Term | Definition |
|---|---|
| AOI | Area of Interest — the geographic boundary within which analysis is performed |
| Band | A single-channel image representing reflectance at a specific wavelength |
| COG | Cloud-Optimized GeoTIFF — a GeoTIFF structured for efficient HTTP range-request access |
| CRS | Coordinate Reference System — defines how map coordinates relate to locations on Earth |
| DSM | Digital Surface Model — elevation including tops of all surfaces (buildings, trees) |
| DTM | Digital Terrain Model — bare-ground elevation with vegetation/structures removed |
| EXIF | Exchangeable Image File Format — metadata embedded by cameras |
| GCP | Ground Control Point — a surveyed point of known coordinates used to improve accuracy |
| GeoTIFF | A raster format embedding geographic coordinate information in a TIFF |
| GSD | Ground Sample Distance — real-world size of one pixel in a processed orthomosaic |
| JWT | JSON Web Token — signed token used for stateless authentication claims |
| LAZ | Compressed LAS format for point-cloud storage |
| MFA | Multi-Factor Authentication |
| MFE | Microfrontend — an independently deployable frontend module |
| MoSCoW | Prioritisation scheme: Must / Should / Could / Won't |
| NDVI | Normalized Difference Vegetation Index — vegetation health from red and NIR bands |
| NodeODM | Open-source photogrammetry engine converting drone photos into orthomosaics and 3D outputs |
| Orthomosaic | A geometrically corrected, georeferenced aerial image mosaic of uniform scale |
| Photogrammetry | Extracting 3D measurements and maps from overlapping 2D photographs |
| Point Cloud | A 3D scene represented as millions of XYZ coordinate points |
| RBAC | Role-Based Access Control — permissions grouped into roles assigned to users |
| RPO / RTO | Recovery Point / Time Objective — max tolerable data loss / downtime |
| RLS | Row-Level Security — database-enforced per-row access control |
| SAR | Synthetic Aperture Radar — active microwave sensor; sees through clouds |
| SCIM | System for Cross-domain Identity Management — automated user provisioning |
| SLA | Service Level Agreement |
| SSO | Single Sign-On — federated authentication via an external identity provider |
| Tenant | A customer Organisation; the top-level isolation boundary |
| 3D Tiles | A Cesium/OGC standard for streaming massive 3D geospatial datasets in browsers |

---

## APPENDIX B — CURRENT CONFIGURATION GAP ANALYSIS

This appendix maps deficiencies found in the platform's current environment configuration (`.env`, service-account key file) to the requirements that resolve them. **All items marked Critical require credential rotation before any production use.**

| # | Finding in current config | Risk | Severity | Resolved by |
|---|---|---|---|---|
| B1 | Google Cloud service-account **private key committed as a plaintext file** in the project directory. | Full impersonation of the service account if the repo or image leaks. | 🔴 Critical | NFR-SEC-006, FR-INT-005, NFR-SEC-007 |
| B2 | **SentinelHub client secret** and **Planet Labs API key** stored in plaintext `.env`. | Third-party account abuse, quota theft, billing fraud. | 🔴 Critical | NFR-SEC-006, FR-INT-005 |
| B3 | **Default / weak credentials** — `MINIO_ACCESS_KEY=minioadmin`, `MINIO_SECRET_KEY=minioadmin`, `map_admin_pass`, `map_mq_pass`. | Trivial unauthorised access to storage, database, and message bus. | 🟠 High | NFR-SEC-008, NFR-SEC-007 |
| B4 | `MINIO_API_CORS_ORIGIN="*"` — **wildcard CORS** on object storage. | Any website can issue cross-origin requests to storage. | 🟠 High | NFR-SEC-009, FR-API-007 |
| B5 | Service URLs use **plaintext `http://` and `ws://`** (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NODEODM_URL`, `REDIS_URL`). | Traffic interception, credential and token theft. | 🟠 High | NFR-SEC-001, NFR-SEC-002, FR-API-003 |
| B6 | Credentials **embedded in connection strings** (`DATABASE_URL`, `RABBITMQ_URL`) in plaintext config. | Secret sprawl; secrets appear in logs and process listings. | 🟠 High | NFR-SEC-006, NFR-OBS-001 |
| B7 | **No secrets-management** mechanism; all configuration is a flat `.env` file. | No rotation, no audit, no access control over secrets. | 🟠 High | NFR-SEC-006, NFR-SEC-007, A4 |
| B8 | **No environment separation** — a single config implies one environment. | Staging/production share fate; no safe testing. | 🟡 Medium | Section 3.3, NFR-MAINT-002 |
| B9 | Drone and Satellite services both configured on **port 8000** with no isolation note. | Port collision; ambiguous service boundaries. | 🟡 Medium | Section 3.1, NFR-SEC-013 |
| B10 | No authentication configured for **Redis, RabbitMQ management, MinIO console, NodeODM** beyond defaults. | Internal services may be reachable and unauthenticated. | 🟠 High | NFR-SEC-013, NFR-SEC-010 |

### B.1 Immediate Remediation Checklist (pre-production)

1. **Rotate every credential** listed above — the GEE key, SentinelHub secret, Planet key, and all datastore passwords are to be treated as compromised.
2. Remove `clawapp-mail-097f5238110b.json` and `.env` from the working tree; add them to `.gitignore`; never commit secrets.
3. Move all secrets into a managed secrets store; inject at runtime only.
4. Replace all default passwords with unique, high-entropy values.
5. Restrict object-storage CORS to named platform origins; disable public bucket access.
6. Terminate TLS at the gateway; use `https://`/`wss://` everywhere; place datastores on a private network.
7. Stand up separate `development`, `staging`, and `production` environments with isolated credentials.

---

## APPENDIX C — RBAC PERMISSION MATRIX (NORMATIVE)

Legend: ● Full · ◐ Limited / own-scope only · ○ None.

| Action | Plat. SuperAdmin | Org Owner | Org Admin | Billing Admin | Workspace Manager | Operator | Analyst | Viewer | Guest |
|---|---|---|---|---|---|---|---|---|---|
| Manage organisation settings | ● | ● | ◐ | ○ | ○ | ○ | ○ | ○ | ○ |
| Delete / transfer organisation | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Manage subscription & billing | ◐ | ● | ○ | ● | ○ | ○ | ○ | ○ | ○ |
| Configure SSO / SCIM | ● | ● | ◐ | ○ | ○ | ○ | ○ | ○ | ○ |
| Invite / remove members | ◐ | ● | ● | ○ | ◐ | ○ | ○ | ○ | ○ |
| Assign roles | ◐ | ● | ● | ○ | ◐ | ○ | ○ | ○ | ○ |
| Create / manage workspaces | ● | ● | ● | ○ | ◐ | ○ | ○ | ○ | ○ |
| Create / configure projects | ○ | ● | ● | ○ | ● | ● | ○ | ○ | ○ |
| Upload imagery | ○ | ● | ● | ○ | ● | ● | ○ | ○ | ○ |
| Launch processing jobs | ○ | ● | ● | ○ | ● | ● | ◐ | ○ | ○ |
| Run analytics / indices / ML | ○ | ● | ● | ○ | ● | ● | ● | ○ | ○ |
| View map & outputs | ◐ | ● | ● | ○ | ● | ● | ● | ● | ◐ |
| Measure & annotate (saved) | ○ | ● | ● | ○ | ● | ● | ● | ○ | ○ |
| Export deliverables / reports | ○ | ● | ● | ○ | ● | ● | ● | ◐ | ◐ |
| Delete files / missions / projects | ○ | ● | ● | ○ | ● | ◐ | ○ | ○ | ○ |
| View audit log | ● | ● | ● | ○ | ◐ | ○ | ○ | ○ | ○ |
| Access another tenant's data | ◐* | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |

\* Platform Super Admin access to tenant content requires break-glass, time-boxed, audited impersonation (NFR-SEC-015) — never silent or unrestricted.

---

**END OF DOCUMENT — Software Requirements Specification v2.0**
*Enterprise Drone & Satellite Image Processing Platform — SaaS Edition*
*Confidential — Internal Use Only*
