/**
 * RBAC inspection endpoints (SRS §6).
 */
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Permission } from '@platform/shared-types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { PermissionEntity } from '../entities/permission.entity';
import { RoleEntity } from '../entities/role.entity';
import { PermissionService } from './permission.service';
import { RequirePermission } from './rbac.decorators';

@ApiTags('rbac')
@ApiBearerAuth()
@Controller('rbac')
export class RbacController {
  constructor(
    private readonly permissionService: PermissionService,
    @InjectRepository(PermissionEntity)
    private readonly permissions: Repository<PermissionEntity>,
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
  ) {}

  @Get('me/permissions')
  @ApiOperation({ summary: 'Effective permissions of the current user' })
  async myPermissions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ permissions: string[] }> {
    const held = await this.permissionService.getPermissions(user.userId);
    return { permissions: [...held].sort() };
  }

  @Get('permissions')
  @RequirePermission(Permission.ROLE_MANAGE)
  @ApiOperation({ summary: 'Permission catalogue — requires manage:role' })
  listCatalogue(): Promise<PermissionEntity[]> {
    return this.permissions.find({ order: { category: 'ASC', code: 'ASC' } });
  }

  @Get('roles')
  @RequirePermission(Permission.ROLE_ASSIGN)
  @ApiOperation({ summary: 'Roles in the organisation — requires assign:role' })
  listRoles(@CurrentUser() user: AuthenticatedUser): Promise<RoleEntity[]> {
    return this.roles.find({
      where: [
        { organisationId: IsNull() },
        { organisationId: user.organisationId },
      ],
      order: { name: 'ASC' },
    });
  }
}
