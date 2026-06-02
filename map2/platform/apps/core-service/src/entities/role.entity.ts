import { Column, Entity } from 'typeorm';
import type { Permission, RoleScope, SystemRole } from '@platform/shared-types';
import { BaseEntity } from './base.entity';

/**
 * A role — a named, scoped bundle of permissions (SRS §6).
 * `organisationId` is NULL for built-in system roles (shared across all
 * tenants) and set for organisation-defined custom roles (SRS FR-RBAC-004).
 */
@Entity('roles')
export class RoleEntity extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  organisationId!: string | null;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  systemRole!: SystemRole | null;

  @Column({ type: 'varchar', length: 20 })
  scope!: RoleScope;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  permissions!: Permission[];

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;
}
