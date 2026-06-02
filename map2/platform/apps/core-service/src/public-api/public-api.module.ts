import { Module } from '@nestjs/common';
import { ApiKeyModule } from '../apikey/apikey.module';
import { ProjectModule } from '../project/project.module';
import { StorageModule } from '../storage/storage.module';
import { PublicOutputController } from './public-output.controller';
import { PublicProjectController } from './public-project.controller';

/**
 * Public-API surface (SRS §11). Mounts under `/api/v1/public/*` and uses
 * the {@link ApiKeyAuthGuard} instead of the JWT guard.
 */
@Module({
  imports: [ApiKeyModule, ProjectModule, StorageModule],
  controllers: [PublicProjectController, PublicOutputController],
})
export class PublicApiModule {}
