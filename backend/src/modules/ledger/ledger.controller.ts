import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { Roles } from '../../common/decorators/roles.decorator';
import type { PaginationDto } from '../../common/decorators/api-paginated.decorator';

@ApiTags('ledger')
@Controller('ledger')
@ApiBearerAuth()
@Roles('ADMIN')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get()
  @ApiOperation({ summary: 'List all ledgers' })
  async findAll() {
    return this.ledgerService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ledger by ID' })
  async findOne(@Param('id') id: string) {
    return this.ledgerService.findById(id);
  }

  @Post('entries')
  @ApiOperation({ summary: 'Create a ledger entry (append-only)' })
  async createEntry(@Body() data: {
    ledgerId: string;
    entryType: string;
    amount: number;
    category: string;
    description?: string;
    reference?: string;
    entrySource?: string;
    direction?: string;
  }) {
    return this.ledgerService.createEntry(data);
  }

  @Get(':id/entries')
  @ApiOperation({ summary: 'Get entries for a ledger' })
  async getEntries(@Param('id') id: string, @Query() pagination: PaginationDto) {
    return this.ledgerService.getEntries(id, pagination.page, pagination.limit);
  }
}
