-- ============================================================
-- PostGIS / extension bootstrap
-- Executed once, on first cluster initialisation, against POSTGRES_DB
-- by the postgis/postgis entrypoint (docker-entrypoint-initdb.d).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- The least-privilege runtime application role (used with PostgreSQL
-- Row-Level Security for tenant isolation — SRS FR-TEN-004 / NFR-SEC-010)
-- is created by the Core Service migrations in Phase 1. The bootstrap
-- superuser is reserved for migrations and extension management only.
