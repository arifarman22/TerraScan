/**
 * User, session, and credential types — SRS §5.
 */
import type { BaseEntity, ISODateString, UUID } from './common.js';

/** Account lifecycle state — SRS §5. */
export enum UserStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  LOCKED = 'LOCKED',
}

/** Supported authentication methods — SRS FR-AUTH-001 / FR-AUTH-010. */
export enum AuthMethod {
  PASSWORD = 'PASSWORD',
  SSO_SAML = 'SSO_SAML',
  SSO_OIDC = 'SSO_OIDC',
}

/** Multi-factor method — SRS FR-AUTH-004. */
export enum MfaMethod {
  NONE = 'NONE',
  TOTP = 'TOTP',
}

/**
 * A platform user. This DTO never carries password hashes, MFA secrets, or
 * tokens — that material remains server-side only (SRS FR-AUTH-002).
 */
export interface User extends BaseEntity {
  readonly organisationId: UUID;
  readonly email: string;
  readonly fullName: string;
  readonly status: UserStatus;
  readonly authMethod: AuthMethod;
  readonly mfaMethod: MfaMethod;
  readonly mfaEnrolled: boolean;
  readonly lastLoginAt: ISODateString | null;
  readonly avatarUrl: string | null;
}

/** An authenticated session — backed by Redis, revocable (SRS FR-AUTH-006/007). */
export interface Session {
  readonly id: UUID;
  readonly userId: UUID;
  readonly organisationId: UUID;
  readonly createdAt: ISODateString;
  readonly expiresAt: ISODateString;
  readonly lastActivityAt: ISODateString;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly device: string;
}

/** Decoded JWT access-token claims carried on every authenticated request. */
export interface AccessTokenClaims {
  /** Subject — the user id. */
  readonly sub: UUID;
  readonly organisationId: UUID;
  readonly sessionId: UUID;
  readonly email: string;
  readonly roles: readonly string[];
  /** Issued-at, seconds since epoch. */
  readonly iat: number;
  /** Expiry, seconds since epoch. */
  readonly exp: number;
}

/** Scoped, revocable programmatic credential — SRS FR-AUTH-013. */
export interface ApiKey extends BaseEntity {
  readonly organisationId: UUID;
  readonly name: string;
  /** Shown once on creation; only a hash is stored thereafter. */
  readonly prefix: string;
  readonly roleId: UUID;
  readonly lastUsedAt: ISODateString | null;
  readonly expiresAt: ISODateString | null;
  readonly revokedAt: ISODateString | null;
}
