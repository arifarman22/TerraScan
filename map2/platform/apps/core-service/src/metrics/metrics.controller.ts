import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../rbac/rbac.decorators';
import { MetricsService } from './metrics.service';

/**
 * Prometheus scrape endpoint (SRS NFR-OBS-004).
 *
 * Exposed without authentication — production deployments should restrict
 * it at the network layer (a sidecar network, mTLS, or a private VPC).
 */
@ApiExcludeController()
@Public()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async scrape(@Res() response: Response): Promise<void> {
    response.type(this.metrics.contentType());
    response.send(await this.metrics.render());
  }
}
