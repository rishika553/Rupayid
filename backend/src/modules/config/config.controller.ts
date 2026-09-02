import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { SystemConfigService } from './config.service';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('config')
@Controller('config')
@ApiBearerAuth()
@Roles('ADMIN')
export class SystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: 'List all system settings' })
  async findAll() {
    return this.configService.findAll();
  }

  @Get('scope/:scope')
  @ApiOperation({ summary: 'Get settings by scope' })
  async findByScope(@Param('scope') scope: string) {
    return this.configService.findByScope(scope);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get setting by key' })
  async findByKey(@Param('key') key: string) {
    return this.configService.findByKey(key);
  }

  @Post(':key')
  @ApiOperation({ summary: 'Create or update system setting' })
  async upsert(
    @Param('key') key: string,
    @Body() data: { value: unknown; type?: string; description?: string; scope?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.configService.upsert(key, { ...data, updatedById: user.id });
  }
}
