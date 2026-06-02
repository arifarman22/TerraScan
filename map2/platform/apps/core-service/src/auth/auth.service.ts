/**
 * Authentication and onboarding logic (SRS §5):
 *  - tenant sign-up (organisation + owner user + ORG_OWNER assignment);
 *  - password login with lockout after repeated failures (FR-AUTH-005);
 *  - JWT access/refresh issuing with refresh-token rotation (FR-AUTH-006);
 *  - TOTP multi-factor enrollment and verification (FR-AUTH-004);
 *  - session listing and revocation (FR-AUTH-007).
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  AuthMethod,
  MfaMethod,
  OrganisationStatus,
  RoleScope,
  type SubscriptionLimits,
  SubscriptionTier,
  SystemRole,
  type User,
  UserStatus,
} from '@platform/shared-types';
import { AuditService } from '../audit/audit.service';
import { OrganisationEntity } from '../entities/organisation.entity';
import { RoleEntity } from '../entities/role.entity';
import { RoleAssignmentEntity } from '../entities/role-assignment.entity';
import { UserEntity } from '../entities/user.entity';
import { MetricsService } from '../metrics/metrics.service';
import type { LoginDto, RegisterDto } from './dto/auth.dto';
import { MfaService } from './mfa.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import type {
  AuthResult,
  OrganisationSummary,
  RequestContext,
  SessionRecord,
} from './auth.types';

/** Default quota limits granted to a new organisation on the TRIAL tier. */
const TRIAL_LIMITS: SubscriptionLimits = {
  storageBytes: 10 * 1024 * 1024 * 1024,
  memberSeats: 5,
  concurrentJobs: 2,
  monthlyProcessingMinutes: 300,
  apiRateLimitPerMinute: 60,
};

