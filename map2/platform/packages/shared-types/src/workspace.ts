/**
 * Workspace types — SRS FR-TEN-002.
 */
import type { TenantScopedEntity, UUID } from './common.js';

/** A workspace — a team / client / business-unit container (SRS FR-TEN-002). */
export interface Workspace extends TenantScopedEntity {
  readonly name: string;
  /** URL-safe identifier, unique within the organisation. */
  readonly slug: string;
  readonly description: string;
  readonly archived: boolean;
  readonly createdByUserId: UUID;
}
