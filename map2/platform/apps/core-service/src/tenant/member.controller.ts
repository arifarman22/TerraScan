/**
 * Organisation member endpoints (SRS §4 / §5). `accept-invite` is public —
 * the invitee has no session until they accept.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@platform/shared-types';
import { Public, RequirePermission } from '../rbac/rbac.decorators';
import { AcceptInviteDto, InviteMemberDto } from './dto/tenant.dto';
import { MemberService } from './member.service';

@ApiTags('members')
@Controller('members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Post('invite')
  @HttpCode(201)
  @ApiBearerAuth()
  @RequirePermission(Permission.MEMBER_INVITE)
  @ApiOperation({ summary: 'Invite a user into the organisation' })
  invite(@Body() dto: InviteMemberDto) {
    return this.memberService.invite(dto);
  }

  @Post('accept-invite')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept an invitation and set a password' })
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.memberService.acceptInvite(dto);
  }

  @Get()
  @ApiBearerAuth()
  @RequirePermission(Permission.ORG_VIEW)
  @ApiOperation({ summary: 'List organisation members' })
  list() {
    return this.memberService.list();
  }

  @Delete(':id')
  @ApiBearerAuth()
  @RequirePermission(Permission.MEMBER_REMOVE)
  @ApiOperation({ summary: 'Remove a member from the organisation' })
  remove(@Param('id') id: string) {
    return this.memberService.remove(id);
  }
}
