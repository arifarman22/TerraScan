import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { TenantModule } from '../tenant/tenant.module';
import { MeteringController } from './metering.controller';
import { MeteringService } from './metering.service';
import { MissionController } from './mission.controller';
import { MissionService } from './mission.service';
import { OutputController } from './output.controller';
import { OutputService } from './output.service';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

/**
 * Project, mission, metering, and output module (SRS §7 / §5.4).
 */
@Module({
  imports: [TenantModule, StorageModule],
  controllers: [
    ProjectController,
    MissionController,
    MeteringController,
    OutputController,
  ],
  providers: [ProjectService, MissionService, MeteringService, OutputService],
  exports: [ProjectService, MissionService, MeteringService, OutputService],
})
export class ProjectModule {}
