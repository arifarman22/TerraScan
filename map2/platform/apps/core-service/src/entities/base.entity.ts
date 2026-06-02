/**
 * Abstract entity base classes.
 */
import {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Fields present on every persisted record. */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

/**
 * Base for every tenant-scoped record. `organisationId` is the partition key
 * enforced by PostgreSQL Row-Level Security (SRS FR-TEN-003 / FR-TEN-004).
 */
export abstract class TenantEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  organisationId!: string;
}
