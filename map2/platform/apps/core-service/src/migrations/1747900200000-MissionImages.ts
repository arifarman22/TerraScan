import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `mission_images` table — one row per uploaded image
 * (SRS §8, FR-IMG-007/008). Tenant-isolated with Row-Level Security,
 * consistent with every other tenant table.
 */
export class MissionImages1747900200000 implements MigrationInterface {
  name = 'MissionImages1747900200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE mission_images (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id uuid NOT NULL
          REFERENCES organisations(id) ON DELETE CASCADE,
        mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
        file_name varchar(512) NOT NULL,
        storage_key varchar(1024) NOT NULL,
        size_bytes bigint NOT NULL DEFAULT 0,
        checksum_sha256 varchar(64) NOT NULL,
        content_type varchar(100) NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        has_gps boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX mission_images_organisation_id_idx ON mission_images (organisation_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX mission_images_mission_id_idx ON mission_images (mission_id)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX mission_images_storage_key_uq ON mission_images (storage_key)`,
    );

    await queryRunner.query(
      `ALTER TABLE mission_images ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON mission_images
        USING (organisation_id = NULLIF(current_setting('app.current_organisation_id', true), '')::uuid)
        WITH CHECK (organisation_id = NULLIF(current_setting('app.current_organisation_id', true), '')::uuid)
    `);
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON mission_images TO map_app`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS mission_images CASCADE`);
  }
}
