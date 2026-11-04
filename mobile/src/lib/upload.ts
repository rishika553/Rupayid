import { type ApiClient, requireApi } from '@/api/client';

interface PresignedUrlResponse {
  uploadUrl: string;
  objectKey: string;
}

async function uriToBlob(uri: string): Promise<Blob> {
  const resp = await fetch(uri);
  if (!resp.ok) {
    throw new Error(`Could not read picked file (${resp.status})`);
  }
  return await resp.blob();
}

function putWithProgress(
  uploadUrl: string,
  blob: Blob,
  contentType: string,
  onProgress?: (progress: number) => void,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
      };
    }
    xhr.onload = () => resolve(xhr.status);
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.send(blob);
  });
}

export async function uploadDocument(
  apiClient: ApiClient,
  localUri: string,
  documentType: string,
  mimeType: string,
  fileSizeBytes: number | undefined,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const blob = await uriToBlob(localUri);
  const blobSize = blob.size;
  if (!blobSize || blobSize < 1) {
    throw new Error('Selected file is empty or unreadable');
  }

  let sizeBytes = fileSizeBytes;
  if (!Number.isInteger(sizeBytes) || !sizeBytes || sizeBytes < 1) {
    sizeBytes = blobSize;
  }
  sizeBytes = Math.floor(sizeBytes);

  const { uploadUrl, objectKey } = await requireApi(
    apiClient.post<PresignedUrlResponse>('/kyc/documents/upload-url', {
      documentType,
      mimeType,
      fileSizeBytes: sizeBytes,
    }),
  );

  const status = await putWithProgress(uploadUrl, blob, mimeType, onProgress);
  if (status < 200 || status >= 300) {
    throw new Error(`File upload failed (${status})`);
  }

  await requireApi(
    apiClient.post('/kyc/documents', {
      objectKey,
      documentType,
      mimeType,
      fileSizeBytes: sizeBytes,
    }),
  );

  return objectKey;
}
