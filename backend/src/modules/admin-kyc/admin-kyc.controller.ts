import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAdmin } from '../admin-auth/current-admin.decorator';
import type { CurrentAdminPayload } from '../admin-auth/current-admin.decorator';
import { AdminKycDeclineDto, AdminKycListQueryDto } from './dto/admin-kyc.dto';
import { AdminKycService } from './admin-kyc.service';

@ApiTags('admin-kyc')
@ApiBearerAuth()
@Controller('api/admin/kyc')
export class AdminKycController {
  constructor(private readonly adminKycService: AdminKycService) {}

  @Get()
  @ApiOperation({ summary: 'List KYC applications for admin review' })
  list(@Query() query: AdminKycListQueryDto) {
    return this.adminKycService.list(query);
  }

  @Get(':id/documents/:documentId/url')
  @ApiOperation({ summary: 'Issue a time-limited download URL for a KYC document' })
  documentUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    return this.adminKycService.getDocumentUrl(id, documentId, admin);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List KYC document metadata for admin review' })
  listDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminKycService.listDocuments(id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve a submitted KYC application' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentAdmin() admin: CurrentAdminPayload) {
    return this.adminKycService.approve(id, admin);
  }

  @Post(':id/decline')
  @HttpCode(200)
  @ApiOperation({ summary: 'Decline a submitted KYC application' })
  decline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminKycDeclineDto,
    @CurrentAdmin() admin: CurrentAdminPayload,
  ) {
    return this.adminKycService.decline(id, dto.reason, admin);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a KYC application for admin review' })
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentAdmin() admin: CurrentAdminPayload) {
    return this.adminKycService.getById(id, admin);
  }
}
