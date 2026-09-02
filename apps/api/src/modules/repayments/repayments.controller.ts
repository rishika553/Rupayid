import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RepaymentsService } from './repayments.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('repayments')
@Controller('repayments')
@ApiBearerAuth()
export class RepaymentsController {
  constructor(private readonly repaymentsService: RepaymentsService) {}

  @Get('schedule/:loanApplicationId')
  @ApiOperation({ summary: 'Get repayment schedule for loan' })
  async getSchedule(@Param('loanApplicationId') loanApplicationId: string) {
    return this.repaymentsService.getSchedule(loanApplicationId);
  }

  @Get('overdue')
  @Roles('ADMIN', 'UNDERWRITER')
  @ApiOperation({ summary: 'Get overdue schedules' })
  async getOverdue() {
    return this.repaymentsService.getOverdueSchedules();
  }

  @Get('loan/:loanApplicationId')
  @ApiOperation({ summary: 'Get repayments for loan' })
  async findByLoan(@Param('loanApplicationId') loanApplicationId: string) {
    return this.repaymentsService.findByLoan(loanApplicationId);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a repayment record' })
  async create(@Body() data: {
    loanApplicationId: string;
    scheduleId?: string;
    paymentId?: string;
    amount: number;
    principalAllocated?: number;
    interestAllocated?: number;
    penaltyAllocated?: number;
  }) {
    return this.repaymentsService.createRepayment(data);
  }

  @Patch('schedule/:id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update schedule status' })
  async updateScheduleStatus(
    @Param('id') id: string,
    @Body() data: { status: string; paidAmount?: number },
  ) {
    return this.repaymentsService.updateScheduleStatus(id, data.status, data.paidAmount);
  }
}
