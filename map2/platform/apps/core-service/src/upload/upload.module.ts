import { Module } from '@nestjs/common';
import { ProjectModule } from '../project/project.module';
import { TenantModule } from '../tenant/tenant.module';
import { ExifService } from './exif.service';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

/**
 * Upload module (SRS §8). Uses the global StorageService and RabbitMQService;
 * imports ProjectModule for mission/project/metering services.
 */
@Module({
  imports: [TenantModule, ProjectModule],
  controllers: [UploadController],
  providers: [UploadService, ExifService],
})
export class UploadModule {}
