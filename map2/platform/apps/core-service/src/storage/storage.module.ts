import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/** Global so the upload and (later) export modules can inject StorageService. */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
