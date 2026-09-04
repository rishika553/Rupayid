import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { PaginationDto } from '../../common/decorators/api-paginated.decorator';

@ApiTags('notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get my notifications' })
  async myNotifications(@CurrentUser() user: CurrentUserPayload, @Query() pagination: PaginationDto) {
    return this.notificationsService.findByUser(user.id, pagination.page, pagination.limit);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('send')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Send a notification' })
  async send(@Body() data: {
    userId?: string;
    templateSlug?: string;
    type: string;
    title: string;
    body: string;
    channel?: string;
    data?: Record<string, unknown>;
    referenceId?: string;
  }) {
    return this.notificationsService.send(data);
  }

  @Get('templates')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List notification templates' })
  async getTemplates() {
    return this.notificationsService.getTemplates();
  }

  @Post('templates')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create or update notification template' })
  async createTemplate(@Body() data: {
    slug: string;
    channel: string;
    titleTemplate: string;
    bodyTemplate: string;
    subjectTemplate?: string;
  }) {
    return this.notificationsService.createTemplate(data);
  }
}
