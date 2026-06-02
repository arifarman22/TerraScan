/**
 * RabbitMQ publisher for durable domain events (SRS §3.2 / FR-JOB-003).
 * Events are published to the topic exchange `platform.events` on a
 * confirm channel so a publish only resolves once the broker has accepted it.
 */
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { EVENTS_EXCHANGE } from '@platform/shared-types';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private readonly url: string;
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.ConfirmChannel | null = null;

  constructor(config: ConfigService) {
    this.url = config.getOrThrow<string>('rabbitmq.url');
  }

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry(5, 2000);
  }

  private async connectWithRetry(attempts: number, delayMs: number): Promise<void> {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        this.connection = await amqp.connect(this.url);
        this.channel = await this.connection.createConfirmChannel();
        await this.channel.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });
        this.connection.on('error', (error: Error) =>
          this.logger.error(`RabbitMQ connection error: ${error.message}`),
        );
        this.logger.log(`Connected to RabbitMQ; asserted exchange "${EVENTS_EXCHANGE}"`);
        return;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `RabbitMQ connect attempt ${attempt}/${attempts} failed: ${message}`,
        );
        if (attempt === attempts) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  /** True once the connection and channel are established. */
  isHealthy(): boolean {
    return this.connection !== null && this.channel !== null;
  }

  /** Publish a JSON payload to the events exchange with the given routing key. */
  async publish(routingKey: string, payload: unknown): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialised');
    }
    const channel = this.channel;
    const content = Buffer.from(JSON.stringify(payload));
    await new Promise<void>((resolve, reject) => {
      channel.publish(
        EVENTS_EXCHANGE,
        routingKey,
        content,
        { persistent: true, contentType: 'application/json' },
        (error) => (error ? reject(error) : resolve()),
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
