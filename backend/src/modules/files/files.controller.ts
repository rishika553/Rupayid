import { Controller, Post, Body, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { FilesService } from './files.service';

@ApiTags('files')
@Controller('files')
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Get a signed upload URL for R2' })
  async getUploadUrl(
    @Body() data: { filename: string; contentType: string; folder?: string },
  ) {
    return this.filesService.getSignedUploadUrl(data.filename, data.contentType, data.folder);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a file' })
  async delete(@Param('key') key: string) {
    await this.filesService.deleteFile(decodeURIComponent(key));
    return { success: true };
  }
}
