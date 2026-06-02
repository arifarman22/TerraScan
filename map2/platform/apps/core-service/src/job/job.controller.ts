/**
 * Job endpoints (SRS §14 — Jobs Dashboard).
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@platform/shared-types';
import { RequirePermission } from '../rbac/rbac.decorators';
import { CreateJobDto } from './dto/job.dto';
import { JobService } from './job.service';

@ApiTags('jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @RequirePermission(Permission.JOB_LAUNCH)
  @ApiOperation({ summary: 'Submit a processing job' })
  create(@Body() dto: CreateJobDto) {
    return this.jobService.create(dto);
  }

  @Get()
  @RequirePermission(Permission.JOB_VIEW)
  @ApiOperation({ summary: 'List jobs (filterable by project/mission/status)' })
  list(
    @Query('projectId') projectId?: string,
    @Query('missionId') missionId?: string,
    @Query('status') status?: string,
  ) {
    return this.jobService.list({ projectId, missionId, status });
  }

  @Get(':id')
  @RequirePermission(Permission.JOB_VIEW)
  @ApiOperation({ summary: 'Get a job by id' })
  get(@Param('id') id: string) {
    return this.jobService.getById(id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePermission(Permission.JOB_CANCEL)
  @ApiOperation({ summary: 'Cancel a job' })
  cancel(@Param('id') id: string) {
    return this.jobService.cancel(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(Permission.JOB_CANCEL)
  @ApiOperation({
    summary: 'Delete a job and its processing outputs',
    description:
      'Non-terminal jobs are auto-cancelled before removal so any in-flight worker exits cleanly.',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.jobService.remove(id);
  }
}
