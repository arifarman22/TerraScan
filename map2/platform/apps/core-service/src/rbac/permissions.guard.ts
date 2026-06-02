/**
 * Global authorization guard. Enforces `@RequirePermission` deny-by-default
 * on every request, server-side (SRS FR-RBAC-005/006). Runs after the JWT
 * guard, so `request.user` is already populated.
 */
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PermissionService } from './permission.service';
import { REQUIRE_PERMISSION_KEY } from './rbac.decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const held = await this.permissionService.getPermissions(user.userId);
    const missing = required.filter((permission) => !held.has(permission));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing required permission(s): ${missing.join(', ')}`,
      );
    }
    return true;
  }
}
