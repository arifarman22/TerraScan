import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * An API key issued by an organisation for programmatic access (SRS §11).
 * Cleartext is never stored — only the SHA-256 hash of `pk_live_<32 chars>`.
 */
@Entity('api_keys')
export class ApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  organisationId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  prefix!: string;

  @Column({ type: 'varchar', length: 128, unique: true })
  keyHash!: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  scopes!: string[];

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy!: string | null;
}
