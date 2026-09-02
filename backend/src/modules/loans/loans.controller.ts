import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { LoansService } from './loans.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { PaginationDto} from '../../common/decorators/api-paginated.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated.decorator';

@ApiTags('loans')
@Controller('loans')
@ApiBearerAuth()
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post('applications')
  @ApiOperation({ summary: 'Submit loan application' })
  async createApplication(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: { loanProductId: string; amountRequested: number; tenureMonths: number },
  ) {
    return this.loansService.createApplication(user.id, data);
  }

  @Get('applications/my')
  @ApiOperation({ summary: 'Get my loan applications' })
  async myApplications(@CurrentUser() user: CurrentUserPayload) {
    return this.loansService.findByUser(user.id);
  }

  @Get('applications')
  @Roles('ADMIN', 'UNDERWRITER')
  @ApiPaginatedResponse()
  @ApiOperation({ summary: 'List all loan applications (admin)' })
  async findAll(@Query() pagination: PaginationDto, @Query('status') status?: string) {
    return this.loansService.findAll(pagination.page, pagination.limit, status);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get loan application by ID' })
  async findOne(@Param('id') id: string) {
    return this.loansService.findById(id);
  }

  @Patch('applications/:id/state')
  @Roles('ADMIN', 'UNDERWRITER')
  @ApiOperation({ summary: 'Transition loan application state' })
  async transitionState(
    @Param('id') id: string,
    @Body() data: { toState: string; reason?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.loansService.transitionState(id, data.toState, user.id, data.reason);
  }

  @Patch('applications/:id/approve')
  @Roles('UNDERWRITER', 'ADMIN')
  @ApiOperation({ summary: 'Approve loan application' })
  async approve(
    @Param('id') id: string,
    @Body() data: {
      approvedAmount: number;
      approvedTenure: number;
      approvedInterest: number;
      reason?: string;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.loansService.approve(id, {
      ...data,
      approvedById: user.id,
      approvedByName: `${user.email}`,
    });
  }

  @Patch('applications/:id/reject')
  @Roles('UNDERWRITER', 'ADMIN')
  @ApiOperation({ summary: 'Reject loan application' })
  async reject(
    @Param('id') id: string,
    @Body() data: { reason: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.loansService.reject(id, { reason: data.reason, rejectedById: user.id });
  }
}
