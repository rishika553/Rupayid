import { Controller, Get, Headers, Put, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { FilesService } from './files.service';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Put('dev-upload')
  @Public()
  @ApiOperation({ summary: 'Upload a KYC document to local storage (development only)' })
  async localUpload(
    @Query('token') token: string,
    @Headers('content-type') contentType: string,
    @Req() request: Request,
  ) {
    return this.filesService.saveLocalUpload(token, contentType, request);
  }

  @Get('dev-download')
  @Public()
  @ApiOperation({ summary: 'Download a KYC document from local storage (development only)' })
  localDownload(@Query('token') token: string, @Res() response: Response) {
    const file = this.filesService.openLocalDownload(token);
    response.setHeader('Content-Type', 'application/octet-stream');
    response.setHeader('Content-Disposition', `inline; filename="${file.key.split('/').pop()}"`);
    file.stream.pipe(response);
  }
}
