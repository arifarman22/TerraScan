/**
 * TOTP multi-factor authentication (SRS FR-AUTH-004).
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';

@Injectable()
export class MfaService {
  private readonly issuer: string;

  constructor(config: ConfigService) {
    this.issuer = config.getOrThrow<string>('auth.mfaIssuer');
  }

  /** Generate a new base32 TOTP secret. */
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  /** Build the `otpauth://` URI an authenticator app scans as a QR code. */
  buildOtpAuthUrl(accountEmail: string, secret: string): string {
    return authenticator.keyuri(accountEmail, this.issuer, secret);
  }

  /** Verify a 6-digit code against the secret (tolerates clock drift). */
  verifyCode(code: string, secret: string): boolean {
    try {
      return authenticator.verify({ token: code, secret });
    } catch {
      return false;
    }
  }
}
