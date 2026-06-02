import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `processing_outputs` table — one row per deliverable produced by
 * a processing job (SRS §5.4 / FR-DATA-004). Outputs are immutable and
 * versioned. Tenant-isolated with Row-Level Security.
 */
export class ProcessingOutputs1747900300000 implements MigrationInterface {
  name = 'ProcessingOutputs1747900300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE processing_outputs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id uuid NOT NULL
          REFERENCES organisations(id) ON DELETE CASCADE,
        job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
        type varchar(30) NOT NULL,
        format varchar(20) NOT NULL,
        storage_key varchar(1024) NOT NULL,
        size_bytes bigint NOT NULL DEFAULT 0,
        checksum_sha256 varchar(64) NOT NULL DEFAULT '',
        crs int,
        version int NOT NULL DEFAULT 1,
        statistics jsonb,
        ground_sample_distance_m double precision,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX processing_outputs_organisation_id_idx ON processing_outputs (organisation_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX processing_outputs_job_id_idx ON processing_outputs (job_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX processing_outputs_mission_id_idx ON processing_outputs (mission_id)`,
    );

    await queryRunner.query(
      `ALTER TABLE processing_outputs ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON processing_outputs
        USING (organisation_id = NULLIF(current_setting('app.current_organisation_id', true), '')::uuid)
        WITH CHECK (organisation_id = NULLIF(current_setting('app.current_organisation_id', true), '')::uuid)
    `);
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON processing_outputs TO map_app`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS processing_outputs CASCADE`);
  }
}