function toUserDto(user: UserEntity): User {
  return {
    id: user.id,
    organisationId: user.organisationId,
    email: user.email,
    fullName: user.fullName,
    status: user.status,
    authMethod: user.authMethod,
    mfaMethod: user.mfaMethod,
    mfaEnrolled: user.mfaEnrolled,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function toOrgSummary(org: OrganisationEntity): OrganisationSummary {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    region: org.region,
    subscriptionTier: org.subscriptionTier,
    status: org.status,
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly maxAttempts: number;
  private readonly lockoutSeconds: number;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(OrganisationEntity)
    private readonly organisations: Repository<OrganisationEntity>,
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    @InjectRepository(RoleAssignmentEntity)
    private readonly roleAssignments: Repository<RoleAssignmentEntity>,
    private readonly passwordService: PasswordService,
    private readonly mfaService: MfaService,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
    private readonly metricsService: MetricsService,
    config: ConfigService,
  ) {
    this.maxAttempts = config.getOrThrow<number>('auth.loginMaxAttempts');
    this.lockoutSeconds = config.getOrThrow<number>('auth.loginLockoutSeconds');
  }

  /** Tenant sign-up: creates an organisation, its owner user, and the grant. */
  async register(dto: RegisterDto, ctx: RequestContext): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    if (await this.users.findOne({ where: { email } })) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await this.passwordService.hash(dto.password);

    const { user, organisation } = await this.dataSource.transaction(
      async (manager) => {
        const orgRepo = manager.getRepository(OrganisationEntity);
        const org = await orgRepo.save(
          orgRepo.create({
            name: dto.organisationName,
            legalName: dto.organisationName,
            slug: await this.uniqueSlug(orgRepo, dto.organisationName),
            status: OrganisationStatus.ACTIVE,
            region: dto.region,
            subscriptionTier: SubscriptionTier.TRIAL,
            limits: TRIAL_LIMITS,
            primaryContactEmail: email,
            suspendedAt: null,
            closedAt: null,
          }),
        );

        const userRepo = manager.getRepository(UserEntity);
        const createdUser = await userRepo.save(
          userRepo.create({
            organisationId: org.id,
            email,
            fullName: dto.fullName,
            status: UserStatus.ACTIVE,
            authMethod: AuthMethod.PASSWORD,
            passwordHash,
            mfaMethod: MfaMethod.NONE,
            mfaSecret: null,
            mfaEnrolled: false,
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: null,
            avatarUrl: null,
          }),
        );

        const ownerRole = await manager
          .getRepository(RoleEntity)
          .findOne({ where: { systemRole: SystemRole.ORG_OWNER } });
        if (!ownerRole) {
          throw new Error(
            'ORG_OWNER system role is missing — run the RBAC seed migration',
          );
        }
        const raRepo = manager.getRepository(RoleAssignmentEntity);
        await raRepo.save(
          raRepo.create({
            organisationId: org.id,
            userId: createdUser.id,
            roleId: ownerRole.id,
            scope: RoleScope.ORGANISATION,
            scopeId: org.id,
            grantedByUserId: createdUser.id,
            expiresAt: null,
          }),
        );
        return { user: createdUser, organisation: org };
      },
    );

    this.logger.log(`Registered organisation "${organisation.slug}" (${organisation.id})`);
    await this.auditService.write({
      organisationId: organisation.id,
      actorUserId: user.id,
      action: 'user.registered',
      resourceType: 'User',
      resourceId: user.id,
      after: { email: user.email, organisationSlug: organisation.slug },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    this.metricsService.authAttempts.inc({ outcome: 'registered' });
    return this.issueAuthResult(user, organisation, [SystemRole.ORG_OWNER], ctx);
  }

  /** Password login with lockout and optional TOTP second factor. */
  async login(dto: LoginDto, ctx: RequestContext): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.users.findOne({ where: { email } });
    const invalidCredentials = new UnauthorizedException(
      'Invalid email or password',
    );

    if (!user || !user.passwordHash) {
      throw invalidCredentials;
    }
    if (user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('This account has been disabled');
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException(
        'Account temporarily locked due to failed sign-in attempts',
      );
    }

    const passwordOk = await this.passwordService.verify(
      user.passwordHash,
      dto.password,
    );
    if (!passwordOk) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= this.maxAttempts) {
        user.lockedUntil = new Date(Date.now() + this.lockoutSeconds * 1000);
        user.failedLoginAttempts = 0;
        this.logger.warn(`Account locked after failed sign-ins: ${email}`);
      }
      await this.users.save(user);
      await this.auditService.write({
        organisationId: user.organisationId,
        actorUserId: user.id,
        action: 'user.login.failed',
        resourceType: 'User',
        resourceId: user.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      this.metricsService.authAttempts.inc({ outcome: 'failed' });
      throw invalidCredentials;
    }

    if (user.mfaEnrolled && user.mfaMethod === MfaMethod.TOTP) {
      if (!dto.mfaCode) {
        throw new UnauthorizedException(
          'Multi-factor authentication code required',
        );
      }
      if (
        !user.mfaSecret ||
        !this.mfaService.verifyCode(dto.mfaCode, user.mfaSecret)
      ) {
        throw new UnauthorizedException(
          'Invalid multi-factor authentication code',
        );
      }
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await this.users.save(user);

    const organisation = await this.requireOrganisation(user.organisationId);
    const roles = await this.resolveRoleCodes(user.id);
    await this.auditService.write({
      organisationId: user.organisationId,
      actorUserId: user.id,
      action: 'user.login.success',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    this.metricsService.authAttempts.inc({ outcome: 'success' });
    return this.issueAuthResult(user, organisation, roles, ctx);
  }

  /** Exchange a refresh token for a new pair, rotating the refresh token. */
  async refresh(refreshToken: string, ctx: RequestContext): Promise<AuthResult> {
    let payload;
    try {
      payload = await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.sessionService.get(payload.sessionId);
    if (!session) {
      throw new UnauthorizedException('Session has been revoked');
    }
    if (session.refreshJti !== payload.jti) {
      // A superseded refresh token was replayed — treat as theft.
      await this.sessionService.revoke(session.id);
      this.logger.warn(`Refresh-token reuse detected; revoked session ${session.id}`);
      throw new UnauthorizedException(
        'Refresh token reuse detected — session revoked',
      );
    }

    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('Account is unavailable');
    }

    const newJti = await this.sessionService.rotate(session.id);
    if (!newJti) {
      throw new UnauthorizedException('Session has been revoked');
    }

    const organisation = await this.requireOrganisation(user.organisationId);
    const roles = await this.resolveRoleCodes(user.id);
    const accessToken = await this.tokenService.issueAccessToken({
      sub: user.id,
      organisationId: user.organisationId,
      sessionId: session.id,
      email: user.email,
      roles,
    });
    const rotatedRefreshToken = await this.tokenService.issueRefreshToken({
      sub: user.id,
      sessionId: session.id,
      jti: newJti,
      type: 'refresh',
    });
    void ctx;
    return {
      accessToken,
      refreshToken: rotatedRefreshToken,
      expiresIn: this.tokenService.accessTokenTtl,
      user: toUserDto(user),
      organisation: toOrgSummary(organisation),
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionService.revoke(sessionId);
  }

  async getMe(userId: string): Promise<User> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUserDto(user);
  }

  /** Begin TOTP enrollment — stores the secret but does not yet enable MFA. */
  async enrollMfa(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.requireUser(userId);
    const secret = this.mfaService.generateSecret();
    user.mfaSecret = secret;
    await this.users.save(user);
    return {
      secret,
      otpauthUrl: this.mfaService.buildOtpAuthUrl(user.email, secret),
    };
  }

  /** Confirm enrollment by verifying the first code, then enable MFA. */
  async activateMfa(userId: string, code: string): Promise<{ enabled: true }> {
    const user = await this.requireUser(userId);
    if (!user.mfaSecret) {
      throw new BadRequestException('Start MFA enrollment first');
    }
    if (!this.mfaService.verifyCode(code, user.mfaSecret)) {
      throw new BadRequestException('Invalid authentication code');
    }
    user.mfaMethod = MfaMethod.TOTP;
    user.mfaEnrolled = true;
    await this.users.save(user);
    return { enabled: true };
  }

  async disableMfa(userId: string, code: string): Promise<{ enabled: false }> {
    const user = await this.requireUser(userId);
    if (!user.mfaEnrolled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not currently enabled');
    }
    if (!this.mfaService.verifyCode(code, user.mfaSecret)) {
      throw new BadRequestException('Invalid authentication code');
    }
    user.mfaMethod = MfaMethod.NONE;
    user.mfaEnrolled = false;
    user.mfaSecret = null;
    await this.users.save(user);
    return { enabled: false };
  }

  async listSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<Array<Omit<SessionRecord, 'refreshJti'> & { current: boolean }>> {
    const sessions = await this.sessionService.listForUser(userId);
    return sessions.map(({ refreshJti: _refreshJti, ...session }) => ({
      ...session,
      current: session.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionService.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }
    await this.sessionService.revoke(sessionId);
  }

  // ------------------------------------------------------------------ utils

  private async issueAuthResult(
    user: UserEntity,
    organisation: OrganisationEntity,
    roles: string[],
    ctx: RequestContext,
  ): Promise<AuthResult> {
    const session = await this.sessionService.create({
      userId: user.id,
      organisationId: user.organisationId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      ttlSeconds: this.tokenService.refreshTokenTtl,
    });
    const accessToken = await this.tokenService.issueAccessToken({
      sub: user.id,
      organisationId: user.organisationId,
      sessionId: session.id,
      email: user.email,
      roles,
    });
    const refreshToken = await this.tokenService.issueRefreshToken({
      sub: user.id,
      sessionId: session.id,
      jti: session.refreshJti,
      type: 'refresh',
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: this.tokenService.accessTokenTtl,
      user: toUserDto(user),
      organisation: toOrgSummary(organisation),
    };
  }

  private async resolveRoleCodes(userId: string): Promise<string[]> {
    const assignments = await this.roleAssignments.find({ where: { userId } });
    if (assignments.length === 0) {
      return [];
    }
    const roles = await this.roles.find({
      where: { id: In(assignments.map((assignment) => assignment.roleId)) },
    });
    return roles.map((role) => role.systemRole ?? role.name);
  }

  private async requireUser(userId: string): Promise<UserEntity> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async requireOrganisation(
    organisationId: string,
  ): Promise<OrganisationEntity> {
    const org = await this.organisations.findOne({
      where: { id: organisationId },
    });
    if (!org) {
      throw new NotFoundException('Organisation not found');
    }
    return org;
  }

  private async uniqueSlug(
    repo: Repository<OrganisationEntity>,
    name: string,
  ): Promise<string> {
    const base =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100) || 'org';
    let slug = base;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (!(await repo.findOne({ where: { slug } }))) {
        return slug;
      }
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
}
