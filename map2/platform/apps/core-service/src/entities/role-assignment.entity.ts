import { Column, Entity } from 'typeorm';
import type { RoleScope } from '@platform/shared-types';
import { TenantEntity } from './base.entity';

/** Binds a user to a role at a concrete scope instance (SRS FR-RBAC-002). */
@Entity('role_assignments')
export class RoleAssignmentEntity extends TenantEntity {
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  roleId!: string;

  @Column({ type: 'varchar', length: 20 })
  scope!: RoleScope;

  /** Id of the scoped resource; NULL at PLATFORM scope. */
  @Column({ type: 'uuid', nullable: true })
  scopeId!: string | null;

  @Column({ type: 'uuid' })
  grantedByUserId!: string;

  /** Optional expiry — used for time-limited External Reviewer grants. */
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;
}
