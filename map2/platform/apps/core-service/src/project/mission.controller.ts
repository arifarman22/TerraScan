/**
 * Mission endpoints (SRS FR-PROJ-003).
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
import { CreateMissionDto, UpdateMissionDto } from './dto/project.dto';
import { MissionService } from './mission.service';

@ApiTags('missions')
@ApiBearerAuth()
@Controller('missions')
export class MissionController {
  constructor(private readonly missionService: MissionService) {}

  @Post()
  @RequirePermission(Permission.MISSION_MANAGE)
  @ApiOperation({ summary: 'Create a mission within a project' })
  create(@Body() dto: CreateMissionDto) {
    return this.missionService.create(dto);
  }

  @Get()
  @RequirePermission(Permission.PROJECT_VIEW)
  @ApiOperation({ summary: 'List missions (filterable by project)' })
  list(@Query('projectId') projectId?: string) {
    return this.missionService.list(projectId);
  }

  @Get(':id')
  @RequirePermission(Permission.PROJECT_VIEW)
  @ApiOperation({ summary: 'Get a mission by id' })
  get(@Param('id') id: string) {
    return this.missionService.getById(id);
  }

  @Patch(':id')
  @RequirePermission(Permission.MISSION_MANAGE)
  @ApiOperation({ summary: 'Update a mission' })
  update(@Param('id') id: string, @Body() dto: UpdateMissionDto) {
    return this.missionService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermission(Permission.MISSION_MANAGE)
  @ApiOperation({ summary: 'Delete a mission and all its data' })
  async remove(@Param('id') id: string): Promise<{ deleted: true }> {
    await this.missionService.remove(id);
    return { deleted: true };
  }
}
