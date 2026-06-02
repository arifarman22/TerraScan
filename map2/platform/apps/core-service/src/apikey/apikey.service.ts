/**
 * API key management (SRS §11). Cleartext keys are returned exactly once at
 * creation time; every other call returns only the displayable prefix.
 *
 * The auth-time lookup (`findByHash`) runs on the privileged ('default')
 * connection — at that moment no tenant context exists yet. All admin
 * operations (list, create, revoke) run on the tenant connection and are
 * therefore confined by Row-Level Security.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { DataSource, IsNull, type Repository } from 'typeorm';
import { ApiKeyEntity } from '../entities/api-key.entity';
import { TenantContextService } from '../tenant/tenant-context.service';
import type { CreateApiKeyDto } from './dto/create-api-key.dto';

const KEY_PREFIX = 'pk_live_';
const RANDOM_BYTES = 24; // → 32-char base64url

export interface CreatedApiKey {
  id: string;
  name: string;
  prefix: string;
  /** Cleartext secret — shown to the caller exactly once. */
  key: string;
  createdAt: Date;
}

function generateKey(): { rawKey: string; keyHash: string; prefix: string } {
  const random = randomBytes(RANDOM_BYTES).toString('base64url');
  const rawKey = `${KEY_PREFIX}${random}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const prefix = rawKey.slice(0, 16);
  return { rawKey, keyHash, prefix };
}

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly tenantContext: TenantContextService,
    @InjectDataSource() private readonly adminDataSource: DataSource,
  ) {}

  private repo(): Repository<ApiKeyEntity> {
    return this.tenantContext.getRepository(ApiKeyEntity);
  }

  /** Create + persist a key. The cleartext secret is returned only here. */
  async create(dto: CreateApiKeyDto): Promise<CreatedApiKey> {
    const { rawKey, keyHash, prefix } = generateKey();
    const entity = this.repo().create({
      organisationId: this.tenantContext.organisationId,
      name: dto.name,
      prefix,
      keyHash,
      scopes: dto.scopes ?? [],
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      createdBy: this.tenantContext.userId,
    });
    const saved = await this.repo().save(entity);
    return {
      id: saved.id,
      name: saved.name,
      prefix: saved.prefix,
      key: rawKey,
      createdAt: saved.createdAt,
    };
  }

  list(): Promise<ApiKeyEntity[]> {
    return this.repo().find({
      where: { revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(id: string): Promise<void> {
    const repo = this.repo();
    const existing = await repo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('API key not found');
    }
    existing.revokedAt = new Date();
    await repo.save(existing);
  }

  // ---- Auth-time helpers (admin connection, no tenant context) ------------

  findByHash(keyHash: string): Promise<ApiKeyEntity | null> {
    return this.adminDataSource.getRepository(ApiKeyEntity).findOne({
      where: { keyHash, revokedAt: IsNull() },
    });
  }

  async touch(id: string): Promise<void> {
    await this.adminDataSource
      .getRepository(ApiKeyEntity)
      .update({ id }, { lastUsedAt: new Date() });
  }

  /** Compute the storage hash for a cleartext key — used by the guard. */
  static hash(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }
}
