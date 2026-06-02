/**
 * Server-side session store backed by Redis (SRS FR-AUTH-006/007).
 * Sessions are revocable, listable per user, and expire with the refresh
 * token lifetime.
 */
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RedisService } from '../redis/redis.service';
import type { SessionRecord } from './auth.types';

const SESSION_KEY = (id: string): string => `session:${id}`;
const USER_SESSIONS_KEY = (userId: string): string => `user-sessions:${userId}`;

interface CreateSessionParams {
  userId: string;
  organisationId: string;
  ipAddress: string;
  userAgent: string;
  ttlSeconds: number;
}

@Injectable()
export class SessionService {
  constructor(private readonly redis: RedisService) {}

  /** Create a new session and return it (with its initial refresh-token id). */
  async create(params: CreateSessionParams): Promise<SessionRecord> {
    const now = new Date();
    const record: SessionRecord = {
      id: randomUUID(),
      userId: params.userId,
      organisationId: params.organisationId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + params.ttlSeconds * 1000).toISOString(),
      lastActivityAt: now.toISOString(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      device: params.userAgent.slice(0, 120),
      refreshJti: randomUUID(),
    };
    const client = this.redis.getClient();
    await client.set(
      SESSION_KEY(record.id),
      JSON.stringify(record),
      'EX',
      params.ttlSeconds,
    );
    await client.sadd(USER_SESSIONS_KEY(params.userId), record.id);
    await client.expire(USER_SESSIONS_KEY(params.userId), params.ttlSeconds);
    return record;
  }

  async get(sessionId: string): Promise<SessionRecord | null> {
    const raw = await this.redis.getClient().get(SESSION_KEY(sessionId));
    return raw ? (JSON.parse(raw) as SessionRecord) : null;
  }

  /** Rotate the refresh-token id, keeping the existing TTL. Returns the new id. */
  async rotate(sessionId: string): Promise<string | null> {
    const session = await this.get(sessionId);
    if (!session) {
      return null;
    }
    session.refreshJti = randomUUID();
    session.lastActivityAt = new Date().toISOString();
    await this.redis
      .getClient()
      .set(SESSION_KEY(sessionId), JSON.stringify(session), 'KEEPTTL');
    return session.refreshJti;
  }

  async revoke(sessionId: string): Promise<void> {
    const session = await this.get(sessionId);
    const client = this.redis.getClient();
    await client.del(SESSION_KEY(sessionId));
    if (session) {
      await client.srem(USER_SESSIONS_KEY(session.userId), sessionId);
    }
  }

  async listForUser(userId: string): Promise<SessionRecord[]> {
    const client = this.redis.getClient();
    const ids = await client.smembers(USER_SESSIONS_KEY(userId));
    const sessions: SessionRecord[] = [];
    for (const id of ids) {
      const session = await this.get(id);
      if (session) {
        sessions.push(session);
      } else {
        await client.srem(USER_SESSIONS_KEY(userId), id);
      }
    }
    return sessions;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const client = this.redis.getClient();
    const ids = await client.smembers(USER_SESSIONS_KEY(userId));
    if (ids.length > 0) {
      await client.del(...ids.map(SESSION_KEY));
    }
    await client.del(USER_SESSIONS_KEY(userId));
  }
}
