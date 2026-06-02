/**
 * Mission CRUD (SRS FR-PROJ-003). A mission is one data-collection event
 * within a project; it inherits the project's workspace.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { MissionStatus, ProjectStatus } from '@platform/shared-types';
import { MissionEntity } from '../entities/mission.entity';
import { ProjectEntity } from '../entities/project.entity';
import { TenantContextService } from '../tenant/tenant-context.service';
import type { CreateMissionDto, UpdateMissionDto } from './dto/project.dto';
import { assertMissionTransition } from './project-status';

@Injectable()
export class MissionService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private repo(): Repository<MissionEntity> {
    return this.tenantContext.getRepository(MissionEntity);
  }

  async create(dto: CreateMissionDto): Promise<MissionEntity> {
    const project = await this.tenantContext
      .getRepository(ProjectEntity)
      .findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException('Cannot add missions to an archived project');
    }
    const repo = this.repo();
    const mission = repo.create({
      organisationId: this.tenantContext.organisationId,
      projectId: project.id,
      workspaceId: project.workspaceId,
      name: dto.name,
      sourceType: dto.sourceType,
      status: MissionStatus.CREATED,
      collectedAt: dto.collectedAt ? new Date(dto.collectedAt) : null,
      coverageArea: dto.coverageArea ?? null,
      fileCount: 0,
      rawSizeBytes: 0,
      createdByUserId: this.tenantContext.userId,
    });
    return repo.save(mission);
  }

  list(projectId?: string): Promise<MissionEntity[]> {
    const where: FindOptionsWhere<MissionEntity> = {};
    if (projectId) {
      where.projectId = projectId;
    }
    return this.repo().find({ where, order: { createdAt: 'DESC' } });
  }

  async getById(id: string): Promise<MissionEntity> {
    const mission = await this.repo().findOne({ where: { id } });
    if (!mission) {
      throw new NotFoundException('Mission not found');
    }
    return mission;
  }

  async update(id: string, dto: UpdateMissionDto): Promise<MissionEntity> {
    const mission = await this.getById(id);
    if (dto.name !== undefined) {
      mission.name = dto.name;
    }
    if (dto.collectedAt !== undefined) {
      mission.collectedAt = new Date(dto.collectedAt);
    }
    if (dto.coverageArea !== undefined) {
      mission.coverageArea = dto.coverageArea;
    }
    return this.repo().save(mission);
  }

  async remove(id: string): Promise<void> {
    const mission = await this.getById(id);
    await this.repo().remove(mission);
  }

  /** Drive the mission status state machine — used by later phases. */
  async transitionStatus(
    id: string,
    to: MissionStatus,
  ): Promise<MissionEntity> {
    const mission = await this.getById(id);
    assertMissionTransition(mission.status, to);
    mission.status = to;
    return this.repo().save(mission);
  }
}
