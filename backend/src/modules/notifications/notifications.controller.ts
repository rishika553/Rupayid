import { SendNotificationDto, CreateNotificationTemplateDto } from '../../common/dto/admin-mutations.dto';
import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  async myNotifications(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findByUser(user.id, Number(page), Number(limit));
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my notifications (legacy alias)' })
  async myNotificationsAlias(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findByUser(user.id, Number(page), Number(limit));
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all customer notifications as read' })
  async markAllAsRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Post('send')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Send a notification' })
  async send(@Body() data: SendNotificationDto) {
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
  async createTemplate(@Body() data: CreateNotificationTemplateDto) {
    return this.notificationsService.createTemplate(data);
  }
}
