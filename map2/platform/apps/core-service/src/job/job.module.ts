import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectModule } from '../project/project.module';
import { TenantModule } from '../tenant/tenant.module';
import { JobController } from './job.controller';
import { JobGateway } from './job.gateway';
import { JobService } from './job.service';

/**
 * Job module (SRS §14). Imports AuthModule for WebSocket-handshake
 * authentication, TenantModule for the RLS context, and ProjectModule for
 * mission lookups.
 */
@Module({
  imports: [AuthModule, TenantModule, ProjectModule],
  controllers: [JobController],
  providers: [JobService, JobGateway],
})
export class JobModule {}
