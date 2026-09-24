import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, rm, stat } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';

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
    if (
      !key ||
      key.includes('..') ||
      key.includes('\\') ||
      key.includes('//') ||
      key.includes(':') ||
      key.startsWith('/')
    ) {
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
    if (this.useLocalStorage()) {
      const key = this.buildObjectKey(input.userId, input.applicationId, input.mimeType);
      return {
        objectKey: key,
        uploadUrl: `${this.apiBaseUrl()}/files/dev-upload?token=${encodeURIComponent(
          this.localToken(key, input.mimeType, 'upload'),
        )}`,
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
        maxBytes: MAX_KYC_FILE_BYTES,
        contentType: input.mimeType,
      };
    }
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
    if (this.useLocalStorage()) {
      return {
        downloadUrl: `${this.apiBaseUrl()}/files/dev-download?token=${encodeURIComponent(
          this.localToken(objectKey, '', 'download'),
        )}`,
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
      };
    }
    this.assertReady();
    const command = new GetObjectCommand({
      Bucket: this.bucket(),
      Key: objectKey,
      ResponseCacheControl: 'private, no-store',
    });
    const downloadUrl = await getSignedUrl(this.client as S3Client, command, {
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });
    return {
      downloadUrl,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    };
  }

  /** Returns null when nothing was uploaded under this key. `contentType` is null for local storage. */
  async statObject(key: string): Promise<{ sizeBytes: number; contentType: string | null } | null> {
    if (this.useLocalStorage()) {
      try {
        const info = await stat(this.localPath(key));
        return info.isFile() ? { sizeBytes: info.size, contentType: null } : null;
      } catch {
        return null;
      }
    }
    this.assertReady();
    try {
      const head = await (this.client as S3Client).send(
        new HeadObjectCommand({ Bucket: this.bucket(), Key: key }),
      );
      return { sizeBytes: Number(head.ContentLength ?? 0), contentType: head.ContentType ?? null };
    } catch (error) {
      if (
        error instanceof NotFound ||
        (error instanceof S3ServiceException && error.$metadata?.httpStatusCode === 404)
      ) {
        return null;
      }
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (this.useLocalStorage()) {
      await rm(this.localPath(key), { force: true });
      return;
    }
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

  async saveLocalUpload(
    token: string,
    contentType: string,
    input: NodeJS.ReadableStream,
  ) {
    if (!this.useLocalStorage()) {
      throw new ServiceUnavailableException('Local document storage is disabled');
    }
    const payload = this.verifyLocalToken(token, 'upload');
    if (payload.contentType !== contentType) {
      throw new BadRequestException('Upload content type does not match');
    }
    this.assertAllowedUpload(contentType, 1);
    const path = this.localPath(payload.key);
    await mkdir(dirname(path), { recursive: true });
    let bytes = 0;
    const limit = new Transform({
      transform(chunk, _encoding, callback) {
        bytes += Buffer.byteLength(chunk);
        callback(
          bytes > MAX_KYC_FILE_BYTES ? new Error('File exceeds 5 MB') : null,
          chunk,
        );
      },
    });
    try {
      await pipeline(input, limit, createWriteStream(path, { flags: 'wx' }));
    } catch (error) {
      await rm(path, { force: true });
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Could not store document',
      );
    }
    if (bytes < 1) {
      await rm(path, { force: true });
      throw new BadRequestException('Document is empty');
    }
    return { uploaded: true };
  }

  openLocalDownload(token: string) {
    if (!this.useLocalStorage()) {
      throw new ServiceUnavailableException('Local document storage is disabled');
    }
    const payload = this.verifyLocalToken(token, 'download');
    return { stream: createReadStream(this.localPath(payload.key)), key: payload.key };
  }

  private useLocalStorage() {
    return this.configService.get<string>('NODE_ENV') !== 'production' && !this.isConfigured();
  }

  private apiBaseUrl() {
    const configured = this.configService.get<string>('API_PUBLIC_URL');
    if (configured) return configured.replace(/\/$/, '');
    const prefix = this.configService.get<string>('API_PREFIX') || 'api/v1';
    const port = this.configService.get<string>('PORT') || '3001';
    return `http://localhost:${port}/${prefix}`;
  }

  private localToken(key: string, contentType: string, operation: 'upload' | 'download') {
    const encoded = Buffer.from(
      JSON.stringify({
        key,
        contentType,
        operation,
        expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1_000,
      }),
    ).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.localSecret())
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }

  private verifyLocalToken(token: string, operation: 'upload' | 'download') {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) throw new BadRequestException('Invalid upload token');
    const expected = crypto
      .createHmac('sha256', this.localSecret())
      .update(encoded)
      .digest('base64url');
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new BadRequestException('Invalid upload token');
    }
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as {
      key: string;
      contentType: string;
      operation: string;
      expiresAt: number;
    };
    if (
      payload.operation !== operation ||
      payload.expiresAt <= Date.now() ||
      !this.keyBelongsToUser(payload.key, payload.key.split('/')[1] || '')
    ) {
      throw new BadRequestException('Invalid or expired upload token');
    }
    return payload;
  }

  private localPath(key: string) {
    const root = resolve(process.cwd(), '.local-uploads');
    const target = resolve(join(root, ...key.split('/')));
    if (!target.startsWith(`${root}\\`) && !target.startsWith(`${root}/`)) {
      throw new BadRequestException('Invalid storage key');
    }
    return target;
  }

  private localSecret() {
    return (
      this.configService.get<string>('FILE_UPLOAD_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'development-file-secret'
    );
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
