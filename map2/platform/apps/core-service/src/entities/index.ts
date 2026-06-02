/** Barrel export of every TypeORM entity. */
export { BaseEntity, TenantEntity } from './base.entity';
export { OrganisationEntity } from './organisation.entity';
export { UserEntity } from './user.entity';
export { WorkspaceEntity } from './workspace.entity';
export { ProjectEntity } from './project.entity';
export { MissionEntity } from './mission.entity';
export { MissionImageEntity } from './mission-image.entity';
export { JobEntity } from './job.entity';
export { ProcessingOutputEntity } from './processing-output.entity';
export { ApiKeyEntity } from './api-key.entity';
export { PermissionEntity } from './permission.entity';
export { RoleEntity } from './role.entity';
export { RoleAssignmentEntity } from './role-assignment.entity';
export { AuditLogEntity } from './audit-log.entity';

import { OrganisationEntity } from './organisation.entity';
import { UserEntity } from './user.entity';
import { WorkspaceEntity } from './workspace.entity';
import { ProjectEntity } from './project.entity';
import { MissionEntity } from './mission.entity';
import { MissionImageEntity } from './mission-image.entity';
import { JobEntity } from './job.entity';
import { ProcessingOutputEntity } from './processing-output.entity';
import { ApiKeyEntity } from './api-key.entity';
import { PermissionEntity } from './permission.entity';
import { RoleEntity } from './role.entity';
import { RoleAssignmentEntity } from './role-assignment.entity';
import { AuditLogEntity } from './audit-log.entity';

/** Every concrete entity, for DataSource registration. */
export const ALL_ENTITIES = [
  OrganisationEntity,
  UserEntity,
  WorkspaceEntity,
  ProjectEntity,
  MissionEntity,
  MissionImageEntity,
  JobEntity,
  ProcessingOutputEntity,
  ApiKeyEntity,
  PermissionEntity,
  RoleEntity,
  RoleAssignmentEntity,
  AuditLogEntity,
];
