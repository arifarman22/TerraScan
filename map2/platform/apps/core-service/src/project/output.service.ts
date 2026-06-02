/**
 * Read access to processing_outputs (SRS §5.4 / §13).
 *
 * Outputs are inserted by the drone & satellite processing services; the
 * Core Service exposes them through the tenant-scoped RLS connection so
 * each organisation only sees its own deliverables.
 */
import { Injectable } from '@nestjs/common';
import type { FindOptionsWhere } from 'typeorm';
import { ProcessingOutputEntity } from '../entities/processing-output.entity';
import { TenantContextService } from '../tenant/tenant-context.service';

export interface OutputFilter {
  projectId?: string;
  missionId?: string;
  jobId?: string;
}

@Injectable()
export class OutputService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private repo() {
    return this.tenantContext.getRepository(ProcessingOutputEntity);
  }

  list(filter: OutputFilter): Promise<ProcessingOutputEntity[]> {
    const where: FindOptionsWhere<ProcessingOutputEntity> = {};
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.missionId) where.missionId = filter.missionId;
    if (filter.jobId) where.jobId = filter.jobId;
    return this.repo().find({ where, order: { createdAt: 'DESC' } });
  }

  findOne(id: string): Promise<ProcessingOutputEntity | null> {
    return this.repo().findOne({ where: { id } });
  }
}
