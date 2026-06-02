/**
 * Per-request tenant context, carried through async calls via
 * AsyncLocalStorage. The stored `EntityManager` is bound to a transaction in
 * which `app.current_organisation_id` has been set, so every query made
 * through it is enforced by PostgreSQL Row-Level Security (SRS FR-TEN-004).
 */
import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { EntityManager, ObjectLiteral, ObjectType, Repository } from 'typeorm';

export interface TenantStore {
  manager: EntityManager;
  organisationId: string;
  userId: string;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantStore>();

  /** Run `callback` with the given tenant store bound to the async context. */
  run<T>(store: TenantStore, callback: () => Promise<T>): Promise<T> {
    return this.storage.run(store, callback);
  }

  private require(): TenantStore {
    const store = this.storage.getStore();
    if (!store) {
      throw new Error(
        'Tenant context is unavailable — this operation must run inside an authenticated request',
      );
    }
    return store;
  }

  get organisationId(): string {
    return this.require().organisationId;
  }

  get userId(): string {
    return this.require().userId;
  }

  get manager(): EntityManager {
    return this.require().manager;
  }

  /** A repository bound to the current tenant-scoped transaction. */
  getRepository<T extends ObjectLiteral>(entity: ObjectType<T>): Repository<T> {
    return this.require().manager.getRepository(entity);
  }
}
