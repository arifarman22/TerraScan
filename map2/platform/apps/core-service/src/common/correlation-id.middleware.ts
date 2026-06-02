/**
 * Correlation-ID middleware (SRS NFR-OBS-002).
 *
 * Reads `X-Correlation-Id` from the incoming request — or generates a
 * fresh UUID if absent — and propagates it on the response. Every log
 * line and audit-log row emitted while handling the request can then be
 * joined on this single token for tracing.
 */
import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const CORRELATION_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const supplied = request.headers[CORRELATION_HEADER];
    const correlationId =
      (Array.isArray(supplied) ? supplied[0] : supplied) ?? randomUUID();
    (request as Request & { correlationId: string }).correlationId = correlationId;
    response.setHeader(CORRELATION_HEADER, correlationId);
    next();
  }
}
