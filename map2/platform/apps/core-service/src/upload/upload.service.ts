/**
 * Drone image ingestion (SRS §8).
 *
 *  - `initiate` validates each file (format, size) and returns pre-signed
 *    PUT URLs so the client uploads directly to object storage (FR-IMG-006).
 *  - `complete` confirms uploaded objects: it verifies each object exists,
 *    extracts EXIF metadata, records a `mission_images` row, updates the
 *    mission and project, meters storage, and publishes the durable
 *    `imagery.uploaded` event (FR-IMG-007/008, FR-JOB-003).
 */
import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  type DomainEvent,
  EventType,
  type ImageryUploadedPayload,
  MissionStatus,
  ProjectStatus,
} from '@platform/shared-types';
import { MissionEntity } from '../entities/mission.entity';
import { MissionImageEntity } from '../entities/mission-image.entity';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { MeteringService } from '../project/metering.service';
import { MissionService } from '../project/mission.service';
import { assertMissionTransition } from '../project/project-status';
import { ProjectService } from '../project/project.service';
import { StorageService } from '../storage/storage.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import type { CompleteUploadDto, InitiateUploadDto } from './dto/upload.dto';
import { ExifService } from './exif.service';

const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'tif',
  'tiff',
  'dng',
]);
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  dng: 'image/x-adobe-dng',
};
const MAX_FILE_BYTES = 500 * 1024 * 1024;
const PRESIGN_EXPIRY_SECONDS = 3600;
const EXIF_HEAD_BYTES = 131072;

interface AcceptedFile {
  fileName: string;
  storageKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
}
interface RejectedFile {
  fileName: string;
  reason: string;
}
interface InitiateResult {
  missionId: string;
  accepted: AcceptedFile[];
  rejected: RejectedFile[];
}
interface CompleteResult {
  missionId: string;
  imagesIngested: number;
  totalImages: number;
  rawSizeBytes: number;
  imagesMissingGps: number;
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

function sanitize(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly rawBucket: string;

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly storage: StorageService,
    private readonly exif: ExifService,
    private readonly missionService: MissionService,
    private readonly projectService: ProjectService,
    private readonly metering: MeteringService,
    private readonly rabbitmq: RabbitMQService,
    config: ConfigService,
  ) {
    this.rawBucket = config.getOrThrow<string>('storage.rawBucket');
  }

  /** Validate files and return pre-signed upload URLs. */
  async initiate(dto: InitiateUploadDto): Promise<InitiateResult> {
    const mission = await this.missionService.getById(dto.missionId);
    const project = await this.projectService.getById(mission.projectId);
    if (project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException('Cannot upload to an archived project');
    }

    const accepted: AcceptedFile[] = [];
    const rejected: RejectedFile[] = [];

    for (const file of dto.files) {
      const extension = extensionOf(file.fileName);
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        rejected.push({
          fileName: file.fileName,
          reason: `Unsupported file format: .${extension || 'unknown'}`,
        });
        continue;
      }
      if (file.sizeBytes > MAX_FILE_BYTES) {
        rejected.push({
          fileName: file.fileName,
          reason: 'File exceeds the 500 MB per-file limit',
        });
        continue;
      }
      const storageKey = this.buildStorageKey(mission, file.fileName);
      accepted.push({
        fileName: file.fileName,
        storageKey,
        uploadUrl: await this.storage.presignPutUrl(
          this.rawBucket,
          storageKey,
          PRESIGN_EXPIRY_SECONDS,
        ),
        expiresInSeconds: PRESIGN_EXPIRY_SECONDS,
      });
    }

