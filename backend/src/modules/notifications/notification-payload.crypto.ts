import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export function sealVariables(
  variables: Record<string, unknown>,
  secret: string,
): string {
  const key = createHash('sha256').update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(variables), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function openVariables(payload: string, secret: string): Record<string, string> {
  const packed = Buffer.from(payload, 'base64url');
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const encrypted = packed.subarray(28);
  const key = createHash('sha256').update(secret).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const value = JSON.parse(
    Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'),
  ) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, String(item ?? '')]),
  );
}
