/**
 * JWT issuing and verification. Access and refresh tokens are signed with
 * separate secrets (SRS FR-AUTH-006).
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenPayload, RefreshTokenPayload } from './auth.types';

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtl: number;
  private readonly refreshTtl: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow<string>('auth.jwtAccessSecret');
    this.refreshSecret = config.getOrThrow<string>('auth.jwtRefreshSecret');
    this.accessTtl = config.getOrThrow<number>('auth.jwtAccessTtl');
    this.refreshTtl = config.getOrThrow<number>('auth.jwtRefreshTtl');
  }

  get accessTokenTtl(): number {
    return this.accessTtl;
  }

  get refreshTokenTtl(): number {
    return this.refreshTtl;
  }

  issueAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessTtl,
    });
  }

  issueRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshTtl,
    });
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwt.verifyAsync<AccessTokenPayload>(token, {
      secret: this.accessSecret,
    });
  }

  verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwt.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.refreshSecret,
    });
  }
}
