/**
 * Project types — SRS §7.
 */
import type { GeoJSONPolygon, ISODateString, TenantScopedEntity, UUID } from './common.js';

/** Project category — SRS FR-PROJ-001. */
export enum ProjectType {
  DRONE_SURVEY = 'DRONE_SURVEY',
  SATELLITE_ANALYSIS = 'SATELLITE_ANALYSIS',
  COMBINED = 'COMBINED',
}

/** Project status lifecycle — SRS FR-PROJ-002 / §3.3. */
export enum ProjectStatus {
  DRAFT = 'DRAFT',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

/** A project — the fundamental unit of organisation (SRS §7). */
export interface Project extends TenantScopedEntity {
  readonly workspaceId: UUID;
  readonly name: string;
  readonly type: ProjectType;
  readonly status: ProjectStatus;
  readonly description: string;
  /** Optional region of interest drawn or typed by the user. */
  readonly regionOfInterest: GeoJSONPolygon | null;
  readonly createdByUserId: UUID;
  readonly lastActivityAt: ISODateString;
  /** Object-storage key of the primary output thumbnail, once available. */
  readonly thumbnailKey: string | null;
  /** Aggregate storage consumed by this project, in bytes (SRS FR-DATA-005). */
  readonly storageBytes: number;
}
