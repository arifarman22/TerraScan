import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type {
  OutputFormat,
  OutputType,
  RasterStatistics,
} from '@platform/shared-types';
import { bigintTransformer } from '../database/column-transformers';

/**
 * A deliverable produced by a processing job (SRS §5.4 / FR-DATA-004).
 * Insert-only and versioned — re-running a job creates a new row, never
 * mutating an existing one. Tenant-isolated via RLS (Phase 2 migration).
 */
@Entity('processing_outputs')
export class ProcessingOutputEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  organisationId!: string;

  @Column({ type: 'uuid' })
  jobId!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @Column({ type: 'uuid' })
  missionId!: string;

  @Column({ type: 'varchar', length: 30 })
  type!: OutputType;

  @Column({ type: 'varchar', length: 20 })
  format!: OutputFormat;

  @Column({ type: 'varchar', length: 1024 })
  storageKey!: string;

  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  sizeBytes!: number;

  @Column({ type: 'varchar', length: 64, default: '' })
  checksumSha256!: string;

  @Column({ type: 'int', nullable: true })
  crs!: number | null;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'jsonb', nullable: true })
  statistics!: RasterStatistics | null;

  @Column({ type: 'double precision', nullable: true })
  groundSampleDistanceM!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
