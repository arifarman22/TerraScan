import { Column, Entity } from 'typeorm';
import { TenantEntity } from './base.entity';

/** A workspace — team / client / business-unit container (SRS FR-TEN-002). */
@Entity('workspaces')
export class WorkspaceEntity extends TenantEntity {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 120 })
  slug!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'boolean', default: false })
  archived!: boolean;

  @Column({ type: 'uuid' })
  createdByUserId!: string;
}
