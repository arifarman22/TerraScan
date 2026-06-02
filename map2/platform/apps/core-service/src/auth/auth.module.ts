import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganisationEntity } from '../entities/organisation.entity';
import { RoleEntity } from '../entities/role.entity';
import { RoleAssignmentEntity } from '../entities/role-assignment.entity';
import { UserEntity } from '../entities/user.entity';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MfaService } from './mfa.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';

/**
 * Authentication module. Secrets are passed per-call to JwtService, so
 * `JwtModule.register` needs no global configuration.
 */
@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      UserEntity,
      OrganisationEntity,
      RoleEntity,
      RoleAssignmentEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    SessionService,
    PasswordService,
    MfaService,
    JwtAuthGuard,
    AuthRateLimitGuard,
  ],
  exports: [TokenService, SessionService, JwtAuthGuard, PasswordService],
})
export class AuthModule {}
