/**
 * Storage metering endpoint (SRS FR-DATA-005).
 */
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MeteringService } from './metering.service';

@ApiTags('metering')
@ApiBearerAuth()
@Controller('metering')
export class MeteringController {
  constructor(private readonly meteringService: MeteringService) {}

  @Get('storage')
  @ApiOperation({ summary: 'Organisation storage usage versus quota' })
  storage() {
    return this.meteringService.getStorageSummary();
  }
}
