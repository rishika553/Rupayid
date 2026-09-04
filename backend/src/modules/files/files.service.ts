import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

export const ALLOWED_KYC_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_KYC_FILE_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 15 * 60;

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class FilesService {
  private client: S3Client | null = null;

  constructor(private readonly configService: ConfigService) {
    if (this.isConfigured()) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${this.accountId()}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID') as string,
          secretAccessKey: this.configService.get<string>('R2_SECRET_ACCESS_KEY') as string,
        },
      });
    }
  }

  isConfigured(): boolean {
    return Boolean(
      this.configService.get('R2_ACCOUNT_ID') &&
        this.configService.get('R2_ACCESS_KEY_ID') &&
        this.configService.get('R2_SECRET_ACCESS_KEY') &&
        this.configService.get('R2_BUCKET_NAME') &&
        !String(this.configService.get('R2_ACCOUNT_ID')).includes('your-cloudflare'),
    );
  }

  assertAllowedUpload(mimeType: string, fileSizeBytes: number) {
    if (!ALLOWED_KYC_MIME_TYPES.includes(mimeType as (typeof ALLOWED_KYC_MIME_TYPES)[number])) {
      throw new BadRequestException('Unsupported file type. Upload a PDF, JPEG, PNG, or WebP.');
    }
    if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0 || fileSizeBytes > MAX_KYC_FILE_BYTES) {
      throw new BadRequestException('File must be between 1 byte and 5 MB.');
    }
  }

  buildObjectKey(userId: string, applicationId: string, mimeType: string): string {
    const ext = MIME_TO_EXT[mimeType] || '';
    return `kyc/${safeKeySegment(userId)}/${safeKeySegment(applicationId)}/${crypto.randomUUID()}${ext}`;
  }

  keyBelongsToUser(key: string, userId: string): boolean {
    if (!key || key.includes('..') || key.includes('\\') || key.includes('//')) {
      return false;
    }
    const prefix = `kyc/${userId}/`;
    return key.startsWith(prefix) && key.slice(prefix.length).split('/').length === 2;
  }

  async getSignedUploadUrl(input: {
    userId: string;
    applicationId: string;
    mimeType: string;
    fileSizeBytes: number;
  }) {
    this.assertAllowedUpload(input.mimeType, input.fileSizeBytes);
    this.assertReady();
    const key = this.buildObjectKey(input.userId, input.applicationId, input.mimeType);
    const uploadUrl = await this.signPut(key, input.mimeType);
    return {
      objectKey: key,
      uploadUrl,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
      maxBytes: MAX_KYC_FILE_BYTES,
      contentType: input.mimeType,
    };
  }

  async getSignedDownloadUrl(objectKey: string) {
    this.assertReady();
    const command = new GetObjectCommand({
      Bucket: this.bucket(),
      Key: objectKey,
    });
    const downloadUrl = await getSignedUrl(this.client as S3Client, command, {
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });
    return {
      downloadUrl,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    };
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.client) {
      return;
    }
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket(),
        Key: key,
      }),
    );
  }

  private async signPut(key: string, mimeType: string) {
    const command = new PutObjectCommand({
      Bucket: this.bucket(),
      Key: key,
      ContentType: mimeType,
    });
    return getSignedUrl(this.client as S3Client, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
  }

  private assertReady() {
    if (!this.client || !this.isConfigured()) {
      throw new ServiceUnavailableException('Document storage is not configured');
    }
  }

  private accountId() {
    return this.configService.get<string>('R2_ACCOUNT_ID') as string;
  }

  private bucket() {
    return this.configService.get<string>('R2_BUCKET_NAME') as string;
  }
}

function safeKeySegment(value: string): string {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(value)) {
    throw new BadRequestException('Invalid storage key');
  }
  return value;
}
