import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionEntity } from '../entities/permission.entity';
import { RoleEntity } from '../entities/role.entity';
import { RoleAssignmentEntity } from '../entities/role-assignment.entity';
import { PermissionService } from './permission.service';
import { PermissionsGuard } from './permissions.guard';
import { RbacController } from './rbac.controller';

/**
 * Registers the two application-wide guards. Order matters: the JWT guard
 * runs first (authenticating the request and populating `request.user`),
 * then the permissions guard authorizes it.
 */
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      PermissionEntity,
      RoleEntity,
      RoleAssignmentEntity,
    ]),
  ],
  controllers: [RbacController],
  providers: [
    PermissionService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [PermissionService],
})
export class RbacModule {}
