/**
 * Processing job records (SRS §14). Jobs are created here and dispatched to
 * the processing services via the durable `job.submitted` event; the
 * services report progress back over Redis pub/sub (relayed by JobGateway).
 *
 * Job creation enforces the organisation's concurrent-job quota
 * (SRS FR-SUB-001 / FR-JOB-007).
 */
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type FindOptionsWhere, In, type Repository } from 'typeorm';
import {
  type DomainEvent,
  EventType,
  JobStatus,
  type JobSubmittedPayload,
} from '@platform/shared-types';
import { JobEntity } from '../entities/job.entity';
import { OrganisationEntity } from '../entities/organisation.entity';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { MissionService } from '../project/mission.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import type { CreateJobDto } from './dto/job.dto';

const ACTIVE_JOB_STATUSES: JobStatus[] = [
  JobStatus.SUBMITTED,
  JobStatus.INITIALIZING,
  JobStatus.FEATURE_EXTRACTION,
  JobStatus.POINT_CLOUD_GENERATION,
  JobStatus.SURFACE_RECONSTRUCTION,
  JobStatus.ORTHOMOSAIC_GENERATION,
  JobStatus.POST_PROCESSING,
];
const TERMINAL_JOB_STATUSES: JobStatus[] = [
  JobStatus.COMPLETE,
  JobStatus.FAILED,
  JobStatus.CANCELLED,
];

export interface JobListFilter {
  projectId?: string;
  missionId?: string;
  status?: string;
}

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly missionService: MissionService,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  private repo(): Repository<JobEntity> {
    return this.tenantContext.getRepository(JobEntity);
  }

  async create(dto: CreateJobDto): Promise<JobEntity> {
    const mission = await this.missionService.getById(dto.missionId);

    const organisation = await this.tenantContext
      .getRepository(OrganisationEntity)
      .findOne({ where: { id: this.tenantContext.organisationId } });
    const concurrentLimit = organisation?.limits?.concurrentJobs ?? 0;
    const activeJobs = await this.repo().count({
      where: { status: In(ACTIVE_JOB_STATUSES) },
    });
    if (activeJobs >= concurrentLimit) {
      throw new HttpException(
        `Concurrent job limit reached (${concurrentLimit}). ` +
          'Wait for a running job to finish or upgrade the plan.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const repo = this.repo();
    const job = await repo.save(
      repo.create({
        organisationId: this.tenantContext.organisationId,
        projectId: mission.projectId,
        missionId: mission.id,
        workspaceId: mission.workspaceId,
        type: dto.type,
        status: JobStatus.SUBMITTED,
        preset: dto.preset ?? null,
        config: dto.config ?? {},
        progressPercent: 0,
        submittedByUserId: this.tenantContext.userId,
        startedAt: null,
        completedAt: null,
        etaSeconds: null,
        retryCount: 0,
        errorMessage: null,
        engineVersion: null,
      }),
    );

    await this.publishJobSubmitted(job);
    this.logger.log(
      `Job ${job.id} (${job.type}) submitted for mission ${mission.id}`,
    );
    return job;
  }

  list(filter: JobListFilter): Promise<JobEntity[]> {
    const where: FindOptionsWhere<JobEntity> = {};
    if (filter.projectId) {
      where.projectId = filter.projectId;
    }
    if (filter.missionId) {
      where.missionId = filter.missionId;
    }
    if (filter.status) {
      where.status = filter.status as JobStatus;
    }
    return this.repo().find({ where, order: { createdAt: 'DESC' } });
  }

  async getById(id: string): Promise<JobEntity> {
    const job = await this.repo().findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  /**
   * Permanently delete a job and its processing outputs.
   *
   * `processing_outputs` and `job_artifacts` are FK-cascaded on job_id, so
   * a single repo delete cleans up the entire output tree. For non-terminal
   * jobs we transition to CANCELLED first so any in-flight worker that
   * tries to update the row exits cleanly.
   */
  async remove(id: string): Promise<void> {
    const job = await this.getById(id);
    const isInFlight =
      job.status !== JobStatus.COMPLETE &&
      job.status !== JobStatus.FAILED &&
      job.status !== JobStatus.CANCELLED;
    if (isInFlight) {
      job.status = JobStatus.CANCELLED;
      job.completedAt = new Date();
      await this.repo().save(job);
    }
    await this.repo().delete({ id: job.id });
  }

  async cancel(id: string): Promise<JobEntity> {
    const job = await this.getById(id);
    if (TERMINAL_JOB_STATUSES.includes(job.status)) {
      throw new BadRequestException(
        `Job is already ${job.status} and cannot be cancelled`,
      );
    }
    job.status = JobStatus.CANCELLED;
    job.completedAt = new Date();
    return this.repo().save(job);
  }

  private async publishJobSubmitted(job: JobEntity): Promise<void> {
    const event: DomainEvent<JobSubmittedPayload> = {
      eventId: randomUUID(),
      eventType: EventType.JOB_SUBMITTED,
      occurredAt: new Date().toISOString(),
      organisationId: job.organisationId,
      correlationId: randomUUID(),
      payload: {
        jobId: job.id,
        jobType: job.type,
        missionId: job.missionId,
        projectId: job.projectId,
      },
    };
    await this.rabbitmq.publish(EventType.JOB_SUBMITTED, event);
  }
}
