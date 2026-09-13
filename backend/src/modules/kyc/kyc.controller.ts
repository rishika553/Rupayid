import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ConfirmKycDocumentDto, RequestKycUploadDto, UpsertKycDetailsDto } from './dto/kyc.dto';
import { KycService } from './kyc.service';

@ApiTags('kyc')
@Controller('kyc')
@ApiBearerAuth()
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post()
  @ApiOperation({ summary: 'Create a KYC application for the current customer' })
  async create(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    return this.kycService.createMine(user.id, clientIp(req), req.headers['user-agent']);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the current customer KYC package' })
  async me(@CurrentUser() user: CurrentUserPayload) {
    return this.kycService.getMine(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update personal, address, identity, and bank KYC fields' })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpsertKycDetailsDto,
    @Req() req: Request,
  ) {
    return this.kycService.updateMine(user.id, dto, clientIp(req), req.headers['user-agent']);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit the current KYC application for review' })
  async submit(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    return this.kycService.submitMine(user.id, clientIp(req), req.headers['user-agent']);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get KYC status for the current customer' })
  async status(@CurrentUser() user: CurrentUserPayload) {
    return this.kycService.getStatus(user.id);
  }

  @Post('documents/upload-url')
  @ApiOperation({ summary: 'Issue a time-limited R2 signed upload URL' })
  async uploadUrl(@CurrentUser() user: CurrentUserPayload, @Body() dto: RequestKycUploadDto) {
    return this.kycService.requestUpload(user.id, dto);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Confirm a KYC document after a successful R2 upload' })
  async confirmDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ConfirmKycDocumentDto,
    @Req() req: Request,
  ) {
    return this.kycService.confirmDocument(user.id, dto, clientIp(req), req.headers['user-agent']);
  }

  @Get('documents/:id/url')
  @ApiOperation({ summary: 'Issue a time-limited signed download URL for an owned document' })
  async documentUrl(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.kycService.getDocumentDownloadUrl(user.id, id);
  }

  @Post('applications')
  @ApiOperation({ summary: 'Create or return the current KYC application' })
  async createApplication(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    return this.kycService.createMine(user.id, clientIp(req), req.headers['user-agent']);
  }

  @Get('applications/my')
  @ApiOperation({ summary: 'Get my KYC applications' })
  async myApplications(@CurrentUser() user: CurrentUserPayload) {
    return this.kycService.findByUser(user.id);
  }

  @Get('applications/pending')
  @Roles('UNDERWRITER', 'ADMIN')
  @ApiOperation({ summary: 'List pending KYC reviews' })
  async pendingReviews() {
    return this.kycService.listPendingReviews();
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get a KYC application if the caller owns it or is staff' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.kycService.findById(id, user.id);
  }

  @Post('applications/:id/submit')
  @ApiOperation({ summary: 'Submit KYC (owner only)' })
  async submitById(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    await this.kycService.findById(id, user.id);
    return this.kycService.submitMine(user.id, clientIp(req), req.headers['user-agent']);
  }

  @Patch('applications/:id/review')
  @Roles('UNDERWRITER', 'ADMIN')
  @ApiOperation({ summary: 'Legacy staff review; admin portal is the supported approve/decline path' })
  async review(
    @Param('id') id: string,
    @Body() data: { decision: string; reason?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.kycService.reviewDecision(id, { ...data, reviewedById: user.id });
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}
