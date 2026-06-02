/**
 * Global interceptor that observes the duration of every HTTP request and
 * records a Prometheus histogram sample.
 */
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const start = process.hrtime.bigint();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      tap({
        next: () => this.record(start, request, response.statusCode),
        error: (error: { status?: number }) =>
          this.record(start, request, error?.status ?? 500),
      }),
    );
  }

  private record(start: bigint, request: { method: string; route?: { path?: string }; url: string }, status: number): void {
    const elapsed = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    const route = request.route?.path ?? this.normalize(request.url);
    this.metrics.recordHttp(request.method, route, status, elapsed);
  }

  /** Strip query strings and reduce UUID-shaped segments to `:id` for label cardinality. */
  private normalize(url: string): string {
    const path = url.split('?')[0] ?? url;
    return path.replace(
      /\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
      '/:id',
    );
  }
}
