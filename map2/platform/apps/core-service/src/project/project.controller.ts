/**
 * Project endpoints (SRS §7).
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@platform/shared-types';
import { RequirePermission } from '../rbac/rbac.decorators';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectService } from './project.service';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @RequirePermission(Permission.PROJECT_CREATE)
  @ApiOperation({ summary: 'Create a project' })
  create(@Body() dto: CreateProjectDto) {
    return this.projectService.create(dto);
  }

  @Get()
  @RequirePermission(Permission.PROJECT_VIEW)
  @ApiOperation({ summary: 'List projects (filterable by workspace/status/type)' })
  list(
    @Query('workspaceId') workspaceId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.projectService.list({ workspaceId, status, type });
  }

  @Get(':id')
  @RequirePermission(Permission.PROJECT_VIEW)
  @ApiOperation({ summary: 'Get a project by id' })
  get(@Param('id') id: string) {
    return this.projectService.getById(id);
  }

  @Patch(':id')
  @RequirePermission(Permission.PROJECT_MANAGE)
  @ApiOperation({ summary: 'Update a project' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectService.update(id, dto);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @RequirePermission(Permission.PROJECT_MANAGE)
  @ApiOperation({ summary: 'Archive a project (makes it read-only)' })
  archive(@Param('id') id: string) {
    return this.projectService.archive(id);
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermission(Permission.PROJECT_DELETE)
  @ApiOperation({ summary: 'Delete a project and all its data' })
  async remove(@Param('id') id: string): Promise<{ deleted: true }> {
    await this.projectService.remove(id);
    return { deleted: true };
  }
}
