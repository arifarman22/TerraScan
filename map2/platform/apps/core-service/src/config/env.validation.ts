/**
 * Fail-fast validation of raw environment variables at startup.
 * A misconfigured service refuses to boot rather than failing later (SRS C3).
 */
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnvironment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV!: NodeEnvironment;

  @IsInt()
  @Min(1)
  @Max(65535)
  CORE_SERVICE_PORT!: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_APP_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_URL!: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsString()
  @IsNotEmpty()
  MINIO_ENDPOINT!: string;

  @IsString()
  @IsNotEmpty()
  MINIO_PUBLIC_ENDPOINT!: string;

  @IsString()
  @IsNotEmpty()
  MINIO_ACCESS_KEY!: string;

  @IsString()
  @IsNotEmpty()
  MINIO_SECRET_KEY!: string;

  @IsOptional()
  @IsString()
  MINIO_BUCKET_RAW?: string;

  @IsOptional()
  @IsString()
  MINIO_USE_SSL?: string;

  @IsString()
  @MinLength(16)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(16)
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  JWT_ACCESS_TTL?: number;

  @IsOptional()
  @IsInt()
  @Min(300)
  JWT_REFRESH_TTL?: number;

  @IsOptional()
  @IsInt()
  ARGON2_MEMORY_COST?: number;

  @IsOptional()
  @IsInt()
  ARGON2_TIME_COST?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  LOGIN_MAX_ATTEMPTS?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  LOGIN_LOCKOUT_SECONDS?: number;

  @IsOptional()
  @IsString()
  MFA_ISSUER?: string;
}

/** Validate `process.env`; throws with a readable message on any violation. */
export function validateEnv(raw: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, raw, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .filter((text) => text.length > 0)
      .join('; ');
    throw new Error(`Environment validation failed: ${details}`);
  }
  return validated;
}
