import { Column, Entity } from 'typeorm';
import type { ImageMetadata } from '@platform/shared-types';
import { bigintTransformer } from '../database/column-transformers';
import { TenantEntity } from './base.entity';

/** A single uploaded image file within a mission (SRS §8, FR-IMG-007/008). */
@Entity('mission_images')
export class MissionImageEntity extends TenantEntity {
  @Column({ type: 'uuid' })
  missionId!: string;

  @Column({ type: 'varchar', length: 512 })
  fileName!: string;

  /** Object-storage key under {org}/{workspace}/{project}/{mission}/raw/. */
  @Column({ type: 'varchar', length: 1024 })
  storageKey!: string;

  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  sizeBytes!: number;

  /** SHA-256 checksum recorded at upload, re-verified at processing start. */
  @Column({ type: 'varchar', length: 64 })
  checksumSha256!: string;

  @Column({ type: 'varchar', length: 100 })
  contentType!: string;

  /** EXIF / XMP metadata extracted during ingestion. */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: ImageMetadata;

  @Column({ type: 'boolean', default: false })
  hasGps!: boolean;
}
