/**
 * Workspace CRUD (SRS FR-TEN-002). Every query runs on the tenant-scoped
 * connection — RLS confines all reads and writes to the caller's organisation.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { WorkspaceEntity } from '../entities/workspace.entity';
import type { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/tenant.dto';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class WorkspaceService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private repo(): Repository<WorkspaceEntity> {
    return this.tenantContext.getRepository(WorkspaceEntity);
  }

  async create(dto: CreateWorkspaceDto): Promise<WorkspaceEntity> {
    const repo = this.repo();
    const workspace = repo.create({
      organisationId: this.tenantContext.organisationId,
      name: dto.name,
      slug: await this.uniqueSlug(repo, dto.name),
      description: dto.description ?? '',
      archived: false,
      createdByUserId: this.tenantContext.userId,
    });
    return repo.save(workspace);
  }

  list(): Promise<WorkspaceEntity[]> {
    return this.repo().find({ order: { createdAt: 'DESC' } });
  }

  async getById(id: string): Promise<WorkspaceEntity> {
    const workspace = await this.repo().findOne({ where: { id } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async update(id: string, dto: UpdateWorkspaceDto): Promise<WorkspaceEntity> {
    const workspace = await this.getById(id);
    if (dto.name !== undefined) {
      workspace.name = dto.name;
    }
    if (dto.description !== undefined) {
      workspace.description = dto.description;
    }
    return this.repo().save(workspace);
  }

  async archive(id: string): Promise<WorkspaceEntity> {
    const workspace = await this.getById(id);
    workspace.archived = true;
    return this.repo().save(workspace);
  }

  private async uniqueSlug(
    repo: Repository<WorkspaceEntity>,
    name: string,
  ): Promise<string> {
    const base =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100) || 'workspace';
    let slug = base;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (!(await repo.findOne({ where: { slug } }))) {
        return slug;
      }
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
}
