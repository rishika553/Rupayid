import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { PaginationDto} from '../../common/decorators/api-paginated.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated.decorator';

@ApiTags('payments')
@Controller('payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Initiate a payment' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: {
      loanApplicationId?: string;
      method: string;
      type: string;
      direction: string;
      amount: number;
      gateway?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.paymentsService.create({
      ...data,
      userId: user.id,
      initiatedById: user.id,
    });
  }

  @Get()
  @ApiPaginatedResponse()
  @ApiOperation({ summary: 'List payments by status' })
  async listByStatus(@Query('status') status: string, @Query() pagination: PaginationDto) {
    return this.paymentsService.listByStatus(status, pagination.page, pagination.limit);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my payments' })
  async myPayments(@CurrentUser() user: CurrentUserPayload) {
    return this.paymentsService.listByUser(user.id);
  }

  @Get('ref/:txRef')
  @ApiOperation({ summary: 'Get payment by transaction reference' })
  async findByTxRef(@Param('txRef') txRef: string) {
    return this.paymentsService.findByTxRef(txRef);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findById(id);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update payment status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() data: { status: string; refusalReason?: string },
  ) {
    return this.paymentsService.updateStatus(id, data.status, data.refusalReason);
  }

  @Post(':id/transactions')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add transaction to payment' })
  async addTransaction(
    @Param('id') id: string,
    @Body() data: { type: string; amount: number; direction: string; currency?: string },
  ) {
    return this.paymentsService.addTransaction(id, data);
  }
}
