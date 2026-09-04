import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CustomersService } from './customers.service';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

@ApiTags('customers')
@Controller('customers')
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated customer profile' })
  async getMine(@CurrentUser() user: CurrentUserPayload) {
    return this.customers.getMine(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the authenticated customer profile' })
  async updateMine(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateCustomerProfileDto,
    @Req() req: Request,
  ) {
    return this.customers.updateMine(user.id, dto, clientIp(req), req.headers['user-agent']);
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}
