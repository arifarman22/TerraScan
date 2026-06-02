/**
 * Authentication endpoints (SRS §5). `register`, `login` and `refresh` are
 * `@Public()`; all other routes are authenticated by the global JWT guard.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Ip,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../rbac/rbac.decorators';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { LoginDto, MfaCodeDto, RefreshDto, RegisterDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(AuthRateLimitGuard)
  @Public()
  @HttpCode(201)
  @ApiOperation({ summary: 'Sign up: create an organisation and its owner' })
  register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.register(dto, {
      ipAddress: ip,
      userAgent: userAgent ?? 'unknown',
    });
  }

  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Password login (with optional TOTP code)' })
  login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.login(dto, {
      ipAddress: ip,
      userAgent: userAgent ?? 'unknown',
    });
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate tokens using a refresh token' })
  refresh(
    @Body() dto: RefreshDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.refresh(dto.refreshToken, {
      ipAddress: ip,
      userAgent: userAgent ?? 'unknown',
    });
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current session' })
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<{ success: true }> {
    await this.authService.logout(user.sessionId);
    return { success: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current authenticated user' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId);
  }

  @Post('mfa/enroll')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Begin TOTP MFA enrollment' })
  enrollMfa(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.enrollMfa(user.userId);
  }

  @Post('mfa/activate')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate TOTP MFA by verifying a code' })
  activateMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaCodeDto) {
    return this.authService.activateMfa(user.userId, dto.code);
  }

  @Post('mfa/disable')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable TOTP MFA' })
  disableMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaCodeDto) {
    return this.authService.disableMfa(user.userId, dto.code);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active sessions for the current user' })
  sessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listSessions(user.userId, user.sessionId);
  }

  @Delete('sessions/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    await this.authService.revokeSession(user.userId, id);
    return { success: true };
  }
}
