import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator';
import type { CurrentAdminPayload } from '../admin-auth/current-admin.decorator';
import { AdminOpsService } from './admin-ops.service';
import {
  AdminDisburseDto,
  AdminDisbursementListQueryDto,
  AdminDisbursementStatusDto,
  AdminLoanApproveDto,
  AdminLoanListQueryDto,
  AdminLoanRejectDto,
} from './dto/admin-ops.dto';

@ApiTags('admin-ops')
@ApiBearerAuth()
@Controller('api/admin')
export class AdminOpsController {
  constructor(private readonly adminOps: AdminOpsService) {}

  @Get('loans')
  @ApiOperation({ summary: 'List loan applications for admin review' })
  listLoans(@Query() query: AdminLoanListQueryDto) {
    return this.adminOps.listLoans(query);
  }

  @Get('loans/:id')
  @ApiOperation({ summary: 'Get a loan application for admin review' })
  getLoan(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminOps.getLoan(id);
  }

  @Post('loans/:id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve a loan application' })
  approveLoan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminLoanApproveDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    return this.adminOps.approveLoan(id, dto, admin);
  }

  @Post('loans/:id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject a loan application' })
  rejectLoan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminLoanRejectDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    return this.adminOps.rejectLoan(id, dto.reason, admin);
  }

  @Get('disbursements')
  @ApiOperation({ summary: 'List disbursements' })
  listDisbursements(@Query() query: AdminDisbursementListQueryDto) {
    return this.adminOps.listDisbursements(query.loanApplicationId);
  }

  @Post('disbursements')
  @HttpCode(200)
  @ApiOperation({ summary: 'Initiate a disbursement' })
  initiate(@Body() dto: AdminDisburseDto, @CurrentAdmin() admin: CurrentAdminPayload) {
    return this.adminOps.initiateDisbursement(dto, admin);
  }

  @Patch('disbursements/:id/status')
  @ApiOperation({ summary: 'Update disbursement status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminDisbursementStatusDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    return this.adminOps.updateDisbursementStatus(id, dto.status, dto.providerReference, admin);
  }

  @Get('repayments/overdue')
  @ApiOperation({ summary: 'List overdue installments' })
  overdue() {
    return this.adminOps.listOverdue();
  }

  @Get('payments')
  @ApiOperation({ summary: 'List recent payments' })
  payments() {
    return this.adminOps.listPayments();
  }
}
