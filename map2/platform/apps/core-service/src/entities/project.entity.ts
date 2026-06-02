import { Column, Entity } from 'typeorm';
import type { GeoJSONPolygon, ProjectStatus, ProjectType } from '@platform/shared-types';
import { bigintTransformer } from '../database/column-transformers';
import { TenantEntity } from './base.entity';

/** A project — the fundamental unit of organisation (SRS §7). */
@Entity('projects')
export class ProjectEntity extends TenantEntity {
  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 30 })
  type!: ProjectType;

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status!: ProjectStatus;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  regionOfInterest!: GeoJSONPolygon | null;

  @Column({ type: 'uuid' })
  createdByUserId!: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  lastActivityAt!: Date;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  thumbnailKey!: string | null;

  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  storageBytes!: number;
}
