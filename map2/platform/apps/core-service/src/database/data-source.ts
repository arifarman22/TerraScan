/**
 * Standalone TypeORM DataSource used by the migration CLI
 * (`npm run migration:run`). The NestJS runtime uses its own connection
 * configured in `database.module.ts`.
 */
import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set to run database migrations');
}

const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [join(__dirname, '..', 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: ['error', 'migration', 'schema'],
});

export default AppDataSource;
