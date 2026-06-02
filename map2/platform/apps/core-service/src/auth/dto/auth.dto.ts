/**
 * Request DTOs for the authentication endpoints. Validated by the global
 * ValidationPipe (whitelist + forbidNonWhitelisted).
 */
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DataResidencyRegion } from '@platform/shared-types';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  organisationName!: string;

  @IsEnum(DataResidencyRegion)
  region!: DataResidencyRegion;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  fullName!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  /** SRS FR-AUTH-003 — minimum 12 characters. */
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'mfaCode must be 6 digits' })
  mfaCode?: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}

export class MfaCodeDto {
  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'code must be 6 digits' })
  code!: string;
}
