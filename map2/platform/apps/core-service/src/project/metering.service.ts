/**
 * Storage metering (SRS FR-DATA-005 / FR-SUB-002). Tracks per-project storage
 * consumption and the organisation-wide total against the subscription quota.
 * The upload module (Phase 1G) applies storage deltas as files arrive.
 */
import { Injectable } from '@nestjs/common';
import { OrganisationEntity } from '../entities/organisation.entity';
import { ProjectEntity } from '../entities/project.entity';
import { TenantContextService } from '../tenant/tenant-context.service';

export interface StorageSummary {
  usedBytes: number;
  quotaBytes: number;
  usedPercent: number;
  projectCount: number;
}

@Injectable()
export class MeteringService {
  constructor(private readonly tenantContext: TenantContextService) {}

  /** Organisation-wide storage usage versus the subscription quota. */
  async getStorageSummary(): Promise<StorageSummary> {
    const organisation = await this.tenantContext
      .getRepository(OrganisationEntity)
      .findOne({ where: { id: this.tenantContext.organisationId } });
    const projects = await this.tenantContext
      .getRepository(ProjectEntity)
      .find();

    const usedBytes = projects.reduce(
      (total, project) => total + Number(project.storageBytes),
      0,
    );
    const quotaBytes = organisation?.limits?.storageBytes ?? 0;

    return {
      usedBytes,
      quotaBytes,
      usedPercent:
        quotaBytes > 0
          ? Math.round((usedBytes / quotaBytes) * 10_000) / 100
          : 0,
      projectCount: projects.length,
    };
  }

  /**
   * Apply a signed storage delta to a project's running total.
   * Called by the upload pipeline when files are added or removed.
   */
  async applyProjectStorageDelta(
    projectId: string,
    deltaBytes: number,
  ): Promise<void> {
    const repo = this.tenantContext.getRepository(ProjectEntity);
    const project = await repo.findOne({ where: { id: projectId } });
    if (!project) {
      return;
    }
    project.storageBytes = Math.max(
      0,
      Number(project.storageBytes) + deltaBytes,
    );
    await repo.save(project);
  }
}
