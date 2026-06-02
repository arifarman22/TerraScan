/**
 * Domain event types for the RabbitMQ event bus — SRS §3.2 / FR-JOB-003.
 */
import type { ISODateString, UUID } from './common.js';
import type { JobStatus, JobType } from './job.js';
import type { OutputType } from './processing-output.js';

/**
 * RabbitMQ routing keys for durable domain events. All events are published
 * to the topic exchange {@link EVENTS_EXCHANGE}.
 */
export enum EventType {
  IMAGERY_UPLOADED = 'imagery.uploaded',
  JOB_SUBMITTED = 'job.submitted',
  JOB_STARTED = 'job.started',
  JOB_PROGRESS = 'job.progress',
  JOB_COMPLETED = 'job.completed',
  JOB_FAILED = 'job.failed',
  OUTPUT_READY = 'output.ready',
  ORGANISATION_SUSPENDED = 'organisation.suspended',
}

/** Topic exchange carrying every domain event. */
export const EVENTS_EXCHANGE = 'platform.events' as const;

/** Envelope wrapping every event published to the bus. */
export interface DomainEvent<TPayload> {
  readonly eventId: UUID;
  readonly eventType: EventType;
  readonly occurredAt: ISODateString;
  /** Tenant the event belongs to — consumers MUST scope all work to this. */
  readonly organisationId: UUID;
  /** Correlation id propagated end-to-end for tracing (SRS NFR-OBS-001/003). */
  readonly correlationId: UUID;
  readonly payload: TPayload;
}

/** Payload — imagery upload completed and checksum-verified (SRS FR-IMG-008). */
export interface ImageryUploadedPayload {
  readonly missionId: UUID;
  readonly projectId: UUID;
  readonly workspaceId: UUID;
  readonly fileCount: number;
  readonly rawSizeBytes: number;
  readonly uploadedByUserId: UUID;
}

/** Payload — a job was submitted to the processing queue. */
export interface JobSubmittedPayload {
  readonly jobId: UUID;
  readonly jobType: JobType;
  readonly missionId: UUID;
  readonly projectId: UUID;
}

/** Payload — periodic job progress tick. */
export interface JobProgressPayload {
  readonly jobId: UUID;
  readonly status: JobStatus;
  readonly percent: number;
  readonly stageLabel: string;
}

/** Payload — job finished successfully. */
export interface JobCompletedPayload {
  readonly jobId: UUID;
  readonly jobType: JobType;
  readonly outputTypes: readonly OutputType[];
  readonly durationSeconds: number;
}

/** Payload — job failed (plain-language message only; SRS FR-JOB-005). */
export interface JobFailedPayload {
  readonly jobId: UUID;
  readonly jobType: JobType;
  readonly errorMessage: string;
  readonly retryable: boolean;
  readonly retryCount: number;
}

/** Concrete, fully-typed event aliases. */
export type ImageryUploadedEvent = DomainEvent<ImageryUploadedPayload>;
export type JobSubmittedEvent = DomainEvent<JobSubmittedPayload>;
export type JobProgressEvent = DomainEvent<JobProgressPayload>;
export type JobCompletedEvent = DomainEvent<JobCompletedPayload>;
export type JobFailedEvent = DomainEvent<JobFailedPayload>;
