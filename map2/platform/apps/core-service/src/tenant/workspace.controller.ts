/**
 * Workspace endpoints (SRS FR-TEN-002).
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@platform/shared-types';
import { RequirePermission } from '../rbac/rbac.decorators';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/tenant.dto';
import { WorkspaceService } from './workspace.service';

@ApiTags('workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @RequirePermission(Permission.WORKSPACE_CREATE)
  @ApiOperation({ summary: 'Create a workspace' })
  create(@Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List workspaces in the organisation' })
  list() {
    return this.workspaceService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workspace by id' })
  get(@Param('id') id: string) {
    return this.workspaceService.getById(id);
  }

  @Patch(':id')
  @RequirePermission(Permission.WORKSPACE_MANAGE)
  @ApiOperation({ summary: 'Update a workspace' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.workspaceService.update(id, dto);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @RequirePermission(Permission.WORKSPACE_MANAGE)
  @ApiOperation({ summary: 'Archive a workspace' })
  archive(@Param('id') id: string) {
    return this.workspaceService.archive(id);
  }
}
