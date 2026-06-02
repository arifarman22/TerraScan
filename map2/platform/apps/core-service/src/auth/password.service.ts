/**
 * Password hashing with Argon2id (SRS FR-AUTH-002).
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Algorithm, hash, verify } from '@node-rs/argon2';

@Injectable()
export class PasswordService {
  private readonly memoryCost: number;
  private readonly timeCost: number;

  constructor(config: ConfigService) {
    this.memoryCost = config.getOrThrow<number>('auth.argon2MemoryCost');
    this.timeCost = config.getOrThrow<number>('auth.argon2TimeCost');
  }

  /** Produce a salted Argon2id hash. */
  hash(plain: string): Promise<string> {
    return hash(plain, {
      algorithm: Algorithm.Argon2id,
      memoryCost: this.memoryCost,
      timeCost: this.timeCost,
    });
  }

  /** Constant-time verification; never throws. */
  async verify(hashed: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashed, plain);
    } catch {
      return false;
    }
  }
}
