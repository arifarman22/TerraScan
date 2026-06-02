/**
 * Role-Based Access Control types — SRS §6 and Appendix C.
 */
import type { BaseEntity, ISODateString, UUID } from './common.js';

/** Scope at which a role may be granted — SRS FR-RBAC-002. */
export enum RoleScope {
  PLATFORM = 'PLATFORM',
  ORGANISATION = 'ORGANISATION',
  WORKSPACE = 'WORKSPACE',
  PROJECT = 'PROJECT',
}

/** Built-in roles shipped with every organisation — SRS §6.2 / Appendix C. */
export enum SystemRole {
  PLATFORM_SUPER_ADMIN = 'PLATFORM_SUPER_ADMIN',
  PLATFORM_SUPPORT = 'PLATFORM_SUPPORT',
  ORG_OWNER = 'ORG_OWNER',
  ORG_ADMIN = 'ORG_ADMIN',
  BILLING_ADMIN = 'BILLING_ADMIN',
  WORKSPACE_MANAGER = 'WORKSPACE_MANAGER',
  OPERATOR = 'OPERATOR',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER',
  EXTERNAL_REVIEWER = 'EXTERNAL_REVIEWER',
}

/**
 * Permission catalogue. Every permission-gated action maps to one entry.
 * Format: `<action>:<resource>`. Authorization is enforced server-side and
 * is deny-by-default (SRS FR-RBAC-005 / FR-RBAC-006).
 */
export enum Permission {
  // Organisation
  ORG_MANAGE = 'manage:organisation',
  ORG_DELETE = 'delete:organisation',
  ORG_VIEW = 'view:organisation',
  // Billing
  BILLING_MANAGE = 'manage:billing',
  BILLING_VIEW = 'view:billing',
  // Identity / SSO
  SSO_CONFIGURE = 'configure:sso',
  // Members & roles
  MEMBER_INVITE = 'invite:member',
  MEMBER_REMOVE = 'remove:member',
  ROLE_ASSIGN = 'assign:role',
  ROLE_MANAGE = 'manage:role',
  // Workspaces
  WORKSPACE_CREATE = 'create:workspace',
  WORKSPACE_MANAGE = 'manage:workspace',
  // Projects & missions
  PROJECT_CREATE = 'create:project',
  PROJECT_MANAGE = 'manage:project',
  PROJECT_VIEW = 'view:project',
  PROJECT_DELETE = 'delete:project',
  MISSION_MANAGE = 'manage:mission',
  // Imagery
  IMAGERY_UPLOAD = 'upload:imagery',
  IMAGERY_DELETE = 'delete:imagery',
  // Jobs / processing
  JOB_LAUNCH = 'launch:job',
  JOB_VIEW = 'view:job',
  JOB_CANCEL = 'cancel:job',
  // Analytics / ML
  ANALYTICS_RUN = 'run:analytics',
  ML_RUN = 'run:ml',
  // Viewer
  MAP_VIEW = 'view:map',
  ANNOTATION_MANAGE = 'manage:annotation',
  // Export
  EXPORT_CREATE = 'create:export',
  REPORT_GENERATE = 'generate:report',
  // Audit
  AUDIT_READ = 'read:audit',
  // API keys
  API_KEY_MANAGE = 'manage:apikey',
}

/** A role: a named, scoped bundle of permissions. */
export interface Role extends BaseEntity {
  /** Null for built-in system roles; set for custom roles (SRS FR-RBAC-004). */
  readonly organisationId: UUID | null;
  readonly name: string;
  readonly systemRole: SystemRole | null;
  readonly scope: RoleScope;
  readonly description: string;
  readonly permissions: readonly Permission[];
  readonly isSystem: boolean;
}

/** Binds a user to a role at a concrete scope instance. */
export interface RoleAssignment extends BaseEntity {
  readonly userId: UUID;
  readonly roleId: UUID;
  readonly scope: RoleScope;
  /** Id of the scoped resource (org/workspace/project); null at PLATFORM scope. */
  readonly scopeId: UUID | null;
  readonly grantedByUserId: UUID;
  /** Optional expiry — used for time-limited External Reviewer grants. */
  readonly expiresAt: ISODateString | null;
}

/** Effective, resolved permission set for a user within a request context. */
export interface EffectivePermissions {
  readonly userId: UUID;
  readonly organisationId: UUID;
  readonly roles: readonly SystemRole[];
  readonly permissions: readonly Permission[];
}
