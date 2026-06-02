/**
 * Organisation (tenant) types — SRS §4 and §16.
 */
import type { BaseEntity, ISODateString } from './common.js';

/** Organisation lifecycle states — SRS FR-TEN-007 / FR-TEN-008. */
export enum OrganisationStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}

/** Data-residency region, pinned at creation — SRS FR-TEN-006 / NFR-PRIV-003. */
export enum DataResidencyRegion {
  EU = 'EU',
  US = 'US',
  UK = 'UK',
  APAC = 'APAC',
}

/** Subscription tier — governs quota limits (SRS §16, FR-SUB-001). */
export enum SubscriptionTier {
  TRIAL = 'TRIAL',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

/** Quota limits attached to a subscription — SRS FR-SUB-001. */
export interface SubscriptionLimits {
  /** Storage ceiling in bytes. */
  readonly storageBytes: number;
  readonly memberSeats: number;
  readonly concurrentJobs: number;
  readonly monthlyProcessingMinutes: number;
  readonly apiRateLimitPerMinute: number;
}

/** A customer organisation — the top-level tenant boundary (SRS §4). */
export interface Organisation extends BaseEntity {
  readonly name: string;
  readonly legalName: string;
  /** URL-safe unique identifier. */
  readonly slug: string;
  readonly status: OrganisationStatus;
  readonly region: DataResidencyRegion;
  readonly subscriptionTier: SubscriptionTier;
  readonly limits: SubscriptionLimits;
  readonly primaryContactEmail: string;
  /** Set when status transitions to SUSPENDED. */
  readonly suspendedAt: ISODateString | null;
  /** Set when status transitions to CLOSED. */
  readonly closedAt: ISODateString | null;
}
