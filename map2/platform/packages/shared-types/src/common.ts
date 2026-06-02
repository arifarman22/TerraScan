/**
 * Common primitives and base shapes shared by every domain entity.
 */

/** RFC 4122 UUID — used for every primary key and tenant identifier. */
export type UUID = string;

/** ISO-8601 timestamp string in UTC, e.g. "2026-05-23T12:00:00.000Z". */
export type ISODateString = string;

/** EPSG code identifying a Coordinate Reference System, e.g. 4326. */
export type EpsgCode = number;

/** A single geographic position: [longitude, latitude, altitude?]. */
export type Position = [longitude: number, latitude: number, altitude?: number];

/** GeoJSON Polygon geometry (RFC 7946) — used for ROIs and coverage areas. */
export interface GeoJSONPolygon {
  readonly type: 'Polygon';
  /** Linear rings; the first is the exterior ring, the rest are holes. */
  readonly coordinates: ReadonlyArray<ReadonlyArray<Position>>;
}

/** Axis-aligned geographic bounding box: [west, south, east, north]. */
export type BoundingBox = [west: number, south: number, east: number, north: number];

/** Sort direction for list queries. */
export type SortDirection = 'ASC' | 'DESC';

/** Pagination request parameters accepted by every list endpoint. */
export interface PaginationParams {
  /** 1-based page number. */
  readonly page: number;
  /** Items per page; the server clamps this to an allowed maximum. */
  readonly pageSize: number;
  readonly sortBy?: string;
  readonly sortDirection?: SortDirection;
}

/** A page of results returned by any list endpoint. */
export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

/** Fields present on every persisted record. */
export interface BaseEntity {
  readonly id: UUID;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}

/**
 * Fields present on every tenant-scoped record. `organisationId` is the
 * partition key enforced by PostgreSQL Row-Level Security
 * (SRS FR-TEN-003 / FR-TEN-004).
 */
export interface TenantScopedEntity extends BaseEntity {
  readonly organisationId: UUID;
}

/** Mixin for records supporting soft deletion (recycle-bin grace period). */
export interface SoftDeletable {
  readonly deletedAt: ISODateString | null;
}

/** Structured API error body (SRS FR-API-006). */
export interface ApiError {
  readonly code: string;
  readonly message: string;
  /** Correlation id for tracing the failing request (SRS NFR-OBS-001). */
  readonly correlationId: UUID;
  readonly details?: Readonly<Record<string, unknown>>;
}
