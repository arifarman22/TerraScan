/**
 * Organisation read, update, and suspension/closure lifecycle
 * (SRS §4 / FR-TEN-007/008). All queries run through the tenant-scoped
 * connection, so RLS guarantees a tenant can only ever touch its own row.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganisationStatus } from '@platform/shared-types';
import { OrganisationEntity } from '../entities/organisation.entity';
import type { UpdateOrganisationDto } from './dto/tenant.dto';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class OrganisationService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private repo() {
    return this.tenantContext.getRepository(OrganisationEntity);
  }

  async getCurrent(): Promise<OrganisationEntity> {
    const organisation = await this.repo().findOne({
      where: { id: this.tenantContext.organisationId },
    });
    if (!organisation) {
      throw new NotFoundException('Organisation not found');
    }
    return organisation;
  }

  async update(dto: UpdateOrganisationDto): Promise<OrganisationEntity> {
    const organisation = await this.getCurrent();
    if (dto.name !== undefined) {
      organisation.name = dto.name;
    }
    if (dto.legalName !== undefined) {
      organisation.legalName = dto.legalName;
    }
    if (dto.primaryContactEmail !== undefined) {
      organisation.primaryContactEmail = dto.primaryContactEmail;
    }
    return this.repo().save(organisation);
  }

  async suspend(): Promise<OrganisationEntity> {
    const organisation = await this.getCurrent();
    organisation.status = OrganisationStatus.SUSPENDED;
    organisation.suspendedAt = new Date();
    return this.repo().save(organisation);
  }

  async reactivate(): Promise<OrganisationEntity> {
    const organisation = await this.getCurrent();
    organisation.status = OrganisationStatus.ACTIVE;
    organisation.suspendedAt = null;
    return this.repo().save(organisation);
  }

  async close(): Promise<OrganisationEntity> {
    const organisation = await this.getCurrent();
    organisation.status = OrganisationStatus.CLOSED;
    organisation.closedAt = new Date();
    return this.repo().save(organisation);
  }
}
