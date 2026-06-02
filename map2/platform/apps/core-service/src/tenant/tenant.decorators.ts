/**
 * Tenant-lifecycle decorators.
 */
import { type CustomDecorator, SetMetadata } from '@nestjs/common';

/** Metadata key marking a route as runnable while the organisation is suspended. */
export const ALLOW_SUSPENDED_KEY = 'tenant:allowSuspended';

/**
 * Permits a route to execute even when the caller's organisation is
 * suspended or closed — used by the organisation lifecycle endpoints
 * themselves (reactivate, close, read).
 */
export const AllowSuspended = (): CustomDecorator =>
  SetMetadata(ALLOW_SUSPENDED_KEY, true);
