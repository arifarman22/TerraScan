/**
 * Organisation endpoints (SRS §4). The lifecycle routes are marked
 * `@AllowSuspended()` so an organisation can always read its own status and
 * be reactivated or closed.
 */
import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@platform/shared-types';
import { RequirePermission } from '../rbac/rbac.decorators';
import { UpdateOrganisationDto } from './dto/tenant.dto';
import { OrganisationService } from './organisation.service';
import { AllowSuspended } from './tenant.decorators';

@ApiTags('organisations')
@ApiBearerAuth()
@Controller('organisations')
export class OrganisationController {
  constructor(private readonly organisationService: OrganisationService) {}

  @Get('current')
  @AllowSuspended()
  @ApiOperation({ summary: "Get the caller's organisation" })
  current() {
    return this.organisationService.getCurrent();
  }

  @Patch('current')
  @RequirePermission(Permission.ORG_MANAGE)
  @ApiOperation({ summary: 'Update organisation settings' })
  update(@Body() dto: UpdateOrganisationDto) {
    return this.organisationService.update(dto);
  }

  @Post('current/suspend')
  @HttpCode(200)
  @RequirePermission(Permission.ORG_MANAGE)
  @ApiOperation({ summary: 'Suspend the organisation (disables write access)' })
  suspend() {
    return this.organisationService.suspend();
  }

  @Post('current/reactivate')
  @HttpCode(200)
  @AllowSuspended()
  @RequirePermission(Permission.ORG_MANAGE)
  @ApiOperation({ summary: 'Reactivate a suspended organisation' })
  reactivate() {
    return this.organisationService.reactivate();
  }

  @Post('current/close')
  @HttpCode(200)
  @AllowSuspended()
  @RequirePermission(Permission.ORG_DELETE)
  @ApiOperation({ summary: 'Close the organisation' })
  close() {
    return this.organisationService.close();
  }
}
