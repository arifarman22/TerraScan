import { Column, Entity } from 'typeorm';
import type { JobStatus, JobType, QualityPreset } from '@platform/shared-types';
import { TenantEntity } from './base.entity';

/** A processing job record (SRS §14). */
@Entity('jobs')
export class JobEntity extends TenantEntity {
  @Column({ type: 'uuid' })
  projectId!: string;

  @Column({ type: 'uuid' })
  missionId!: string;

  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'varchar', length: 30 })
  type!: JobType;

  @Column({ type: 'varchar', length: 30, default: 'SUBMITTED' })
  status!: JobStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  preset!: QualityPreset | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  config!: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  progressPercent!: number;

  @Column({ type: 'uuid' })
  submittedByUserId!: string;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'int', nullable: true })
  etaSeconds!: number | null;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  engineVersion!: string | null;
}
