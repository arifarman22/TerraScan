/**
 * Request DTOs for the project & mission module.
 */
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DataSourceType, type GeoJSONPolygon, ProjectType } from '@platform/shared-types';

export class CreateProjectDto {
  @IsUUID()
  workspaceId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsEnum(ProjectType)
  type!: ProjectType;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsObject()
  regionOfInterest?: GeoJSONPolygon;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsObject()
  regionOfInterest?: GeoJSONPolygon;
}

export class CreateMissionDto {
  @IsUUID()
  projectId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsEnum(DataSourceType)
  sourceType!: DataSourceType;

  @IsOptional()
  @IsDateString()
  collectedAt?: string;

  @IsOptional()
  @IsObject()
  coverageArea?: GeoJSONPolygon;
}

export class UpdateMissionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsDateString()
  collectedAt?: string;

  @IsOptional()
  @IsObject()
  coverageArea?: GeoJSONPolygon;
}
