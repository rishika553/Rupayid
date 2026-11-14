import { Readable } from 'stream';
import { FilesService, MAX_KYC_FILE_BYTES } from './files.service';

describe('KYC immutable storage with actual local files', () => {
  const files = new FilesService({ get: () => undefined } as never);
  const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF');
  const cleanup: string[] = [];
  async function upload(bytes = pdf) {
    const grant = await files.getSignedUploadUrl({ userId: 'security-test', applicationId: 'kyc-test', mimeType: 'application/pdf', fileSizeBytes: bytes.length });
    cleanup.push(grant.objectKey, files.finalKey(grant.objectKey));
    const token = new URL(grant.uploadUrl).searchParams.get('token')!;
    await files.saveLocalUpload(token, 'application/pdf', Readable.from(bytes));
    return { ...grant, token };
  }
  afterEach(async () => {
    jest.restoreAllMocks();
    await Promise.all(cleanup.splice(0).map((key) => files.deleteFile(key)));
  });
  it('stores verified bytes at a key that cannot be used as an upload reference', async () => {
    const grant = await upload();
    const final = await files.finalizeUpload(grant.objectKey, 'application/pdf', pdf.length);
    expect(final.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(files.keyBelongsToUser(final.objectKey, 'security-test')).toBe(false);
    await expect(files.finalizeUpload(grant.objectKey, 'application/pdf', pdf.length)).rejects.toThrow('already been confirmed');
    await expect(files.saveLocalUpload(grant.token, 'application/pdf', Readable.from(pdf))).rejects.toThrow();
    await expect(files.statObject(final.objectKey)).resolves.toMatchObject({ sizeBytes: pdf.length });
  });
  it('rejects spoofed MIME bytes, truncation, size lies and checksum lies', async () => {
    const bad = await upload(Buffer.from('<script>bad</script>'));
    await expect(files.finalizeUpload(bad.objectKey, 'application/pdf', 20)).rejects.toThrow();
    const valid = await upload();
    await expect(files.finalizeUpload(valid.objectKey, 'application/pdf', pdf.length - 1)).rejects.toThrow();
    await expect(files.finalizeUpload(valid.objectKey, 'application/pdf', pdf.length, '0'.repeat(64))).rejects.toThrow('checksum');
    const truncated = await upload(pdf.subarray(0, 15));
    await expect(files.finalizeUpload(truncated.objectKey, 'application/pdf', 15)).rejects.toThrow('content');
  });
  it('rejects expired and tampered capabilities', async () => {
    const grant = await upload();
    await expect(files.saveLocalUpload(grant.token + 'bad', 'application/pdf', Readable.from(pdf))).rejects.toThrow();
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 901_000);
    await expect(files.saveLocalUpload(grant.token, 'application/pdf', Readable.from(pdf))).rejects.toThrow('expired');
  });
  it('removes partial oversize uploads and rejects missing uploads', async () => {
    const grant = await files.getSignedUploadUrl({ userId: 'security-test', applicationId: 'kyc-test', mimeType: 'application/pdf', fileSizeBytes: 1 });
    cleanup.push(grant.objectKey);
    await expect(files.saveLocalUpload(new URL(grant.uploadUrl).searchParams.get('token')!, 'application/pdf', Readable.from(Buffer.alloc(MAX_KYC_FILE_BYTES + 1)))).rejects.toThrow();
    await expect(files.statObject(grant.objectKey)).resolves.toBeNull();
    await expect(files.finalizeUpload(grant.objectKey, 'application/pdf', 1)).rejects.toThrow('not found');
  });
});
