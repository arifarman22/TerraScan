import { Column, Entity } from 'typeorm';
import type { AuthMethod, MfaMethod, UserStatus } from '@platform/shared-types';
import { TenantEntity } from './base.entity';

/**
 * A platform user. Unlike the `User` DTO in shared-types, this entity also
 * holds server-only credential material (`passwordHash`, `mfaSecret`) which
 * is never serialised to clients (SRS FR-AUTH-002).
 */
@Entity('users')
export class UserEntity extends TenantEntity {
  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  fullName!: string;

  @Column({ type: 'varchar', length: 20, default: 'INVITED' })
  status!: UserStatus;

  @Column({ type: 'varchar', length: 20, default: 'PASSWORD' })
  authMethod!: AuthMethod;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'NONE' })
  mfaMethod!: MfaMethod;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mfaSecret!: string | null;

  @Column({ type: 'boolean', default: false })
  mfaEnrolled!: boolean;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  avatarUrl!: string | null;
}
