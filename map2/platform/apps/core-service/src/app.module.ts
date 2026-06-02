import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyModule } from './apikey/apikey.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { JobModule } from './job/job.module';
import { RabbitMQModule } from './messaging/rabbitmq.module';
import { MetricsModule } from './metrics/metrics.module';
import { ProjectModule } from './project/project.module';
import { PublicApiModule } from './public-api/public-api.module';
import { RbacModule } from './rbac/rbac.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { TenantModule } from './tenant/tenant.module';
import { UploadModule } from './upload/upload.module';

/**
 * Root module of the Core Management Service.
 * Phase 7 adds the cross-cutting Metrics and Audit modules.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      load: [configuration],
    }),
    DatabaseModule,
    RedisModule,
    RabbitMQModule,
    StorageModule,
    MetricsModule,
    AuditModule,
    AuthModule,
    RbacModule,
    TenantModule,
    ProjectModule,
    UploadModule,
    JobModule,
    ApiKeyModule,
    PublicApiModule,
    HealthModule,
  ],
})
export class AppModule {}
