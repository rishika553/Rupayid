'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@rupayaid/ui';
import { Badge, statusTone } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { KycField, selectClassName } from '@/components/kyc/kyc-field';
import { useAddKycDocument, useKycDocumentPreview } from '@/hooks/use-customer-data';
import { KYC_DOCUMENT_TYPES, validateKycFile } from '@/lib/kyc';
import { statusLabel } from '@/lib/format';
import type { KycDocument } from '@/lib/types';
import { useToast } from '@/components/ui/toaster';

export function KycDocumentsPanel({
  documents,
  canEdit,
}: {
  documents: KycDocument[];
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<(typeof KYC_DOCUMENT_TYPES)[number]>('AADHAAR_CARD');
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<'image' | 'pdf' | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [remotePreview, setRemotePreview] = useState<{ id: string; url: string; image: boolean } | null>(null);
  const addDoc = useAddKycDocument();
  const preview = useKycDocumentPreview();

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function onFileChange() {
    const file = fileRef.current?.files?.[0];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewKind(null);
    setFileError(null);
    if (!file) {
      return;
    }
    const error = validateKycFile(file);
    if (error) {
      setFileError(error);
      return;
    }
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
      setPreviewKind('image');
    } else if (file.type === 'application/pdf') {
      setPreviewKind('pdf');
    }
  }

  async function onUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setFileError('Choose a file to upload.');
      return;
    }
    const error = validateKycFile(file);
    if (error) {
      setFileError(error);
      return;
    }
    setProgress(0);
    try {
      await addDoc.mutateAsync({
        documentType,
        file,
        onProgress: setProgress,
      });
      toast({ title: 'Document uploaded', description: 'A private storage reference was saved.' });
      if (fileRef.current) {
        fileRef.current.value = '';
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setPreviewKind(null);
      setFileError(null);
    } catch (uploadError) {
      setFileError(uploadError instanceof Error ? uploadError.message : 'Upload failed. Try again.');
    } finally {
      setProgress(null);
    }
  }

  async function openPreview(doc: KycDocument) {
    try {
      const result = await preview.mutateAsync(doc.id);
      const image = Boolean(doc.mimeType?.startsWith('image/'));
      setRemotePreview({ id: doc.id, url: result.downloadUrl, image });
      if (!image) {
        window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      toast({
        title: 'Preview unavailable',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      {canEdit ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <KycField label="Document type" htmlFor="documentType">
            <select
              id="documentType"
              className={selectClassName}
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value as (typeof KYC_DOCUMENT_TYPES)[number])}
            >
              {KYC_DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {statusLabel(type)}
                </option>
              ))}
            </select>
          </KycField>
          <KycField
            label="File"
            htmlFor="kyc-file"
            error={fileError || undefined}
            hint="PDF, JPEG, PNG, or WebP. Maximum 5 MB."
          >
            <input
              id="kyc-file"
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              onChange={onFileChange}
            />
          </KycField>
          {previewKind === 'image' && previewUrl ? (
            <div className="sm:col-span-2 overflow-hidden rounded-lg border bg-muted/40">
              {/* Local object URL only — never a public storage URL */}
              <img src={previewUrl} alt="Selected document preview" className="max-h-56 w-full object-contain" />
            </div>
          ) : null}
          {previewKind === 'pdf' ? (
            <p className="sm:col-span-2 text-sm text-muted-foreground">PDF selected. Preview opens after upload via a signed link.</p>
          ) : null}
          {progress !== null ? (
            <div className="sm:col-span-2" aria-live="polite">
              <Label>Uploading {progress}%</Label>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}
          <Button type="button" onClick={() => void onUpload()} disabled={addDoc.isPending}>
            {addDoc.isPending ? 'Uploading…' : 'Upload document'}
          </Button>
        </div>
      ) : null}

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">Upload at least one identity document before you submit.</p>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
              <div>
                <p className="font-medium">{statusLabel(doc.documentType)}</p>
                <p className="text-sm text-muted-foreground">
                  {doc.mimeType || 'File'}
                  {doc.fileSizeBytes ? ` · ${(doc.fileSizeBytes / 1024).toFixed(0)} KB` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={statusTone(doc.status)}>{statusLabel(doc.status)}</Badge>
                <Button type="button" size="sm" variant="outline" onClick={() => void openPreview(doc)}>
                  Preview
                </Button>
              </div>
              {remotePreview?.id === doc.id && remotePreview.image ? (
                <div className="w-full overflow-hidden rounded-lg border bg-muted/40">
                  <img src={remotePreview.url} alt={`${statusLabel(doc.documentType)} preview`} className="max-h-56 w-full object-contain" />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
