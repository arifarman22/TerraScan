import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@platform/shared-types';
import { RequirePermission } from '../rbac/rbac.decorators';
import { ApiKeyService } from './apikey.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('api-keys')
@ApiBearerAuth()
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get()
  @RequirePermission(Permission.API_KEY_MANAGE)
  @ApiOperation({ summary: 'List active API keys (cleartext is never returned)' })
  list() {
    return this.apiKeyService.list();
  }

  @Post()
  @RequirePermission(Permission.API_KEY_MANAGE)
  @ApiOperation({ summary: 'Create an API key (cleartext returned once)' })
  create(@Body() dto: CreateApiKeyDto) {
    return this.apiKeyService.create(dto);
  }

  @Delete(':id')
  @RequirePermission(Permission.API_KEY_MANAGE)
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke an API key' })
  revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.apiKeyService.revoke(id);
  }
}
