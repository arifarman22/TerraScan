/**
 * Processing output (deliverable) types — SRS §5.4, §10, §12, §8.1.
 */
import type { EpsgCode, ISODateString, TenantScopedEntity, UUID } from './common.js';

/** Type of a generated deliverable — SRS §5.4 / §10 / §12. */
export enum OutputType {
  ORTHOMOSAIC = 'ORTHOMOSAIC',
  DSM = 'DSM',
  DTM = 'DTM',
  POINT_CLOUD = 'POINT_CLOUD',
  MESH_3D = 'MESH_3D',
  CONTOURS = 'CONTOURS',
  VOLUME_REPORT = 'VOLUME_REPORT',
  SPECTRAL_INDEX = 'SPECTRAL_INDEX',
  CHANGE_LAYER = 'CHANGE_LAYER',
  ML_DETECTION = 'ML_DETECTION',
  LAND_COVER = 'LAND_COVER',
  THERMAL_MAP = 'THERMAL_MAP',
}

/** Storage / interchange format of an output file — SRS §8.1. */
export enum OutputFormat {
  COG = 'COG',
  GEOTIFF = 'GEOTIFF',
  LAS = 'LAS',
  LAZ = 'LAZ',
  TILES_3D = 'TILES_3D',
  GLB = 'GLB',
  OBJ = 'OBJ',
  GEOJSON = 'GEOJSON',
  KML = 'KML',
  SHAPEFILE = 'SHAPEFILE',
  DXF = 'DXF',
  PDF = 'PDF',
  CSV = 'CSV',
  PNG = 'PNG',
}

/** Statistics embedded with a raster output. */
export interface RasterStatistics {
  readonly minValue: number;
  readonly maxValue: number;
  readonly meanValue: number;
  readonly noDataValue: number | null;
}

/**
 * A processed output produced by a job. Outputs are immutable and
 * versioned — a re-run creates a new record (SRS FR-DATA-004).
 */
export interface ProcessingOutput extends TenantScopedEntity {
  readonly jobId: UUID;
  readonly projectId: UUID;
  readonly missionId: UUID;
  readonly type: OutputType;
  readonly format: OutputFormat;
  /** Object-storage key under {org}/{workspace}/{project}/{mission}/outputs/. */
  readonly storageKey: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly crs: EpsgCode | null;
  /** Monotonic version; repeated runs of the same output increment this. */
  readonly version: number;
  readonly statistics: RasterStatistics | null;
  readonly groundSampleDistanceM: number | null;
  readonly createdAt: ISODateString;
}
