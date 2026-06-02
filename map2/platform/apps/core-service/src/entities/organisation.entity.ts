import { Column, Entity } from 'typeorm';
import type {
  DataResidencyRegion,
  OrganisationStatus,
  SubscriptionLimits,
  SubscriptionTier,
} from '@platform/shared-types';
import { BaseEntity } from './base.entity';

/** A customer organisation — the top-level tenant boundary (SRS §4). */
@Entity('organisations')
export class OrganisationEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  legalName!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: OrganisationStatus;

  @Column({ type: 'varchar', length: 10 })
  region!: DataResidencyRegion;

  @Column({ type: 'varchar', length: 20, default: 'TRIAL' })
  subscriptionTier!: SubscriptionTier;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  limits!: SubscriptionLimits;

  @Column({ type: 'varchar', length: 320 })
  primaryContactEmail!: string;

  @Column({ type: 'timestamptz', nullable: true })
  suspendedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt!: Date | null;
}
