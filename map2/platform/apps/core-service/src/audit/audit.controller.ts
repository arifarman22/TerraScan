import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@platform/shared-types';
import { RequirePermission } from '../rbac/rbac.decorators';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get()
  @RequirePermission(Permission.AUDIT_READ)
  @ApiOperation({ summary: "List the organisation's audit log entries" })
  list(
    @Query('resourceType') resourceType?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('action') action?: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.auditService.list(this.tenantContext.organisationId, {
      resourceType,
      actorUserId,
      action,
      limit,
      offset,
    });
  }
}
