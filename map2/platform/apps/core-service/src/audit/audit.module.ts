import { Global, Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Global()
@Module({
  imports: [TenantModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
