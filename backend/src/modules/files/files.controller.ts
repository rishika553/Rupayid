import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { FilesService } from './files.service';

@ApiTags('files')
@Controller('files')
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Put('dev-upload')
  @Public()
  @ApiOperation({ summary: 'Upload a KYC document to local Phase 1 storage' })
  async localUpload(
    @Query('token') token: string,
    @Headers('content-type') contentType: string,
    @Req() request: Request,
  ) {
    return this.filesService.saveLocalUpload(token, contentType, request);
  }

  @Get('dev-download')
  @Public()
  @ApiOperation({ summary: 'Download a KYC document from local Phase 1 storage' })
  localDownload(@Query('token') token: string, @Res() response: Response) {
    const file = this.filesService.openLocalDownload(token);
    response.setHeader('Content-Type', 'application/octet-stream');
    response.setHeader('Content-Disposition', `inline; filename="${file.key.split('/').pop()}"`);
    file.stream.pipe(response);
  }

  @Post('upload-url')
  @ApiOperation({ summary: 'Get a private signed upload URL (no public object URL)' })
  async getUploadUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: { contentType: string; fileSizeBytes: number; folder?: string },
  ) {
    return this.filesService.getSignedUploadUrl({
      userId: user.id,
      applicationId: data.folder || 'misc',
      mimeType: data.contentType,
      fileSizeBytes: data.fileSizeBytes,
    });
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a private object the caller owns' })
  async delete(@CurrentUser() user: CurrentUserPayload, @Param('key') key: string) {
    const objectKey = decodeURIComponent(key);
    if (!this.filesService.keyBelongsToUser(objectKey, user.id)) {
      throw new ForbiddenException('You cannot delete this object');
    }
    await this.filesService.deleteFile(objectKey);
    return { success: true };
  }
}
