/**
 * Per-API-key rate limiter (SRS NFR-PERF-004). Fixed-window counter in
 * Redis, refreshed every minute. Cheap, predictable, sufficient for a
 * first-pass public API; can be swapped for a sliding-window or token
 * bucket later.
 */
import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const DEFAULT_LIMIT_PER_MINUTE = 100;
const WINDOW_SECONDS = 60;

@Injectable()
export class ApiKeyRateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest();
    const apiKeyId: string | undefined = request.user?.apiKeyId;
    if (!apiKeyId) {
      // Not an API-key-authenticated request — outside this guard's remit.
      return true;
    }
    const minute = Math.floor(Date.now() / 60_000);
    const key = `rate:apikey:${apiKeyId}:${minute}`;
    const client = this.redis.getClient();
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, WINDOW_SECONDS + 5);
    }
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', DEFAULT_LIMIT_PER_MINUTE);
    response.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, DEFAULT_LIMIT_PER_MINUTE - count),
    );
    if (count > DEFAULT_LIMIT_PER_MINUTE) {
      response.setHeader('Retry-After', WINDOW_SECONDS);
      throw new HttpException(
        'Rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
