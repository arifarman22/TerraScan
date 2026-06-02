/**
 * WebSocket gateway for real-time job progress (SRS FR-PHOTO-007 / §3.2).
 *
 * Processing services publish progress to the Redis `job-progress` channel;
 * this gateway relays each message to the WebSocket clients subscribed to
 * that job. Clients authenticate on the handshake with their access token,
 * and may only subscribe to jobs belonging to their own organisation.
 */
import { Logger, type OnModuleDestroy } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  type OnGatewayConnection,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Redis } from 'ioredis';
import type { Server, Socket } from 'socket.io';
import { DataSource } from 'typeorm';
import { SessionService } from '../auth/session.service';
import { TokenService } from '../auth/token.service';
import { JobEntity } from '../entities/job.entity';
import { RedisService } from '../redis/redis.service';

const JOB_PROGRESS_CHANNEL = 'job-progress';

interface SocketUser {
  userId: string;
  organisationId: string;
}

@WebSocketGateway({ namespace: 'jobs', cors: { origin: true, credentials: true } })
export class JobGateway
  implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy
{
  private readonly logger = new Logger(JobGateway.name);
  @WebSocketServer() private server!: Server;
  private subscriber: Redis | null = null;

  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly redisService: RedisService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  afterInit(): void {
    this.subscriber = this.redisService.createSubscriber();
    void this.subscriber.subscribe(JOB_PROGRESS_CHANNEL);
    this.subscriber.on('message', (_channel: string, raw: string) => {
      try {
        const message = JSON.parse(raw) as { jobId?: string };
        if (message.jobId) {
          this.server.to(`job:${message.jobId}`).emit('progress', message);
        }
      } catch {
        this.logger.warn('Discarded malformed job-progress message');
      }
    });
    this.logger.log(
      `Job gateway relaying Redis channel "${JOB_PROGRESS_CHANNEL}"`,
    );
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);
      if (!token) {
        throw new Error('missing token');
      }
      const payload = await this.tokenService.verifyAccessToken(token);
      const session = await this.sessionService.get(payload.sessionId);
      if (!session) {
        throw new Error('session revoked');
      }
      const user: SocketUser = {
        userId: payload.sub,
        organisationId: payload.organisationId,
      };
      client.data.user = user;
    } catch {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('subscribe')
  async onSubscribe(
    client: Socket,
    payload: { jobId?: string },
  ): Promise<void> {
    const user = client.data.user as SocketUser | undefined;
    if (!user) {
      client.disconnect(true);
      return;
    }
    if (!payload?.jobId) {
      client.emit('error', { message: 'jobId is required' });
      return;
    }
    const job = await this.dataSource
      .getRepository(JobEntity)
      .findOne({ where: { id: payload.jobId } });
    if (!job || job.organisationId !== user.organisationId) {
      client.emit('error', { message: 'Job not found' });
      return;
    }
    await client.join(`job:${job.id}`);
    client.emit('subscribed', {
      jobId: job.id,
      status: job.status,
      progressPercent: job.progressPercent,
    });
  }

  @SubscribeMessage('unsubscribe')
  onUnsubscribe(client: Socket, payload: { jobId?: string }): void {
    if (payload?.jobId) {
      void client.leave(`job:${payload.jobId}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber?.quit();
  }
}
