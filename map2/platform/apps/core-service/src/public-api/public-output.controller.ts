import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../apikey/api-key.guard';
import { ApiKeyRateLimitGuard } from '../apikey/rate-limit.guard';
import { Public } from '../rbac/rbac.decorators';
import { OutputService } from '../project/output.service';
import { StorageService } from '../storage/storage.service';

const PROCESSED_BUCKET = 'platform-processed';
const DOWNLOAD_TTL_SECONDS = 900; // 15 minutes

@ApiTags('public')
@ApiSecurity('ApiKey')
@Public()
@UseGuards(ApiKeyAuthGuard, ApiKeyRateLimitGuard)
@Controller('public/outputs')
export class PublicOutputController {
  constructor(
    private readonly outputService: OutputService,
    private readonly storageService: StorageService,
  ) {}

  @Get(':id/download')
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
}
