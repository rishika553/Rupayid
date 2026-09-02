import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { LoanProductsService } from './loan-products.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('loan-products')
@Controller('loan-products')
export class LoanProductsController {
  constructor(private readonly loanProductsService: LoanProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List active loan products' })
  async findAll() {
    return this.loanProductsService.findAll();
  }

  @Get('all')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all loan products including inactive' })
  async findAllIncludingInactive() {
    return this.loanProductsService.findAllIncludingInactive();
  }

  @Get('code/:code')
  @Public()
  @ApiOperation({ summary: 'Get loan product by code' })
  async findByCode(@Param('code') code: string) {
    return this.loanProductsService.findByCode(code);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get loan product by ID' })
  async findOne(@Param('id') id: string) {
    return this.loanProductsService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create loan product' })
  async create(@Body() data: {
    code: string;
    name: string;
    description?: string;
    minAmount: number;
    maxAmount: number;
    minTenureMonths: number;
    maxTenureMonths: number;
    baseInterestRate: number;
    processingFeeRate: number;
  }) {
    return this.loanProductsService.create(data);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update loan product' })
  async update(@Param('id') id: string, @Body() data: Record<string, unknown>) {
    return this.loanProductsService.update(id, data as never);
  }
}
