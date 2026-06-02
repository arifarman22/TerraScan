/**
 * Object-storage access (MinIO / S3-compatible).
 *
 * Two clients are used:
 *  - `internal` — reaches MinIO on the container network for server-side
 *    operations (stat, ranged reads, delete).
 *  - `external` — configured with the browser-reachable endpoint so the
 *    pre-signed upload URLs it produces are valid for external clients
 *    (the host in a pre-signed URL is part of the signature).
 *
 * Image bytes are uploaded by the client directly to storage via the
 * pre-signed URLs — they never transit this service (SRS FR-IMG-006).
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

interface ParsedEndpoint {
  host: string;
  port: number;
}

function parseEndpoint(value: string): ParsedEndpoint {
  const [host, port] = value.split(':');
  return { host: host || 'localhost', port: Number(port ?? '9000') || 9000 };
}

@Injectable()
export class StorageService {
  private readonly internal: Client;
  private readonly external: Client;

  constructor(config: ConfigService) {
    const useSSL = config.get<boolean>('storage.useSsl') ?? false;
    const accessKey = config.getOrThrow<string>('storage.accessKey');
    const secretKey = config.getOrThrow<string>('storage.secretKey');

    const internal = parseEndpoint(config.getOrThrow<string>('storage.endpoint'));
    const external = parseEndpoint(
      config.getOrThrow<string>('storage.publicEndpoint'),
    );

    // `region` is pinned so pre-signed URLs are computed locally without a
    // bucket-region lookup — the external endpoint is not reachable from
    // inside the container.
    const region = 'us-east-1';
    this.internal = new Client({
      endPoint: internal.host,
      port: internal.port,
      useSSL,
      accessKey,
      secretKey,
      region,
    });
    this.external = new Client({
      endPoint: external.host,
      port: external.port,
      useSSL,
      accessKey,
      secretKey,
      region,
    });
  }

  /** A pre-signed PUT URL the client uses to upload an object directly. */
  presignPutUrl(
    bucket: string,
    objectKey: string,
    expirySeconds: number,
  ): Promise<string> {
    return this.external.presignedPutObject(bucket, objectKey, expirySeconds);
  }

  /** A pre-signed GET URL the client uses to download an object directly. */
  presignGetUrl(
    bucket: string,
    objectKey: string,
    expirySeconds: number,
  ): Promise<string> {
    return this.external.presignedGetObject(bucket, objectKey, expirySeconds);
  }

  /** Object size in bytes, or null when the object does not exist. */
  async statObject(
    bucket: string,
    objectKey: string,
  ): Promise<{ size: number } | null> {
    try {
      const stat = await this.internal.statObject(bucket, objectKey);
      return { size: stat.size };
    } catch {
      return null;
    }
  }

  /** Read a byte range of an object (used to extract EXIF efficiently). */
  async readRange(
    bucket: string,
    objectKey: string,
    offset: number,
    length: number,
  ): Promise<Buffer> {
    const stream = await this.internal.getPartialObject(
      bucket,
      objectKey,
      offset,
      length,
    );
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }

  async removeObject(bucket: string, objectKey: string): Promise<void> {
    await this.internal.removeObject(bucket, objectKey);
  }
}
