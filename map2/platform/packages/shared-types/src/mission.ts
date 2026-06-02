/**
 * Mission and image types — SRS FR-PROJ-003 and §8.
 */
import type { GeoJSONPolygon, ISODateString, TenantScopedEntity, UUID } from './common.js';

/** Origin of a mission's imagery — SRS FR-PROJ-003 / §2.1. */
export enum DataSourceType {
  DRONE = 'DRONE',
  SATELLITE = 'SATELLITE',
}

/** Mission processing status. */
export enum MissionStatus {
  CREATED = 'CREATED',
  UPLOADING = 'UPLOADING',
  READY = 'READY',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/** A mission — one data-collection event (SRS FR-PROJ-003). */
export interface Mission extends TenantScopedEntity {
  readonly projectId: UUID;
  readonly workspaceId: UUID;
  readonly name: string;
  readonly sourceType: DataSourceType;
  readonly status: MissionStatus;
  /** When the data was collected (entered or auto-detected from EXIF). */
  readonly collectedAt: ISODateString | null;
  readonly coverageArea: GeoJSONPolygon | null;
  readonly fileCount: number;
  readonly rawSizeBytes: number;
  readonly createdByUserId: UUID;
}

/** EXIF / XMP metadata extracted per uploaded image — SRS FR-IMG-007. */
export interface ImageMetadata {
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly altitude: number | null;
  readonly cameraMake: string | null;
  readonly cameraModel: string | null;
  readonly focalLengthMm: number | null;
  readonly sensorWidthMm: number | null;
  readonly sensorHeightMm: number | null;
  readonly capturedAt: ISODateString | null;
  readonly gimbalPitchDeg: number | null;
  readonly gimbalRollDeg: number | null;
  readonly gimbalYawDeg: number | null;
  readonly flightAltitudeAglM: number | null;
}

/** A single uploaded image file within a mission. */
export interface MissionImage extends TenantScopedEntity {
  readonly missionId: UUID;
  readonly fileName: string;
  readonly storageKey: string;
  readonly sizeBytes: number;
  /** SHA-256 checksum verified at upload and before processing (SRS FR-IMG-008). */
  readonly checksumSha256: string;
  readonly contentType: string;
  readonly metadata: ImageMetadata;
  readonly hasGps: boolean;
}
