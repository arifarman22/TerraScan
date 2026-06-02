/**
 * Request DTOs for the job module.
 */
import { IsEnum, IsObject, IsOptional, IsUUID } from 'class-validator';
import { JobType, QualityPreset } from '@platform/shared-types';

export class CreateJobDto {
  @IsUUID()
  missionId!: string;

  @IsEnum(JobType)
  type!: JobType;

  @IsOptional()
  @IsEnum(QualityPreset)
  preset?: QualityPreset;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
