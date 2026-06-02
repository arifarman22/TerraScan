import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { OrganisationController } from './organisation.controller';
import { OrganisationService } from './organisation.service';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { TenantContextService } from './tenant-context.service';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';

/**
 * Tenant module — organisations, workspaces, members. Registers the global
 * {@link TenantContextInterceptor} that activates Row-Level Security for
 * every authenticated request.
 */
@Module({
  imports: [AuthModule],
  controllers: [OrganisationController, WorkspaceController, MemberController],
  providers: [
    TenantContextService,
    OrganisationService,
    WorkspaceService,
    MemberService,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
  exports: [TenantContextService],
})
export class TenantModule {}
