import { Body, Controller, Delete, ForbiddenException, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { FilesService } from './files.service';

@ApiTags('files')
@Controller('files')
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

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
