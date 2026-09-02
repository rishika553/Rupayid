import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('admin')
@Controller('admin')
@ApiBearerAuth()
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'List all admin users' })
  async findAll() {
    return this.adminService.findAll();
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get admin by user ID' })
  async findByUserId(@Param('userId') userId: string) {
    return this.adminService.findByUserId(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update admin profile' })
  async update(@Param('id') id: string, @Body() data: { department?: string; level?: number }) {
    return this.adminService.update(id, data);
  }
}
