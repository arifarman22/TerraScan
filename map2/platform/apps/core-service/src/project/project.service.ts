/**
 * Project CRUD and status lifecycle (SRS §7). Every query runs on the
 * tenant-scoped connection — RLS confines all access to the caller's
 * organisation.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { ProjectStatus, type ProjectType } from '@platform/shared-types';
import { ProjectEntity } from '../entities/project.entity';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { TenantContextService } from '../tenant/tenant-context.service';
import type { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { assertProjectTransition } from './project-status';

export interface ProjectListFilter {
  workspaceId?: string;
  status?: string;
  type?: string;
}

@Injectable()
export class ProjectService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private repo(): Repository<ProjectEntity> {
    return this.tenantContext.getRepository(ProjectEntity);
  }

  async create(dto: CreateProjectDto): Promise<ProjectEntity> {
    const workspace = await this.tenantContext
      .getRepository(WorkspaceEntity)
      .findOne({ where: { id: dto.workspaceId } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    const repo = this.repo();
    const project = repo.create({
      organisationId: this.tenantContext.organisationId,
      workspaceId: workspace.id,
      name: dto.name,
      type: dto.type,
      status: ProjectStatus.DRAFT,
      description: dto.description ?? '',
      regionOfInterest: dto.regionOfInterest ?? null,
      createdByUserId: this.tenantContext.userId,
      lastActivityAt: new Date(),
      thumbnailKey: null,
      storageBytes: 0,
    });
    return repo.save(project);
  }

  list(filter: ProjectListFilter): Promise<ProjectEntity[]> {
    const where: FindOptionsWhere<ProjectEntity> = {};
    if (filter.workspaceId) {
      where.workspaceId = filter.workspaceId;
    }
    if (filter.status) {
      where.status = filter.status as ProjectStatus;
    }
    if (filter.type) {
      where.type = filter.type as ProjectType;
    }
    return this.repo().find({ where, order: { lastActivityAt: 'DESC' } });
  }

  async getById(id: string): Promise<ProjectEntity> {
    const project = await this.repo().findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto): Promise<ProjectEntity> {
    const project = await this.getById(id);
    if (project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException('Archived projects are read-only');
    }
    if (dto.name !== undefined) {
      project.name = dto.name;
    }
    if (dto.description !== undefined) {
      project.description = dto.description;
    }
    if (dto.regionOfInterest !== undefined) {
      project.regionOfInterest = dto.regionOfInterest;
    }
    project.lastActivityAt = new Date();
    return this.repo().save(project);
  }

  async archive(id: string): Promise<ProjectEntity> {
    return this.transitionStatus(id, ProjectStatus.ARCHIVED);
  }

  async remove(id: string): Promise<void> {
    const project = await this.getById(id);
    await this.repo().remove(project);
  }

  /** Drive the status state machine — used by archive and later phases. */
  async transitionStatus(
    id: string,
    to: ProjectStatus,
  ): Promise<ProjectEntity> {
    const project = await this.getById(id);
    assertProjectTransition(project.status, to);
    project.status = to;
    project.lastActivityAt = new Date();
    return this.repo().save(project);
  }
}
