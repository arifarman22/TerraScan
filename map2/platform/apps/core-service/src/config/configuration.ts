/**
 * Typed application configuration, loaded by @nestjs/config.
 * Raw environment variables are validated separately by `validateEnv`.
 */

export interface DatabaseConfig {
  /** Owner connection (map_admin) — migrations and pre-tenant operations. */
  readonly url: string;
  /** Least-privilege connection (map_app) — RLS-enforced tenant data. */
  readonly appUrl: string;
}

export interface RedisConfig {
  readonly url: string;
}

export interface RabbitMQConfig {
  readonly url: string;
}

export interface StorageConfig {
  /** Container-network MinIO endpoint (host:port) for server-side calls. */
  readonly endpoint: string;
  /** Browser-reachable MinIO endpoint (host:port) for pre-signed URLs. */
  readonly publicEndpoint: string;
  readonly accessKey: string;
  readonly secretKey: string;
  readonly useSsl: boolean;
  readonly rawBucket: string;
}

export interface AuthConfig {
  readonly jwtAccessSecret: string;
  readonly jwtRefreshSecret: string;
  readonly jwtAccessTtl: number;
  readonly jwtRefreshTtl: number;
  readonly argon2MemoryCost: number;
  readonly argon2TimeCost: number;
  readonly loginMaxAttempts: number;
  readonly loginLockoutSeconds: number;
  readonly mfaIssuer: string;
}

export interface AppConfig {
  readonly nodeEnv: string;
  readonly coreServicePort: number;
  readonly corsOrigins: string[];
  readonly database: DatabaseConfig;
  readonly redis: RedisConfig;
  readonly rabbitmq: RabbitMQConfig;
  readonly storage: StorageConfig;
  readonly auth: AuthConfig;
}

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Configuration factory consumed via `ConfigModule.forRoot({ load: [configuration] })`. */
export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  coreServicePort: int(process.env.CORE_SERVICE_PORT, 3001),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
  database: {
    url: process.env.DATABASE_URL ?? '',
    appUrl: process.env.DATABASE_APP_URL ?? '',
  },
  redis: { url: process.env.REDIS_URL ?? '' },
  rabbitmq: { url: process.env.RABBITMQ_URL ?? '' },
  storage: {
    endpoint: process.env.MINIO_ENDPOINT ?? '',
    publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT ?? '',
    accessKey: process.env.MINIO_ACCESS_KEY ?? '',
    secretKey: process.env.MINIO_SECRET_KEY ?? '',
    useSsl: (process.env.MINIO_USE_SSL ?? 'false') === 'true',
    rawBucket: process.env.MINIO_BUCKET_RAW ?? 'platform-raw',
  },
  auth: {
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    jwtAccessTtl: int(process.env.JWT_ACCESS_TTL, 900),
    jwtRefreshTtl: int(process.env.JWT_REFRESH_TTL, 604_800),
    argon2MemoryCost: int(process.env.ARGON2_MEMORY_COST, 19_456),
    argon2TimeCost: int(process.env.ARGON2_TIME_COST, 2),
    loginMaxAttempts: int(process.env.LOGIN_MAX_ATTEMPTS, 5),
    loginLockoutSeconds: int(process.env.LOGIN_LOCKOUT_SECONDS, 900),
    mfaIssuer: process.env.MFA_ISSUER ?? 'DroneSatPlatform',
  },
});
