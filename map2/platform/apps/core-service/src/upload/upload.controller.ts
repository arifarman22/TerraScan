/**
 * Drone image upload endpoints (SRS §8).
 */
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@platform/shared-types';
import { RequirePermission } from '../rbac/rbac.decorators';
import { CompleteUploadDto, InitiateUploadDto } from './dto/upload.dto';
import { UploadService } from './upload.service';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('initiate')
  @HttpCode(200)
  @RequirePermission(Permission.IMAGERY_UPLOAD)
  @ApiOperation({ summary: 'Validate files and issue pre-signed upload URLs' })
  initiate(@Body() dto: InitiateUploadDto) {
    return this.uploadService.initiate(dto);
  }

  @Post('missions/:missionId/complete')
  @HttpCode(200)
  @RequirePermission(Permission.IMAGERY_UPLOAD)
  @ApiOperation({ summary: 'Confirm uploaded objects and ingest the imagery' })
  complete(
    @Param('missionId') missionId: string,
    @Body() dto: CompleteUploadDto,
  ) {
    return this.uploadService.complete(missionId, dto);
  }

  @Get('missions/:missionId/images')
  @RequirePermission(Permission.PROJECT_VIEW)
  @ApiOperation({ summary: 'Image Library — uploaded images for a mission' })
  listImages(@Param('missionId') missionId: string) {
    return this.uploadService.listImages(missionId);
  }
}
