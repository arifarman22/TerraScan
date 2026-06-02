import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for the Core Management Service.
 *
 * Creates the ten core tables — every tenant-scoped table carries a
 * non-nullable `organisation_id` — and enforces tenant isolation with
 * PostgreSQL Row-Level Security (SRS FR-TEN-001/003/004).
 *
 * A least-privilege runtime role (`map_app`) is created: it is NOT the table
 * owner, so RLS policies apply to it. Migrations run as the owning role,
 * which bypasses RLS. The runtime connection is switched to `map_app` in
 * Phase 1E, together with the per-request tenant-context interceptor.
 *
 * The audit log is insert-only: UPDATE/DELETE are revoked from `map_app`
 * and no UPDATE/DELETE policy exists, making it tamper-evident
 * (SRS NFR-SEC-014).
 */
export class InitialSchema1747900000000 implements MigrationInterface {
  name = 'InitialSchema1747900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const appPassword = process.env.DATABASE_APP_PASSWORD ?? 'map_app_pass';

    // --- Extensions (idempotent; normally pre-created by infra initdb) ----
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    // --- organisations ---------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE organisations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        legal_name varchar(255) NOT NULL,
        slug varchar(120) NOT NULL UNIQUE,
        status varchar(20) NOT NULL DEFAULT 'ACTIVE'
          CHECK (status IN ('ACTIVE','SUSPENDED','CLOSED')),
        region varchar(10) NOT NULL
          CHECK (region IN ('EU','US','UK','APAC')),
        subscription_tier varchar(20) NOT NULL DEFAULT 'TRIAL'
          CHECK (subscription_tier IN ('TRIAL','PROFESSIONAL','ENTERPRISE')),
        limits jsonb NOT NULL DEFAULT '{}'::jsonb,
        primary_contact_email varchar(320) NOT NULL,
        suspended_at timestamptz,
        closed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);

    // --- users -----------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id uuid NOT NULL
          REFERENCES organisations(id) ON DELETE CASCADE,
        email varchar(320) NOT NULL,
        full_name varchar(255) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'INVITED'
          CHECK (status IN ('INVITED','ACTIVE','DISABLED','LOCKED')),
        auth_method varchar(20) NOT NULL DEFAULT 'PASSWORD'
          CHECK (auth_method IN ('PASSWORD','SSO_SAML','SSO_OIDC')),
        password_hash varchar(255),
        mfa_method varchar(20) NOT NULL DEFAULT 'NONE'
          CHECK (mfa_method IN ('NONE','TOTP')),
        mfa_secret varchar(255),
        mfa_enrolled boolean NOT NULL DEFAULT false,
        failed_login_attempts int NOT NULL DEFAULT 0,
        locked_until timestamptz,
        last_login_at timestamptz,
        avatar_url varchar(1024),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX users_email_uq ON users (lower(email))`,
    );
    await queryRunner.query(
      `CREATE INDEX users_organisation_id_idx ON users (organisation_id)`,
    );

    // --- workspaces ------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE workspaces (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id uuid NOT NULL
          REFERENCES organisations(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        slug varchar(120) NOT NULL,
        description text NOT NULL DEFAULT '',
        archived boolean NOT NULL DEFAULT false,
        created_by_user_id uuid NOT NULL REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX workspaces_organisation_id_idx ON workspaces (organisation_id)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX workspaces_org_slug_uq ON workspaces (organisation_id, slug)`,
    );

    // --- projects --------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id uuid NOT NULL
          REFERENCES organisations(id) ON DELETE CASCADE,
        workspace_id uuid NOT NULL
          REFERENCES workspaces(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        type varchar(30) NOT NULL
          CHECK (type IN ('DRONE_SURVEY','SATELLITE_ANALYSIS','COMBINED')),
        status varchar(20) NOT NULL DEFAULT 'DRAFT'
          CHECK (status IN ('DRAFT','UPLOADING','PROCESSING','COMPLETED','FAILED','ARCHIVED')),
        description text NOT NULL DEFAULT '',
        region_of_interest geometry(Polygon,4326),
        created_by_user_id uuid NOT NULL REFERENCES users(id),
        last_activity_at timestamptz NOT NULL DEFAULT now(),
        thumbnail_key varchar(1024),
        storage_bytes bigint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX projects_organisation_id_idx ON projects (organisation_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX projects_workspace_id_idx ON projects (workspace_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX projects_roi_gist ON projects USING gist (region_of_interest)`,
    );

    // --- missions --------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE missions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id uuid NOT NULL
          REFERENCES organisations(id) ON DELETE CASCADE,
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        source_type varchar(20) NOT NULL
          CHECK (source_type IN ('DRONE','SATELLITE')),
        status varchar(20) NOT NULL DEFAULT 'CREATED'
          CHECK (status IN ('CREATED','UPLOADING','READY','PROCESSING','COMPLETED','FAILED')),
        collected_at timestamptz,
        coverage_area geometry(Polygon,4326),
        file_count int NOT NULL DEFAULT 0,
        raw_size_bytes bigint NOT NULL DEFAULT 0,
        created_by_user_id uuid NOT NULL REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX missions_organisation_id_idx ON missions (organisation_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX missions_project_id_idx ON missions (project_id)`,
    );

    // --- jobs ------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id uuid NOT NULL
          REFERENCES organisations(id) ON DELETE CASCADE,
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
        workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        type varchar(30) NOT NULL,
        status varchar(30) NOT NULL DEFAULT 'SUBMITTED',
        preset varchar(20),
        config jsonb NOT NULL DEFAULT '{}'::jsonb,
        progress_percent int NOT NULL DEFAULT 0,
        submitted_by_user_id uuid NOT NULL REFERENCES users(id),
        started_at timestamptz,
        completed_at timestamptz,
        eta_seconds int,
        retry_count int NOT NULL DEFAULT 0,
        error_message text,
        engine_version varchar(100),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX jobs_organisation_id_idx ON jobs (organisation_id)`,
    );
    await queryRunner.query(`CREATE INDEX jobs_mission_id_idx ON jobs (mission_id)`);
    await queryRunner.query(
      `CREATE INDEX jobs_org_status_idx ON jobs (organisation_id, status)`,
    );

    // --- permissions (global catalogue, no RLS) --------------------------
    await queryRunner.query(`
      CREATE TABLE permissions (
        code varchar(80) PRIMARY KEY,
        description varchar(255) NOT NULL,
        category varchar(40) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);

    // --- roles -----------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        system_role varchar(40),
        scope varchar(20) NOT NULL
          CHECK (scope IN ('PLATFORM','ORGANISATION','WORKSPACE','PROJECT')),
        description text NOT NULL DEFAULT '',
        permissions text[] NOT NULL DEFAULT '{}',
        is_system boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX roles_system_role_uq ON roles (system_role) WHERE system_role IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX roles_org_name_uq ON roles (organisation_id, name) WHERE organisation_id IS NOT NULL`,
    );

    // --- role_assignments ------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE role_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id uuid NOT NULL
          REFERENCES organisations(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        scope varchar(20) NOT NULL
          CHECK (scope IN ('PLATFORM','ORGANISATION','WORKSPACE','PROJECT')),
        scope_id uuid,
        granted_by_user_id uuid NOT NULL REFERENCES users(id),
        expires_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX role_assignments_organisation_id_idx ON role_assignments (organisation_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX role_assignments_user_id_idx ON role_assignments (user_id)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX role_assignments_unique ON role_assignments
         (user_id, role_id, scope, scope_id) NULLS NOT DISTINCT`,
    );

    // --- audit_log (insert-only) -----------------------------------------
    await queryRunner.query(`
      CREATE TABLE audit_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id uuid NOT NULL
          REFERENCES organisations(id) ON DELETE CASCADE,
        actor_user_id uuid REFERENCES users(id),
        action varchar(100) NOT NULL,
        resource_type varchar(60) NOT NULL,
        resource_id uuid,
        "before" jsonb,
        "after" jsonb,
        ip_address inet,
        user_agent text,
        correlation_id uuid,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX audit_log_org_created_idx ON audit_log (organisation_id, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX audit_log_resource_idx ON audit_log (resource_type, resource_id)`,
    );

    // --- Row-Level Security ----------------------------------------------
    // Tenant tables: a row is visible only when its organisation_id matches
    // the per-connection GUC `app.current_organisation_id`. An unset GUC
    // yields NULL, so nothing is visible — deny-by-default (SRS FR-RBAC-006).
    const tenantTables = [
      'users',
      'workspaces',
      'projects',
      'missions',
      'jobs',
      'role_assignments',
    ];
    for (const table of tenantTables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        CREATE POLICY tenant_isolation ON ${table}
          USING (organisation_id = NULLIF(current_setting('app.current_organisation_id', true), '')::uuid)
          WITH CHECK (organisation_id = NULLIF(current_setting('app.current_organisation_id', true), '')::uuid)
      `);
    }

    // organisations: a tenant sees only its own organisation row.
    await queryRunner.query(`ALTER TABLE organisations ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON organisations
        USING (id = NULLIF(current_setting('app.current_organisation_id', true), '')::uuid)
        WITH CHECK (id = NULLIF(current_setting('app.current_organisation_id', true), '')::uuid)
    `);

    // roles: built-in system roles (organisation_id IS NULL) are readable by
    // every tenant; custom roles are isolated. Tenants cannot create system
    // roles (WITH CHECK requires an organisation match).
    await queryRunner.query(`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON roles
        USING (
          organisation_id IS NULL
          OR organisation_id = NULLIF(current_setting('app.current_organisation_id', true), '')::uuid
        )
        WITH CHECK (organisation_id = NULLIF(current_setting('app.current_organisation_id', true), '')::uuid)
    `);

    // audit_log: tenant-isolated, insert-only — no UPDATE/DELETE policy.
    await queryRunner.query(`ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY audit_select ON audit_log FOR SELECT
        USING (organisation_id = NULLIF(current_setting('app.current_organisation_id', true), '')::uuid)
    `);
    await queryRunner.query(`
      CREATE POLICY audit_insert ON audit_log FOR INSERT
        WITH CHECK (organisation_id = NULLIF(current_setting('app.current_organisation_id', true), '')::uuid)
    `);

    // --- Least-privilege runtime role ------------------------------------
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'map_app') THEN
          CREATE ROLE map_app LOGIN PASSWORD '${appPassword}';
        END IF;
      END
      $$`);
    await queryRunner.query(`GRANT USAGE ON SCHEMA public TO map_app`);
    await queryRunner.query(`
      GRANT SELECT, INSERT, UPDATE, DELETE ON
        organisations, users, workspaces, projects, missions, jobs,
        roles, role_assignments
      TO map_app`);
    await queryRunner.query(`GRANT SELECT, INSERT ON audit_log TO map_app`);
    await queryRunner.query(`GRANT SELECT ON permissions TO map_app`);
    await queryRunner.query(`
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO map_app`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'audit_log',
      'role_assignments',
      'roles',
      'permissions',
      'jobs',
      'missions',
      'projects',
      'workspaces',
      'users',
      'organisations',
    ]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'map_app') THEN
          DROP OWNED BY map_app;
          DROP ROLE map_app;
        END IF;
      END
      $$`);
  }
}
