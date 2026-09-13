import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';
import type { PaginationDto } from '../../common/decorators/api-paginated.decorator';

@ApiTags('audit')
@Controller('audit')
@ApiBearerAuth()
@Roles('ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs (read-only)' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.auditService.findAll(pagination.page, pagination.limit);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get audit trail for entity' })
  async findByEntity(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    return this.auditService.findByEntity(entityType, entityId);
  }

  @Get('actor/:changedById')
  @ApiOperation({ summary: 'Get audit trail for actor' })
  async findByActor(@Param('changedById') changedById: string) {
    return this.auditService.findByActor(changedById);
  }

  @Get('action/:actionType')
  @ApiOperation({ summary: 'Get audit trail by action type' })
  async findByAction(@Param('actionType') actionType: string) {
    return this.auditService.findByAction(actionType);
  }
}
