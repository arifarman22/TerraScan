/**
 * Guard that authenticates a request from its `Authorization: Bearer` access
 * token. Routes marked `@Public()` are skipped. The token's session is
 * re-checked in Redis on every request, so a revoked session is rejected
 * within the access-token lifetime (SRS FR-AUTH-006).
 */
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../rbac/rbac.decorators';
import type { AuthenticatedUser } from './auth.types';
import { SessionService } from './session.service';
import { TokenService } from './token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // WebSocket connections authenticate on the handshake (see JobGateway).
    if (context.getType() !== 'http') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload;
    try {
      payload = await this.tokenService.verifyAccessToken(header.slice(7));
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const session = await this.sessionService.get(payload.sessionId);
    if (!session) {
      throw new UnauthorizedException('Session has been revoked');
    }

    const user: AuthenticatedUser = {
      userId: payload.sub,
      organisationId: payload.organisationId,
      sessionId: payload.sessionId,
      email: payload.email,
      roles: payload.roles,
    };
    request.user = user;
    return true;
  }
}
