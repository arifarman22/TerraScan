/**
 * Authorization decorators (SRS §6).
 */
import { type CustomDecorator, SetMetadata } from '@nestjs/common';
import type { Permission } from '@platform/shared-types';

/** Metadata key marking a route as not requiring authentication. */
export const IS_PUBLIC_KEY = 'rbac:isPublic';

/** Metadata key carrying the permissions a route requires. */
export const REQUIRE_PERMISSION_KEY = 'rbac:requiredPermissions';

/** Marks a route as public — the JWT guard skips it. */
export const Public = (): CustomDecorator => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Requires the caller to hold ALL listed permissions. A route with no
 * `@RequirePermission` still requires authentication but no specific
 * permission; authorization is deny-by-default (SRS FR-RBAC-005/006).
 */
export const RequirePermission = (
  ...permissions: Permission[]
): CustomDecorator => SetMetadata(REQUIRE_PERMISSION_KEY, permissions);
