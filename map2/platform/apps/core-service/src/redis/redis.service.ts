/**
 * Redis connection wrapper — cache, sessions, and pub/sub for the platform.
 */
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('redis.url'), {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    this.client.on('error', (error: Error) =>
      this.logger.error(`Redis error: ${error.message}`),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.log('Connected to Redis');
  }

  /** The underlying ioredis client, for use by feature modules. */
  getClient(): Redis {
    return this.client;
  }

  /**
   * A dedicated connection for Redis pub/sub. A subscribing connection
   * cannot also issue regular commands, so subscribers get their own client.
   */
  createSubscriber(): Redis {
    return this.client.duplicate();
  }

  /** Returns true when the server answers PING. */
  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
