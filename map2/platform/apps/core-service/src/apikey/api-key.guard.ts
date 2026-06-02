/**
 * API-key authentication guard for the public API surface (SRS §11).
 *
 * Accepts `Authorization: ApiKey <pk_live_…>`, hashes the secret, looks it
 * up against `api_keys` on the admin connection, and populates `req.user`
 * so the global `TenantContextInterceptor` can bind RLS for the rest of
 * the request.
 */
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyService } from './apikey.service';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest();
    const header = (request.headers.authorization ?? '') as string;
    if (!header.toLowerCase().startsWith('apikey ')) {
      throw new UnauthorizedException('API key required');
    }
    const rawKey = header.slice(7).trim();
    if (!rawKey.startsWith('pk_live_') || rawKey.length < 24) {
      throw new UnauthorizedException('Invalid API key format');
    }
    const hash = ApiKeyService.hash(rawKey);
    const apiKey = await this.apiKeyService.findByHash(hash);
    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('API key expired');
    }

    // Attribute downstream actions to the user who created the key — gives
    // the audit trail a real principal while RLS uses the organisation.
    request.user = {
      userId: apiKey.createdBy ?? apiKey.id,
      organisationId: apiKey.organisationId,
      apiKeyId: apiKey.id,
      scopes: apiKey.scopes,
      authMethod: 'api_key',
    };

    // Fire-and-forget — non-blocking last-used update.
    void this.apiKeyService.touch(apiKey.id);

    return true;
  }
}