    return { missionId: mission.id, accepted, rejected };
  }

  /** Confirm uploaded objects and ingest them into the mission. */
  async complete(
    missionId: string,
    dto: CompleteUploadDto,
  ): Promise<CompleteResult> {
    const mission = await this.missionService.getById(missionId);
    const project = await this.projectService.getById(mission.projectId);
    const imageRepo = this.tenantContext.getRepository(MissionImageEntity);

    let imagesIngested = 0;
    let ingestedBytes = 0;

    for (const file of dto.files) {
      const stat = await this.storage.statObject(
        this.rawBucket,
        file.storageKey,
      );
      if (!stat) {
        this.logger.warn(
          `Skipping ${file.fileName}: object not found in storage`,
        );
        continue;
      }

      const head = await this.storage.readRange(
        this.rawBucket,
        file.storageKey,
        0,
        EXIF_HEAD_BYTES,
      );
      const metadata = await this.exif.extract(head);
      const hasGps = metadata.latitude !== null && metadata.longitude !== null;

      const existing = await imageRepo.findOne({
        where: { storageKey: file.storageKey },
      });
      if (existing) {
        existing.fileName = file.fileName;
        existing.sizeBytes = stat.size;
        existing.checksumSha256 = file.checksumSha256.toLowerCase();
        existing.metadata = metadata;
        existing.hasGps = hasGps;
        await imageRepo.save(existing);
      } else {
        await imageRepo.save(
          imageRepo.create({
            organisationId: this.tenantContext.organisationId,
            missionId: mission.id,
            fileName: file.fileName,
            storageKey: file.storageKey,
            sizeBytes: stat.size,
            checksumSha256: file.checksumSha256.toLowerCase(),
            contentType:
              CONTENT_TYPES[extensionOf(file.fileName)] ??
              'application/octet-stream',
            metadata,
            hasGps,
          }),
        );
        imagesIngested += 1;
        ingestedBytes += stat.size;
      }
    }

    // Recompute mission totals from the authoritative row set.
    const images = await imageRepo.find({ where: { missionId: mission.id } });
    const totalImages = images.length;
    const rawSizeBytes = images.reduce(
      (total, image) => total + Number(image.sizeBytes),
      0,
    );
    const imagesMissingGps = images.filter((image) => !image.hasGps).length;

    const missionRepo = this.tenantContext.getRepository(MissionEntity);
    mission.fileCount = totalImages;
    mission.rawSizeBytes = rawSizeBytes;
    assertMissionTransition(mission.status, MissionStatus.READY);
    mission.status = MissionStatus.READY;
    await missionRepo.save(mission);

    if (project.status === ProjectStatus.DRAFT) {
      await this.projectService.transitionStatus(
        project.id,
        ProjectStatus.UPLOADING,
      );
    }
    if (ingestedBytes > 0) {
      await this.metering.applyProjectStorageDelta(project.id, ingestedBytes);
    }

    await this.publishImageryUploaded(mission, totalImages, rawSizeBytes);

    return {
      missionId: mission.id,
      imagesIngested,
      totalImages,
      rawSizeBytes,
      imagesMissingGps,
    };
  }

  /** The Image Library view for a mission (SRS FR-IMG-009). */
  async listImages(missionId: string): Promise<{
    images: MissionImageEntity[];
    summary: { count: number; totalBytes: number; missingGpsCount: number };
  }> {
    await this.missionService.getById(missionId);
    const images = await this.tenantContext
      .getRepository(MissionImageEntity)
      .find({ where: { missionId }, order: { fileName: 'ASC' } });
    return {
      images,
      summary: {
        count: images.length,
        totalBytes: images.reduce(
          (total, image) => total + Number(image.sizeBytes),
          0,
        ),
        missingGpsCount: images.filter((image) => !image.hasGps).length,
      },
    };
  }

  private buildStorageKey(mission: MissionEntity, fileName: string): string {
    return [
      mission.organisationId,
      mission.workspaceId,
      mission.projectId,
      mission.id,
      'raw',
      sanitize(fileName),
    ].join('/');
  }

  private async publishImageryUploaded(
    mission: MissionEntity,
    fileCount: number,
    rawSizeBytes: number,
  ): Promise<void> {
    const event: DomainEvent<ImageryUploadedPayload> = {
      eventId: randomUUID(),
      eventType: EventType.IMAGERY_UPLOADED,
      occurredAt: new Date().toISOString(),
      organisationId: this.tenantContext.organisationId,
      correlationId: randomUUID(),
      payload: {
        missionId: mission.id,
        projectId: mission.projectId,
        workspaceId: mission.workspaceId,
        fileCount,
        rawSizeBytes,
        uploadedByUserId: this.tenantContext.userId,
      },
    };
    await this.rabbitmq.publish(EventType.IMAGERY_UPLOADED, event);
  }
}
