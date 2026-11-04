import type { KycApplication } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const KYC_STEPS = [
  { id: 1, key: 'personal', title: 'Personal' },
  { id: 2, key: 'address', title: 'Address' },
  { id: 3, key: 'identity', title: 'Identity' },
  { id: 4, key: 'bank', title: 'Bank' },
  { id: 5, key: 'documents', title: 'Documents' },
  { id: 6, key: 'review', title: 'Review' },
  { id: 7, key: 'submit', title: 'Submit' },
] as const;

export const KYC_DOCUMENT_TYPES = ['AADHAAR_CARD', 'PAN_CARD'] as const;

export const ALLOWED_KYC_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_KYC_FILE_BYTES = 5 * 1024 * 1024;

export const EDITABLE_KYC_STATUSES = ['DRAFT', 'RESUBMISSION_REQUIRED'] as const;

const KYC_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not started', DRAFT: 'Draft', SUBMITTED: 'Pending', UNDER_REVIEW: 'Pending',
  APPROVED: 'Approved', REJECTED: 'Declined', DECLINED: 'Declined', PENDING: 'Pending',
  RESUBMISSION_REQUIRED: 'Resubmission Required',
};

export function kycStatusLabel(status?: string | null): string {
  if (!status) return 'Draft';
  return KYC_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

export function isKycEditable(status?: string | null): boolean {
  return (EDITABLE_KYC_STATUSES as readonly string[]).includes(status || 'DRAFT');
}

export function isoDate(value?: string | null): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function kycStepStorageKey(applicationId: string) {
  return `rupayaid.kyc.step.${applicationId}`;
}

export async function readStoredKycStep(applicationId: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(kycStepStorageKey(applicationId));
    const step = Number(raw);
    if (!Number.isInteger(step) || step < 1 || step > 7) return null;
    return step;
  } catch {
    return null;
  }
}

export async function writeStoredKycStep(applicationId: string, step: number) {
  try {
    await AsyncStorage.setItem(kycStepStorageKey(applicationId), String(step));
  } catch {
    // Step persistence is best-effort; the server still stores the KYC details.
  }
}

export function latestDecisionReason(application?: KycApplication | null): string | null {
  if (application?.declineReason?.trim()) return application.declineReason.trim();
  const history = application?.verificationHistory || [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const item = history[i];
    if (item.reason && ['REJECTED', 'REQUESTED_MORE_INFO'].includes(item.decision)) return item.reason;
  }
  return null;
}

export function inferKycStep(application: KycApplication): number {
  const personal = application.personal;
  if (!personal?.dateOfBirth || !personal.gender || !personal.fatherOrSpouseName || !personal.maritalStatus) return 1;
  const address = application.address;
  if (!address?.addressLine1 || !address.city || !address.state || !address.pincode) return 2;
  const identity = application.identity;
  if (!identity?.idDocumentType || (!identity.panLastFour && !identity.aadhaarLastFour)) return 3;
  if (!(application.documents && application.documents.length > 0)) return 5;
  return 6;
}
