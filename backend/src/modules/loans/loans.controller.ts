import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { clientIp } from '../../common/http/client-ip';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated.decorator';
import type { PaginationDto } from '../../common/decorators/api-paginated.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateLoanApplicationDto,
  SubmitLoanApplicationDto,
  UpdateLoanApplicationDto,
} from './dto/loan-application.dto';
import { LoansService } from './loans.service';

@ApiTags('loans')
@Controller('loans')
@ApiBearerAuth()
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post('applications')
  @ApiOperation({ summary: 'Create a customer loan application draft' })
  async createApplication(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: CreateLoanApplicationDto,
    @Req() req: Request,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.loansService.createApplication(user.id, data, {
      ip: clientIp(req),
      idempotencyKey: idempotencyKey || data.idempotencyKey,
    });
  }

  @Get('applications/my')
  @ApiOperation({ summary: 'Get my loan applications' })
  async myApplications(@CurrentUser() user: CurrentUserPayload) {
    return this.loansService.findMine(user.id);
  }

  @Get('applications/admin')
  @Roles('ADMIN', 'UNDERWRITER')
  @ApiPaginatedResponse()
  @ApiOperation({ summary: 'List all loan applications (admin)' })
  async findAll(@Query() pagination: PaginationDto, @Query('status') status?: string) {
    return this.loansService.findAll(pagination.page, pagination.limit, status);
  }

  @Get('applications')
  @ApiOperation({ summary: 'List the current customer loan applications' })
  async listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.loansService.findMine(user.id);
  }

  @Get('me')
  @ApiOperation({ summary: 'List the current customer loans for tracking' })
  async myLoans(@CurrentUser() user: CurrentUserPayload) {
    return this.loansService.listTrackedLoans(user.id);
  }

  @Get(':id/repayment-schedule')
  @ApiOperation({ summary: 'Get the customer repayment schedule for a loan' })
  async repaymentSchedule(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.loansService.getRepaymentSchedule(id, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer loan by ID' })
  async getLoan(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.loansService.getTrackedLoan(id, user.id);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get a loan application by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.loansService.getApplication(id, user.id);
  }

  @Patch('applications/:id')
  @ApiOperation({ summary: 'Update a draft loan application' })
  async update(
    @Param('id') id: string,
    @Body() data: UpdateLoanApplicationDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    return this.loansService.updateApplication(id, user.id, data, clientIp(req));
  }

  @Post('applications/:id/submit')
  @ApiOperation({ summary: 'Submit a draft loan application' })
  async submit(
    @Param('id') id: string,
    @Body() data: SubmitLoanApplicationDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.loansService.submitApplication(id, user.id, {
      ip: clientIp(req),
      idempotencyKey: idempotencyKey || data.idempotencyKey,
    });
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
