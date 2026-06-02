/**
 * Per-IP rate limiter for authentication endpoints (SRS NFR-SEC-007).
 *
 * Limits the rate of password attempts to mitigate online brute-force.
 * 5 attempts / 60 s per IP — successful and failed are both counted; on
 * exhaustion the client gets HTTP 429 with a Retry-After header.
 */
import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const LIMIT = 5;
const WINDOW_SECONDS = 60;

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const ip = this.clientIp(request);
    const minute = Math.floor(Date.now() / 60_000);
    const key = `rate:auth:${ip}:${minute}`;
    const client = this.redis.getClient();
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, WINDOW_SECONDS + 5);
    response.setHeader('X-RateLimit-Limit', LIMIT);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, LIMIT - count));
    if (count > LIMIT) {
      response.setHeader('Retry-After', WINDOW_SECONDS);
      throw new HttpException(
        'Too many authentication attempts — please wait before trying again',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private clientIp(request: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
    socket?: { remoteAddress?: string };
  }): string {
    const forwarded = request.headers['x-forwarded-for'];
    const fwd = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return (fwd?.split(',')[0]?.trim() ?? request.ip ?? request.socket?.remoteAddress ?? 'unknown');
  }
}
