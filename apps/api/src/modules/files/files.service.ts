import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FilesService {
  constructor(private readonly configService: ConfigService) {}

  async getSignedUploadUrl(filename: string, contentType: string, folder?: string) {
    const bucketName = this.configService.get<string>('R2_BUCKET_NAME');
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');

    if (!bucketName || !accountId) {
      throw new Error('File storage not configured');
    }

    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = folder ? `${folder}/${timestamp}-${sanitizedFilename}` : `${timestamp}-${sanitizedFilename}`;

    return {
      key,
      bucket: bucketName,
      uploadUrl: `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`,
      publicUrl: `https://${bucketName}.${accountId}.r2.dev/${key}`,
      contentType,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  getFileUrl(key: string): string {
    const bucketName = this.configService.get<string>('R2_BUCKET_NAME');
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    return `https://${bucketName}.${accountId}.r2.dev/${key}`;
  }

  async deleteFile(_key: string): Promise<void> {
    // In production, delete from R2 bucket
  }
}
