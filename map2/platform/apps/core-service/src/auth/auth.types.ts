/**
 * Internal authentication types.
 */
import type { User } from '@platform/shared-types';

/** Claims carried by a JWT access token. */
export interface AccessTokenPayload {
  /** Subject — the user id. */
  sub: string;
  organisationId: string;
  sessionId: string;
  email: string;
  roles: string[];
}

/** Claims carried by a JWT refresh token. */
export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  /** Rotating token id — compared against the session record. */
  jti: string;
  type: 'refresh';
}

/** The authenticated principal attached to each request by the JWT guard. */
export interface AuthenticatedUser {
  userId: string;
  organisationId: string;
  sessionId: string;
  email: string;
  roles: string[];
}

/** A session record persisted in Redis (SRS FR-AUTH-006/007). */
export interface SessionRecord {
  id: string;
  userId: string;
  organisationId: string;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  ipAddress: string;
  userAgent: string;
  device: string;
  /** Id of the currently valid refresh token — rotated on every refresh. */
  refreshJti: string;
}

/** Per-request context captured for sessions and auditing. */
export interface RequestContext {
  ipAddress: string;
  userAgent: string;
}

/** Compact organisation summary returned alongside auth results. */
export interface OrganisationSummary {
  id: string;
  name: string;
  slug: string;
  region: string;
  subscriptionTier: string;
  status: string;
}

/** Result of a successful register / login / refresh. */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
  user: User;
  organisation: OrganisationSummary;
}
