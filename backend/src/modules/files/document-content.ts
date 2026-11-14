import { BadRequestException } from '@nestjs/common';

// Check the bytes independently of client MIME metadata. This is not malware scanning.
export function assertDocumentContent(bytes: Buffer, mimeType: string) {
  const head = bytes.subarray(0, 16);
  const tail = bytes.subarray(Math.max(0, bytes.length - 1024)).toString('latin1').trimEnd();
  const valid = mimeType === 'application/pdf'
    ? /^%PDF-1\.[0-9]|^%PDF-2\.0/.test(head.toString('ascii')) && tail.endsWith('%%EOF')
    : mimeType === 'image/jpeg'
      ? bytes.length >= 4 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff && bytes.subarray(-2).equals(Buffer.from([0xff, 0xd9]))
      : mimeType === 'image/png'
        ? bytes.length >= 45 && head.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) && bytes.subarray(12, 16).toString() === 'IHDR' && bytes.subarray(-12).equals(Buffer.from('0000000049454e44ae426082', 'hex'))
        : mimeType === 'image/webp'
          ? bytes.length >= 20 && head.subarray(0, 4).toString() === 'RIFF' && head.subarray(8, 12).toString() === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(head.subarray(12, 16).toString()) && bytes.readUInt32LE(4) + 8 === bytes.length
          : false;
  if (!valid) throw new BadRequestException('Uploaded content does not match the document type');
}
