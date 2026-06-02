/**
 * Global exception filter — converts every error into a consistent, structured
 * API error body with a correlation id, and never leaks stack traces to the
 * client (SRS FR-API-006 / NFR-OBS-001).
 */
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ApiError } from '@platform/shared-types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const correlationId =
      (request?.headers?.['x-correlation-id'] as string | undefined) ?? randomUUID();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      code = HttpStatus[status] ?? 'ERROR';
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const candidate = (body as { message?: string | string[] }).message;
        message = Array.isArray(candidate)
          ? candidate.join('; ')
          : (candidate ?? exception.message);
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${correlationId}] ${request?.method} ${request?.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const payload: ApiError = { code, message, correlationId };
    response.setHeader('x-correlation-id', correlationId);
    response.status(status).json(payload);
  }
}
