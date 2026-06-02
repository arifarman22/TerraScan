/**
 * Request DTOs for the upload module.
 */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UploadFileDescriptorDto {
  @IsString()
  @MaxLength(512)
  fileName!: string;

  @IsInt()
  @Min(1)
  sizeBytes!: number;

  @IsString()
  @MaxLength(100)
  contentType!: string;
}

export class InitiateUploadDto {
  @IsUUID()
  missionId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => UploadFileDescriptorDto)
  files!: UploadFileDescriptorDto[];
}

export class CompletedFileDto {
  @IsString()
  @MaxLength(1024)
  storageKey!: string;

  @IsString()
  @MaxLength(512)
  fileName!: string;

  @IsString()
  @Matches(/^[a-fA-F0-9]{64}$/, {
    message: 'checksumSha256 must be a 64-character hex SHA-256 digest',
  })
  checksumSha256!: string;
}

export class CompleteUploadDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => CompletedFileDto)
  files!: CompletedFileDto[];
}
