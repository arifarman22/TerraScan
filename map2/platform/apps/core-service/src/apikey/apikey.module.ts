import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';
import { ApiKeyAuthGuard } from './api-key.guard';
import { ApiKeyController } from './apikey.controller';
import { ApiKeyService } from './apikey.service';
import { ApiKeyRateLimitGuard } from './rate-limit.guard';

@Module({
  imports: [TenantModule],
  controllers: [ApiKeyController],
  providers: [ApiKeyService, ApiKeyAuthGuard, ApiKeyRateLimitGuard],
  exports: [ApiKeyService, ApiKeyAuthGuard, ApiKeyRateLimitGuard],
})
export class ApiKeyModule {}
