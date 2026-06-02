import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * Permission catalogue (SRS §6). A global, non-tenant reference table — the
 * authoritative list of permission-gated actions. Not subject to RLS.
 */
@Entity('permissions')
export class PermissionEntity {
  /** The permission code, e.g. `manage:organisation`. */
  @PrimaryColumn({ type: 'varchar', length: 80 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ type: 'varchar', length: 40 })
  category!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
