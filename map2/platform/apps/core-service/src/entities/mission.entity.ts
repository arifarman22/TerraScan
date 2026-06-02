import { Column, Entity } from 'typeorm';
import type { DataSourceType, GeoJSONPolygon, MissionStatus } from '@platform/shared-types';
import { bigintTransformer } from '../database/column-transformers';
import { TenantEntity } from './base.entity';

/** A mission — one data-collection event (SRS FR-PROJ-003). */
@Entity('missions')
export class MissionEntity extends TenantEntity {
  @Column({ type: 'uuid' })
  projectId!: string;

  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  sourceType!: DataSourceType;

  @Column({ type: 'varchar', length: 20, default: 'CREATED' })
  status!: MissionStatus;

  @Column({ type: 'timestamptz', nullable: true })
  collectedAt!: Date | null;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  coverageArea!: GeoJSONPolygon | null;

  @Column({ type: 'int', default: 0 })
  fileCount!: number;

  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  rawSizeBytes!: number;

  @Column({ type: 'uuid' })
  createdByUserId!: string;
}
