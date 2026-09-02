import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { KycService } from './kyc.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { PaginationDto} from '../../common/decorators/api-paginated.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('kyc')
@Controller('kyc')
@ApiBearerAuth()
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('applications')
  @ApiOperation({ summary: 'Create or get existing KYC application' })
  async createApplication(@CurrentUser() user: CurrentUserPayload) {
    return this.kycService.createApplication(user.id);
  }

  @Get('applications/my')
  @ApiOperation({ summary: 'Get my KYC applications' })
  async myApplications(@CurrentUser() user: CurrentUserPayload) {
    return this.kycService.findByUser(user.id);
  }

  @Get('applications/pending')
  @Roles('UNDERWRITER', 'ADMIN')
  @ApiPaginatedResponse()
  @ApiOperation({ summary: 'List pending KYC reviews' })
  async pendingReviews(@Query() pagination: PaginationDto) {
    return this.kycService.listPendingReviews(pagination.page, pagination.limit);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get KYC application by ID' })
  async findOne(@Param('id') id: string) {
    return this.kycService.findById(id);
  }

  @Post('applications/:id/submit')
  @ApiOperation({ summary: 'Submit KYC application for review' })
  async submit(@Param('id') id: string) {
    return this.kycService.submit(id);
  }

  @Post('applications/:id/documents')
  @ApiOperation({ summary: 'Add document to KYC application' })
  async addDocument(
    @Param('id') id: string,
    @Body() data: {
      documentType: string;
      fileStorageKey: string;
      fileUrl?: string;
      mimeType?: string;
      fileSizeBytes?: number;
      fileSha256?: string;
    },
  ) {
    return this.kycService.addDocument(id, data);
  }

  @Patch('applications/:id/review')
  @Roles('UNDERWRITER', 'ADMIN')
  @ApiOperation({ summary: 'Review KYC application' })
  async review(
    @Param('id') id: string,
    @Body() data: { decision: string; reason?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.kycService.reviewDecision(id, { ...data, reviewedById: user.id });
  }
}
