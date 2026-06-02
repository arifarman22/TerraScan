/**
 * Global interceptor that establishes the tenant context for every
 * authenticated request (SRS FR-TEN-003/004).
 *
 * For each request carrying an authenticated user it:
 *  1. opens a transaction on the least-privilege ('tenant') connection;
 *  2. sets `app.current_organisation_id` for the transaction, activating
 *     the Row-Level Security policies;
 *  3. enforces the organisation suspension/closure lifecycle (FR-TEN-008);
 *  4. runs the route handler with the transaction's EntityManager bound to
 *     the async context.
 *
 * Public / pre-authentication routes (login, registration, accept-invite)
 * carry no user and are passed through untouched.
 */
import {
  type CallHandler,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { from, lastValueFrom, type Observable } from 'rxjs';
import { DataSource } from 'typeorm';
import type { AuthenticatedUser } from '../auth/auth.types';
import { TenantContextService } from './tenant-context.service';
import { ALLOW_SUSPENDED_KEY } from './tenant.decorators';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(
    @InjectDataSource('tenant') private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only HTTP requests carry a tenant context; WebSocket events are skipped.
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) {
      return next.handle();
    }

    const allowSuspended =
      this.reflector.getAllAndOverride<boolean>(ALLOW_SUSPENDED_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;
    const method: string = request.method;

    return from(
      this.dataSource.transaction(async (manager) => {
        await manager.query(
          "SELECT set_config('app.current_organisation_id', $1, true)",
          [user.organisationId],
        );

        if (!allowSuspended) {
          const rows: Array<{ status: string }> = await manager.query(
            'SELECT status FROM organisations WHERE id = $1',
            [user.organisationId],
          );
          const status = rows[0]?.status;
          if (status === 'CLOSED') {
            throw new ForbiddenException('Organisation is closed');
          }
          if (status === 'SUSPENDED' && MUTATING_METHODS.has(method)) {
            throw new ForbiddenException(
              'Organisation is suspended — write access is disabled',
            );
          }
        }

        return this.tenantContext.run(
          {
            manager,
            organisationId: user.organisationId,
            userId: user.userId,
          },
          () => lastValueFrom(next.handle()),
        );
      }),
    );
  }
}
