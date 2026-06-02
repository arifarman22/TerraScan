/**
 * Prometheus metrics registry (SRS NFR-OBS-004).
 *
 * Registers the default Node.js process metrics (event-loop lag, GC, memory,
 * file descriptors) plus a per-route HTTP duration histogram and a few
 * platform-specific counters.
 */
import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
    registers: [this.registry],
  });

  readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests served',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [this.registry],
  });

  readonly authAttempts = new Counter({
    name: 'platform_auth_attempts_total',
    help: 'Authentication attempts grouped by outcome',
    labelNames: ['outcome'] as const,
    registers: [this.registry],
  });

  onModuleInit(): void {
    this.registry.setDefaultLabels({ service: 'core-service' });
    collectDefaultMetrics({ register: this.registry });
  }

  /** Convenience: record an HTTP response. */
  recordHttp(method: string, route: string, status: number, durationSec: number): void {
    const labels = { method, route, status: String(status) };
    this.httpRequestDuration.observe(labels, durationSec);
    this.httpRequestsTotal.inc(labels);
  }

  /** Render the registry in the standard text exposition format. */
  render(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
