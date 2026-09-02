import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DisbursementsService } from './disbursements.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto, ApiPaginatedResponse } from '../../common/decorators/api-paginated.decorator';

@ApiTags('disbursements')
@Controller('disbursements')
@ApiBearerAuth()
@Roles('ADMIN', 'UNDERWRITER')
export class DisbursementsController {
  constructor(private readonly disbursementsService: DisbursementsService) {}

  @Post()
  @ApiOperation({ summary: 'Initiate a disbursement' })
  async initiate(
    @Body() data: {
      loanApplicationId: string;
      amount: number;
      method: string;
      beneficiaryBankName?: string;
      beneficiaryAccount?: string;
      beneficiaryIfsc?: string;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.disbursementsService.initiate(data.loanApplicationId, {
      ...data,
      initiatedBy: user.id,
    });
  }

  @Get()
  @ApiPaginatedResponse()
  @ApiOperation({ summary: 'List disbursements' })
  async findAll(@Query('loanApplicationId') loanApplicationId?: string) {
    return this.disbursementsService.findAll(loanApplicationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get disbursement by ID' })
  async findOne(@Param('id') id: string) {
    return this.disbursementsService.findById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update disbursement status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() data: { status: string; providerReference?: string },
  ) {
    return this.disbursementsService.updateStatus(id, data.status, data.providerReference);
  }

  @Get('status/:status')
  @ApiPaginatedResponse()
  @ApiOperation({ summary: 'List disbursements by status' })
  async listByStatus(
    @Param('status') status: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.disbursementsService.listByStatus(status, pagination.page, pagination.limit);
  }
}
