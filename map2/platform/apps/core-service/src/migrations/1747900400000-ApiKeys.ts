import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Programmatic API access — keys an organisation can issue and revoke
 * (SRS §6 / Permission.API_KEY_MANAGE, §11 Public API). Each row stores
 * only a salted SHA-256 of the secret; the cleartext is shown to the
 * caller exactly once at creation. Tenant-isolated with Row-Level
 * Security.
 */
export class ApiKeys1747900400000 implements MigrationInterface {
  name = 'ApiKeys1747900400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE api_keys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id uuid NOT NULL
          REFERENCES organisations(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        prefix varchar(20) NOT NULL,
        key_hash varchar(128) NOT NULL UNIQUE,
        scopes text[] NOT NULL DEFAULT '{}',
        expires_at timestamptz,
        last_used_at timestamptz,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid REFERENCES users(id) ON DELETE SET NULL
      )`);
    await queryRunner.query(
      `CREATE INDEX api_keys_organisation_id_idx ON api_keys (organisation_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX api_keys_key_hash_active_idx ON api_keys (key_hash) WHERE revoked_at IS NULL`,
    );

    await queryRunner.query(`ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE api_keys FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY api_keys_tenant_isolation ON api_keys
      USING (organisation_id = current_setting('app.current_organisation_id', true)::uuid)
    `);
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO map_app`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS api_keys_tenant_isolation ON api_keys`);
    await queryRunner.query(`DROP TABLE IF EXISTS api_keys CASCADE`);
  }
}
