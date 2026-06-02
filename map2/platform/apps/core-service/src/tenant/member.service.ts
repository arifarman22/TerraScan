/**
 * Organisation member management and the invitation flow (SRS §4 / §5).
 *
 * Invitation, listing, and removal run on the tenant-scoped connection
 * (RLS-enforced). Accepting an invitation happens before the invitee can
 * authenticate, so it runs on the default (system) connection — the same
 * pre-tenant path used by login and registration.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import {
  AuthMethod,
  MfaMethod,
  RoleScope,
  UserStatus,
} from '@platform/shared-types';
import { PasswordService } from '../auth/password.service';
import { RoleEntity } from '../entities/role.entity';
import { RoleAssignmentEntity } from '../entities/role-assignment.entity';
import { UserEntity } from '../entities/user.entity';
import { RedisService } from '../redis/redis.service';
import type { AcceptInviteDto, InviteMemberDto } from './dto/tenant.dto';
import { TenantContextService } from './tenant-context.service';

const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60;

interface MemberDto {
  id: string;
  email: string;
  fullName: string;
  status: string;
  mfaEnrolled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

function toMemberDto(user: UserEntity): MemberDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    status: user.status,
    mfaEnrolled: user.mfaEnrolled,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  const candidate = error as {
    code?: string;
    driverError?: { code?: string };
  };
  return candidate?.code === '23505' || candidate?.driverError?.code === '23505';
}

@Injectable()
export class MemberService {
  constructor(
    private readonly tenantContext: TenantContextService,
    @InjectDataSource() private readonly defaultDataSource: DataSource,
    private readonly redis: RedisService,
    private readonly passwordService: PasswordService,
  ) {}

  /** Invite a user into the organisation and issue an invitation token. */
  async invite(
    dto: InviteMemberDto,
  ): Promise<{ inviteToken: string; member: MemberDto }> {
    const organisationId = this.tenantContext.organisationId;
    const role = await this.tenantContext
      .getRepository(RoleEntity)
      .findOne({ where: { id: dto.roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const userRepo = this.tenantContext.getRepository(UserEntity);
    let member: UserEntity;
    try {
      member = await userRepo.save(
        userRepo.create({
          organisationId,
          email: dto.email.toLowerCase().trim(),
          fullName: dto.fullName,
          status: UserStatus.INVITED,
          authMethod: AuthMethod.PASSWORD,
          passwordHash: null,
          mfaMethod: MfaMethod.NONE,
          mfaSecret: null,
          mfaEnrolled: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: null,
          avatarUrl: null,
        }),
      );
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A user with this email already exists');
      }
      throw error;
    }

    const roleAssignmentRepo =
      this.tenantContext.getRepository(RoleAssignmentEntity);
    await roleAssignmentRepo.save(
      roleAssignmentRepo.create({
        organisationId,
        userId: member.id,
        roleId: role.id,
        scope: RoleScope.ORGANISATION,
        scopeId: organisationId,
        grantedByUserId: this.tenantContext.userId,
        expiresAt: null,
      }),
    );

    const inviteToken = randomUUID();
    await this.redis
      .getClient()
      .set(
        `invite:${inviteToken}`,
        JSON.stringify({ userId: member.id, organisationId }),
        'EX',
        INVITE_TTL_SECONDS,
      );

    return { inviteToken, member: toMemberDto(member) };
  }

  /** Accept an invitation: set a password and activate the account. */
  async acceptInvite(dto: AcceptInviteDto): Promise<{ activated: true }> {
    const client = this.redis.getClient();
    const raw = await client.get(`invite:${dto.token}`);
    if (!raw) {
      throw new BadRequestException('Invitation is invalid or has expired');
    }
    const { userId } = JSON.parse(raw) as {
      userId: string;
      organisationId: string;
    };

    const userRepo = this.defaultDataSource.getRepository(UserEntity);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Invitation is no longer valid');
    }
    user.passwordHash = await this.passwordService.hash(dto.password);
    user.status = UserStatus.ACTIVE;
    await userRepo.save(user);
    await client.del(`invite:${dto.token}`);
    return { activated: true };
  }

  list(): Promise<MemberDto[]> {
    return this.tenantContext
      .getRepository(UserEntity)
      .find({ order: { createdAt: 'ASC' } })
      .then((users) => users.map(toMemberDto));
  }

  async remove(memberId: string): Promise<{ removed: true }> {
    if (memberId === this.tenantContext.userId) {
      throw new BadRequestException('You cannot remove yourself');
    }
    const repo = this.tenantContext.getRepository(UserEntity);
    const member = await repo.findOne({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    await repo.remove(member);
    return { removed: true };
  }
}
