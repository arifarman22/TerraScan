/**
 * Database connections.
 *
 *  - default ('map_admin', the schema owner) — identity and system
 *    operations that must run before a tenant context exists, such as
 *    login and registration. This role bypasses Row-Level Security.
 *  - 'tenant' ('map_app', least privilege) — all tenant business data.
 *    RLS is enforced; {@link TenantContextInterceptor} sets
 *    `app.current_organisation_id` per request (SRS FR-TEN-004 / NFR-SEC-010).
 *
 * The schema itself is owned by versioned migrations — never `synchronize`.
 */
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities';
import { SnakeNamingStrategy } from './snake-naming.strategy';

function buildOptions(url: string, applicationName: string): TypeOrmModuleOptions {
  return {
    type: 'postgres' as const,
    url,
    namingStrategy: new SnakeNamingStrategy(),
    entities: ALL_ENTITIES,
    synchronize: false,
    migrationsRun: false,
    retryAttempts: 10,
    retryDelay: 3000,
    applicationName,
  };
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildOptions(config.getOrThrow<string>('database.url'), 'core-service'),
    }),
    TypeOrmModule.forRootAsync({
      name: 'tenant',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildOptions(
          config.getOrThrow<string>('database.appUrl'),
          'core-service-tenant',
        ),
    }),
  ],
})
export class DatabaseModule {}
