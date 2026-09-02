import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto, ApiPaginatedResponse } from '../../common/decorators/api-paginated.decorator';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles('ADMIN', 'SUPPORT')
  @ApiPaginatedResponse()
  @ApiOperation({ summary: 'List all users (admin only)' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.userService.findAll(pagination.page, pagination.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  async update(
    @Param('id') id: string,
    @Body() data: { firstName?: string; lastName?: string; phoneNumber?: string },
  ) {
    return this.userService.update(id, data);
  }
}
