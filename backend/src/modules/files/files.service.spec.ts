import { BadRequestException } from '@nestjs/common';
import { FilesService } from './files.service';

function service() {
  return new FilesService({
    get: () => undefined,
  } as never);
}

describe('FilesService', () => {
  it('rejects unsupported MIME types', () => {
    expect(() => service().assertAllowedUpload('application/zip', 100)).toThrow(BadRequestException);
  });

  it('rejects files over 5 MB', () => {
    expect(() => service().assertAllowedUpload('application/pdf', 5 * 1024 * 1024 + 1)).toThrow(
      BadRequestException,
    );
  });

  it('builds a user-scoped object key without a public URL', () => {
    const key = service().buildObjectKey('user-1', 'kyc-1', 'image/jpeg');
    expect(key.startsWith('kyc/user-1/kyc-1/')).toBe(true);
    expect(key.endsWith('.jpg')).toBe(true);
    expect(key.includes('http')).toBe(false);
  });

  it('rejects path-traversal segments in object keys', () => {
    expect(() => service().buildObjectKey('../other', 'kyc-1', 'application/pdf')).toThrow(
      BadRequestException,
    );
    expect(service().keyBelongsToUser('kyc/user-1/../user-2/file.pdf', 'user-1')).toBe(false);
    expect(service().keyBelongsToUser('kyc/user-2/kyc-1/file.pdf', 'user-1')).toBe(false);
    expect(service().keyBelongsToUser('kyc/user-1/kyc-1/file.pdf', 'user-1')).toBe(true);
  });
});
