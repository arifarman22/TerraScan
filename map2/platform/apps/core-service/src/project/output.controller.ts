/**
 * Processing-output endpoints (SRS §5.4 / FR-DATA-004).
 */
import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@platform/shared-types';
import { RequirePermission } from '../rbac/rbac.decorators';
import { StorageService } from '../storage/storage.service';
import { OutputService } from './output.service';

const PROCESSED_BUCKET = 'platform-processed';
const DOWNLOAD_TTL_SECONDS = 900;

@ApiTags('outputs')
@ApiBearerAuth()
@Controller()
export class OutputController {
  constructor(
    private readonly outputService: OutputService,
    private readonly storageService: StorageService,
  ) {}

  @Get('projects/:id/outputs')
  @RequirePermission(Permission.PROJECT_VIEW)
  @ApiOperation({ summary: 'List processing outputs for a project' })
  byProject(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.outputService.list({ projectId });
  }

  @Get('missions/:id/outputs')
  @RequirePermission(Permission.PROJECT_VIEW)
  @ApiOperation({ summary: 'List processing outputs for a mission' })
  byMission(@Param('id', ParseUUIDPipe) missionId: string) {
    return this.outputService.list({ missionId });
  }

  @Get('jobs/:id/outputs')
  @RequirePermission(Permission.JOB_VIEW)
  @ApiOperation({ summary: 'List processing outputs produced by a job' })
  byJob(@Param('id', ParseUUIDPipe) jobId: string) {
    return this.outputService.list({ jobId });
  }

  @Get('outputs/:id/download')
  @RequirePermission(Permission.PROJECT_VIEW)
  @ApiOperation({ summary: 'Pre-signed download URL for a processing output' })
  async download(@Param('id', ParseUUIDPipe) id: string) {
    const output = await this.outputService.findOne(id);
    if (!output) {
      throw new NotFoundException('Output not found');
    }
    const url = await this.storageService.presignGetUrl(
      PROCESSED_BUCKET,
      output.storageKey,
      DOWNLOAD_TTL_SECONDS,
    );
    return {
      outputId: output.id,
      type: output.type,
      format: output.format,
      sizeBytes: output.sizeBytes,
      url,
      expiresIn: DOWNLOAD_TTL_SECONDS,
    };
  }

  @Get('outputs/:id/preview-url')
  @RequirePermission(Permission.PROJECT_VIEW)
  @ApiOperation({
    summary: 'Pre-signed URL for the output\'s browser-paintable preview PNG',
    description:
      'A downsampled RGBA PNG of the raster output plus its WGS84 bounding ' +
      'box. Use these with a deck.gl BitmapLayer (or equivalent) to render ' +
      'the output on a 2D map without a tile server.',
  })
  async previewUrl(@Param('id', ParseUUIDPipe) id: string) {
    const output = await this.outputService.findOne(id);
    if (!output) {
      throw new NotFoundException('Output not found');
    }
    const stats = output.statistics as
      | {
          previewKey?: string;
          bboxWgs84?: [number, number, number, number];
        }
      | null;
    if (!stats?.previewKey || !stats?.bboxWgs84) {
      throw new NotFoundException('No preview available for this output');
    }
    const url = await this.storageService.presignGetUrl(
      PROCESSED_BUCKET,
      stats.previewKey,
      DOWNLOAD_TTL_SECONDS,
    );
    return {
      outputId: output.id,
      url,
      bbox: stats.bboxWgs84,
      expiresIn: DOWNLOAD_TTL_SECONDS,
    };
  }
}
