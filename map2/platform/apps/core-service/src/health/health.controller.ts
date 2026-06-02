/**
 * Liveness and readiness probes (SRS NFR-AVAIL-005).
 * `GET /health` verifies connectivity to PostgreSQL, Redis, and RabbitMQ
 * and is the target of the container health check.
 */
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { Public } from '../rbac/rbac.decorators';
import { RedisService } from '../redis/redis.service';

interface HealthReport {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
  checks: Record<'database' | 'redis' | 'rabbitmq', 'up' | 'down'>;
}

@Public()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redis: RedisService,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Readiness probe — checks database, Redis, RabbitMQ' })
  async check(): Promise<HealthReport> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.redis.ping(),
    ]);
    const rabbitmq = this.rabbitmq.isHealthy();
    const ok = database && redis && rabbitmq;

    const report: HealthReport = {
      status: ok ? 'ok' : 'error',
      service: 'core-service',
      timestamp: new Date().toISOString(),
      checks: {
        database: database ? 'up' : 'down',
        redis: redis ? 'up' : 'down',
        rabbitmq: rabbitmq ? 'up' : 'down',
      },
    };

    if (!ok) {
      throw new ServiceUnavailableException(report);
    }
    return report;
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe — process is running' })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
