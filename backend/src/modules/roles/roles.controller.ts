import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('roles')
@Controller('roles')
@ApiBearerAuth()
@Roles('ADMIN')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles with permissions' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List all permissions' })
  async findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  async create(@Body() data: { name: string; description?: string; permissionIds?: string[] }) {
    return this.rolesService.create(data);
  }

  @Post(':roleId/permissions/:permissionId')
  @ApiOperation({ summary: 'Assign permission to role' })
  async assignPermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rolesService.assignPermission(roleId, permissionId);
  }

  @Delete(':roleId/permissions/:permissionId')
  @ApiOperation({ summary: 'Remove permission from role' })
  async removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rolesService.removePermission(roleId, permissionId);
  }
}
