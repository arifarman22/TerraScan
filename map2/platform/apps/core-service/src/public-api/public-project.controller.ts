import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../apikey/api-key.guard';
import { ApiKeyRateLimitGuard } from '../apikey/rate-limit.guard';
import { Public } from '../rbac/rbac.decorators';
import { OutputService } from '../project/output.service';
import { ProjectService } from '../project/project.service';

/**
 * Public-API project endpoints (SRS §11). Authenticated by API key
 * (`Authorization: ApiKey pk_live_…`); RLS-confined to the key's
 * organisation; rate-limited per key.
 */
@ApiTags('public')
@ApiSecurity('ApiKey')
@Public()
@UseGuards(ApiKeyAuthGuard, ApiKeyRateLimitGuard)
@Controller('public/projects')
export class PublicProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly outputService: OutputService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the organisation\'s projects' })
  list() {
    return this.projectService.list({});
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a single project' })
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const project = await this.projectService.getById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  @Get(':id/outputs')
  @ApiOperation({ summary: "List a project's processing outputs" })
  outputs(@Param('id', ParseUUIDPipe) id: string) {
    return this.outputService.list({ projectId: id });
  }
}
