import { Body, Controller, Get, Headers, Param, Post, Patch, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated.decorator';
import type { PaginationDto } from '../../common/decorators/api-paginated.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateCustomerPaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a customer repayment against an installment' })
  async createCustomerPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: CreateCustomerPaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.createCustomerPayment(user.id, {
      loanId: data.loanId,
      installmentNumber: data.installmentNumber,
      idempotencyKey: idempotencyKey || data.idempotencyKey,
    });
  }

  @Post('webhook/razorpay')
  @Public()
  @ApiOperation({ summary: 'Razorpay webhook (signature verified)' })
  async razorpayWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature?: string,
  ) {
    const rawBody = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));
    return this.paymentsService.handleProviderWebhook(rawBody, signature);
  }

  @Get('me')
  @ApiOperation({ summary: 'List the current customer payments' })
  async myPayments(@CurrentUser() user: CurrentUserPayload) {
    return this.paymentsService.listMine(user.id);
  }

  @Get('my')
  @ApiOperation({ summary: 'List the current customer payments' })
  async myPaymentsAlias(@CurrentUser() user: CurrentUserPayload) {
    return this.paymentsService.listMine(user.id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Initiate a payment (admin)' })
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
  @Roles('ADMIN', 'UNDERWRITER')
  @ApiPaginatedResponse()
  @ApiOperation({ summary: 'List payments by status' })
  async listByStatus(@Query('status') status: string, @Query() pagination: PaginationDto) {
    return this.paymentsService.listByStatus(status, pagination.page, pagination.limit);
  }

  @Get('ref/:txRef')
  @ApiOperation({ summary: 'Get payment by transaction reference' })
  async findByTxRef(@Param('txRef') txRef: string, @CurrentUser() user: CurrentUserPayload) {
    return this.paymentsService.findByTxRef(txRef, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer payment by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.paymentsService.getCustomerPayment(id, user.id);
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
