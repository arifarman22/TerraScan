/**
 * Tamper-evident audit log (SRS NFR-SEC-014).
 *
 * Writes happen on the admin DataSource so they can be issued from pre-
 * tenant-context flows (registration, failed login) and from within tenant
 * transactions alike. The `audit_log` table only grants INSERT/SELECT to
 * the runtime app role — UPDATE/DELETE are forbidden at the database
 * level.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { TenantContextService } from '../tenant/tenant-context.service';

export interface AuditEntry {
  organisationId: string;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditQuery {
  resourceType?: string;
  actorUserId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectDataSource() private readonly adminDataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  /** Write one entry. Failures never propagate — auditing is best-effort. */
  async write(entry: AuditEntry): Promise<void> {
    try {
      await this.adminDataSource.getRepository(AuditLogEntity).insert({
        organisationId: entry.organisationId,
        actorUserId: entry.actorUserId ?? null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        before: (entry.before ?? null) as never,
        after: (entry.after ?? null) as never,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit entry "${entry.action}"`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Read entries for the current tenant. */
  async list(
    organisationId: string,
    query: AuditQuery,
  ): Promise<AuditLogEntity[]> {
    // Reads must go through the tenant transaction so RLS sees
    // `app.current_organisation_id` and exposes only this tenant's rows.
    const qb = this.tenantContext
      .getRepository(AuditLogEntity)
      .createQueryBuilder('a')
      .where('a.organisationId = :organisationId', { organisationId })
      .orderBy('a.createdAt', 'DESC')
      .limit(Math.min(query.limit ?? 100, 500))
      .offset(query.offset ?? 0);
    if (query.resourceType) {
      qb.andWhere('a.resourceType = :resourceType', { resourceType: query.resourceType });
    }
    if (query.actorUserId) {
      qb.andWhere('a.actorUserId = :actorUserId', { actorUserId: query.actorUserId });
    }
    if (query.action) {
      qb.andWhere('a.action = :action', { action: query.action });
    }
    return qb.getMany();
  }
}
