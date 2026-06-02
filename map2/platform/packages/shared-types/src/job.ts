/**
 * Processing job types — SRS §9 and §14.
 */
import type { BoundingBox, EpsgCode, ISODateString, TenantScopedEntity, UUID } from './common.js';

/** Category of asynchronous job — SRS §14, FR-JOB-001. */
export enum JobType {
  PHOTOGRAMMETRY = 'PHOTOGRAMMETRY',
  GCP_PHOTOGRAMMETRY = 'GCP_PHOTOGRAMMETRY',
  SPECTRAL_ANALYSIS = 'SPECTRAL_ANALYSIS',
  CHANGE_DETECTION = 'CHANGE_DETECTION',
  ML_OBJECT_DETECTION = 'ML_OBJECT_DETECTION',
  ML_SEGMENTATION = 'ML_SEGMENTATION',
  THERMAL_ANALYSIS = 'THERMAL_ANALYSIS',
  EXPORT = 'EXPORT',
}

/**
 * Job lifecycle stages. Photogrammetry traverses the full pipeline
 * (SRS FR-PHOTO-006 / Figure 6); lighter jobs use a subset.
 */
export enum JobStatus {
  SUBMITTED = 'SUBMITTED',
  INITIALIZING = 'INITIALIZING',
  FEATURE_EXTRACTION = 'FEATURE_EXTRACTION',
  POINT_CLOUD_GENERATION = 'POINT_CLOUD_GENERATION',
  SURFACE_RECONSTRUCTION = 'SURFACE_RECONSTRUCTION',
  ORTHOMOSAIC_GENERATION = 'ORTHOMOSAIC_GENERATION',
  POST_PROCESSING = 'POST_PROCESSING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/** Photogrammetry quality preset — SRS FR-PHOTO-002 / §5.1.1. */
export enum QualityPreset {
  DRAFT = 'DRAFT',
  STANDARD = 'STANDARD',
  HIGH = 'HIGH',
  ULTRA = 'ULTRA',
}

/** Selectable photogrammetry outputs — SRS FR-PHOTO-003. */
export interface PhotogrammetryOutputSelection {
  readonly orthomosaic: boolean;
  readonly dsm: boolean;
  readonly dtm: boolean;
  readonly pointCloud: boolean;
  readonly mesh3d: boolean;
  readonly contours: boolean;
  readonly volume: boolean;
}

/** Configuration captured for a photogrammetry job — SRS §9.1. */
export interface PhotogrammetryJobConfig {
  readonly preset: QualityPreset;
  readonly outputs: PhotogrammetryOutputSelection;
  readonly crs: EpsgCode;
  readonly contourIntervalM: number | null;
  /** Exclusion zones drawn on the footprint map (SRS FR-PHOTO-005). */
  readonly exclusionZones: readonly BoundingBox[];
  readonly gcpFileKey: string | null;
}

/** Live progress snapshot streamed over WebSocket — SRS FR-PHOTO-007. */
export interface JobProgress {
  readonly jobId: UUID;
  readonly status: JobStatus;
  /** Completion percentage, 0–100. */
  readonly percent: number;
  readonly stageLabel: string;
  readonly imagesProcessed: number;
  readonly imagesTotal: number;
  readonly etaSeconds: number | null;
  /** Last engine status messages, in plain language. */
  readonly logTail: readonly string[];
  readonly updatedAt: ISODateString;
}

/** A processing job record — SRS §14. */
export interface Job extends TenantScopedEntity {
  readonly projectId: UUID;
  readonly missionId: UUID;
  readonly workspaceId: UUID;
  readonly type: JobType;
  readonly status: JobStatus;
  readonly preset: QualityPreset | null;
  readonly config: PhotogrammetryJobConfig | Readonly<Record<string, unknown>>;
  readonly progressPercent: number;
  readonly submittedByUserId: UUID;
  readonly startedAt: ISODateString | null;
  readonly completedAt: ISODateString | null;
  readonly etaSeconds: number | null;
  readonly retryCount: number;
  /** Plain-language failure message; technical detail kept separately (SRS FR-JOB-005). */
  readonly errorMessage: string | null;
  /** Engine identifier + version for reproducibility (SRS FR-EXP-003 / FR-ML-005). */
  readonly engineVersion: string | null;
}
