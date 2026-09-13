import type { KycApplication } from '@/lib/types';

export const KYC_STEPS = [
  { id: 1, key: 'personal', title: 'Personal' },
  { id: 2, key: 'address', title: 'Address' },
  { id: 3, key: 'identity', title: 'Identity' },
  { id: 4, key: 'bank', title: 'Bank' },
  { id: 5, key: 'documents', title: 'Documents' },
  { id: 6, key: 'review', title: 'Review' },
  { id: 7, key: 'submit', title: 'Submit' },
] as const;

export const KYC_DOCUMENT_TYPES = [
  'AADHAAR_CARD',
  'PAN_CARD',
  'PASSPORT',
  'DRIVING_LICENSE',
  'VOTER_ID',
  'SELFIE',
  'BANK_STATEMENT',
  'INCOME_PROOF',
  'UTILITY_BILL',
] as const;

export const ALLOWED_KYC_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_KYC_FILE_BYTES = 5 * 1024 * 1024;

export const EDITABLE_KYC_STATUSES = ['DRAFT', 'RESUBMISSION_REQUIRED'] as const;

const KYC_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not started',
  DRAFT: 'Draft',
  SUBMITTED: 'Pending',
  UNDER_REVIEW: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Declined',
  DECLINED: 'Declined',
  PENDING: 'Pending',
  RESUBMISSION_REQUIRED: 'Resubmission Required',
};

export function kycStatusLabel(status?: string | null): string {
  if (!status) {
    return 'Draft';
  }
  return KYC_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

export function isKycEditable(status?: string | null): boolean {
  return (EDITABLE_KYC_STATUSES as readonly string[]).includes(status || 'DRAFT');
}

export function isoDate(value?: string | null): string {
  if (!value) {
    return '';
  }
  return String(value).slice(0, 10);
}

export function kycStepStorageKey(applicationId: string) {
  return `rupayaid.kyc.step.${applicationId}`;
}

export function readStoredKycStep(applicationId: string): number | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem(kycStepStorageKey(applicationId));
  const step = Number(raw);
  if (!Number.isInteger(step) || step < 1 || step > 7) {
    return null;
  }
  return step;
}

export function writeStoredKycStep(applicationId: string, step: number) {
  localStorage.setItem(kycStepStorageKey(applicationId), String(step));
}

export function kycPathForStep(step: number) {
  if (step === 5) {
    return '/kyc/documents';
  }
  if (step >= 6) {
    return '/kyc/review';
  }
  return '/kyc';
}

export function latestDecisionReason(application?: KycApplication | null): string | null {
  if (application?.declineReason?.trim()) {
    return application.declineReason.trim();
  }
  const history = application?.verificationHistory || [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const item = history[i];
    if (item.reason && ['REJECTED', 'REQUESTED_MORE_INFO'].includes(item.decision)) {
      return item.reason;
    }
  }
  return null;
}

export function inferKycStep(application: KycApplication): number {
  const stored = readStoredKycStep(application.id);
  if (stored) {
    return stored;
  }
  const personal = application.personal;
  if (!personal?.dateOfBirth || !personal.gender || !personal.fatherOrSpouseName || !personal.maritalStatus) {
    return 1;
  }
  const address = application.address;
  if (!address?.addressLine1 || !address.city || !address.state || !address.pincode) {
    return 2;
  }
  const identity = application.identity;
  if (!identity?.idDocumentType || (!identity.panLastFour && !identity.aadhaarLastFour)) {
    return 3;
  }
  if (!(application.documents && application.documents.length > 0)) {
    return 5;
  }
  return 6;
}

export function validateKycFile(file: File): string | null {
  if (!ALLOWED_KYC_MIME.includes(file.type as (typeof ALLOWED_KYC_MIME)[number])) {
    return 'Upload a PDF, JPEG, PNG, or WebP file.';
  }
  if (file.size <= 0 || file.size > MAX_KYC_FILE_BYTES) {
    return 'File must be between 1 byte and 5 MB.';
  }
  return null;
}

export function putFileWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error('Could not upload the file to storage'));
    };
    xhr.onerror = () => reject(new Error('Could not upload the file to storage'));
    xhr.send(file);
  });
}
