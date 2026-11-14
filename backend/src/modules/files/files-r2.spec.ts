import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { FilesService } from './files.service';

const config: Record<string, string> = { NODE_ENV: 'production', R2_ACCOUNT_ID: 'test-account', R2_ACCESS_KEY_ID: 'test-key', R2_SECRET_ACCESS_KEY: 'test-secret', R2_BUCKET_NAME: 'test-bucket' };
const pdf = Buffer.from('%PDF-1.7\n%%EOF');

describe('R2 storage command contract (no network)', () => {
  afterEach(() => jest.restoreAllMocks());
  it('binds signed PUT size and expiry without granting write access to the final key', async () => {
    const files = new FilesService({ get: (key: string) => config[key] } as never);
    const grant = await files.getSignedUploadUrl({ userId: 'user', applicationId: 'app', mimeType: 'application/pdf', fileSizeBytes: pdf.length });
    const url = new URL(grant.uploadUrl);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-length');
    expect(url.pathname).not.toContain('kyc-final');
  });
  it('writes exactly the validated byte snapshot with an atomic create-only condition', async () => {
    const send = jest.spyOn(S3Client.prototype, 'send');
    send.mockResolvedValueOnce({ Body: Readable.from(pdf) } as never).mockResolvedValueOnce({} as never);
    const files = new FilesService({ get: (key: string) => config[key] } as never);
    await files.finalizeUpload('kyc/user/app/file.pdf', 'application/pdf', pdf.length);
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
    const command = send.mock.calls[1][0] as PutObjectCommand;
    expect(command.input).toMatchObject({ Key: 'kyc-final/user/app/file.pdf', Body: pdf, ContentLength: pdf.length, IfNoneMatch: '*' });
  });
  it('rejects actual oversize content even when metadata claims a small object', async () => {
    const send = jest.spyOn(S3Client.prototype, 'send').mockResolvedValueOnce({ Body: Readable.from(pdf), ContentLength: 1 } as never);
    const files = new FilesService({ get: (key: string) => config[key] } as never);
    await expect(files.finalizeUpload('kyc/user/app/file.pdf', 'application/pdf', 1)).rejects.toThrow('size');
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('does not convert a failed conditional final write into success', async () => {
    jest.spyOn(S3Client.prototype, 'send').mockResolvedValueOnce({ Body: Readable.from(pdf) } as never).mockRejectedValueOnce({ $metadata: { httpStatusCode: 412 } } as never);
    await expect(new FilesService({ get: (key: string) => config[key] } as never).finalizeUpload('kyc/user/app/file.pdf', 'application/pdf', pdf.length)).rejects.toThrow('already been confirmed');
  });
});
