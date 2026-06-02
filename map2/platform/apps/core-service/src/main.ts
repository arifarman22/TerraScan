import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CorrelationIdMiddleware } from './common/correlation-id.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { MetricsService } from './metrics/metrics.service';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('coreServicePort');
  const corsOrigins = config.getOrThrow<string[]>('corsOrigins');

  // Security headers (SRS NFR-SEC-009): Content-Security-Policy, X-Frame-
  // Options, X-Content-Type-Options, Strict-Transport-Security, etc. CSP
  // is relaxed in dev so Swagger UI can load its own assets; production
  // deployments should tighten it.
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Correlation ID middleware runs before everything else so every log
  // line and audit row picks up a stable per-request id (NFR-OBS-002).
  app.use(new CorrelationIdMiddleware().use);

  // Health probes stay un-prefixed so container/orchestrator checks are stable.
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/live', 'metrics'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new MetricsInterceptor(app.get(MetricsService)));
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableShutdownHooks();
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    exposedHeaders: [
      'x-correlation-id',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'Retry-After',
    ],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Core Management Service')
    .setDescription('Identity, RBAC, tenants, projects, missions, jobs — SRS v2.0')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'Authorization', in: 'header' }, 'ApiKey')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(port);
  logger.log(`Core Service listening on :${port} — API /api/v1, docs /api/docs`);
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Fatal: failed to bootstrap Core Service', error);
  process.exit(1);
});
