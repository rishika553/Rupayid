import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { clientIp } from '../../common/http/client-ip';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
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
}
