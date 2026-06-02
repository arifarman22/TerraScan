/**
 * Resolves a user's effective permission set from their role assignments
 * (SRS FR-RBAC-001). Results are cached in Redis for 60 seconds so role
 * changes take effect within that window (SRS FR-RBAC-008).
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RoleEntity } from '../entities/role.entity';
import { RoleAssignmentEntity } from '../entities/role-assignment.entity';
import { RedisService } from '../redis/redis.service';

const CACHE_PREFIX = 'perms:';
const CACHE_TTL_SECONDS = 60;

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    @InjectRepository(RoleAssignmentEntity)
    private readonly roleAssignments: Repository<RoleAssignmentEntity>,
    private readonly redis: RedisService,
  ) {}

  /** The set of permission codes the user currently holds. */
  async getPermissions(userId: string): Promise<Set<string>> {
    const cacheKey = CACHE_PREFIX + userId;
    const client = this.redis.getClient();

    const cached = await client.get(cacheKey);
    if (cached) {
      return new Set<string>(JSON.parse(cached) as string[]);
    }

    const assignments = await this.roleAssignments.find({ where: { userId } });
    const now = Date.now();
    const activeRoleIds = assignments
      .filter(
        (assignment) =>
          !assignment.expiresAt || assignment.expiresAt.getTime() > now,
      )
      .map((assignment) => assignment.roleId);

    const permissions = new Set<string>();
    if (activeRoleIds.length > 0) {
      const roles = await this.roles.find({
        where: { id: In(activeRoleIds) },
      });
      for (const role of roles) {
        for (const permission of role.permissions) {
          permissions.add(permission);
        }
      }
    }

    await client.set(
      cacheKey,
      JSON.stringify([...permissions]),
      'EX',
      CACHE_TTL_SECONDS,
    );
    return permissions;
  }

  /** Drop the cached permission set for a user (call after a role change). */
  async invalidate(userId: string): Promise<void> {
    await this.redis.getClient().del(CACHE_PREFIX + userId);
  }
}
