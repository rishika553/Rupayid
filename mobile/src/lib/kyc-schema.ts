import { z } from 'zod';
import type { KycApplication } from '@/types';
import { isoDate } from '@/lib/kyc';

function adultDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return date <= cutoff;
}

export function toTenDigitMobile(value?: string | null) {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export const kycPersonalSchema = z.object({
  phoneNumber: z.string().superRefine((value, ctx) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) { ctx.addIssue({ code: 'custom', message: 'Mobile number is required' }); return; }
    if (digits.length !== 10) { ctx.addIssue({ code: 'custom', message: 'Enter exactly 10 digits' }); return; }
    if (!/^[6-9]\d{9}$/.test(digits)) { ctx.addIssue({ code: 'custom', message: 'Enter a valid 10-digit mobile number' }); }
  }),
  dateOfBirth: z.string().min(1, 'Enter your date of birth').refine(adultDate, 'You must be at least 18 years old'),
  gender: z.string().min(1, 'Select your gender'),
  fatherOrSpouseName: z.string().min(2, 'Enter father or spouse name'),
  maritalStatus: z.string().min(1, 'Select marital status'),
});

export const kycAddressSchema = z.object({
  addressLine1: z.string().min(3, 'Enter address line 1'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'Enter your city'),
  state: z.string().min(2, 'Enter your state'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  residenceType: z.string().min(1, 'Select residence type'),
});

export const kycIdentitySchema = z.object({
  panNumber: z
    .string()
    .min(1, 'PAN is required')
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid 10-character PAN (e.g. ABCDE1234F)'),
  aadhaarNumber: z
    .string()
    .min(1, 'Aadhaar is required')
    .regex(/^\d{12}$/, 'Enter a valid 12-digit Aadhaar number'),
  idDocumentType: z.string().optional(),
});

export const kycBankSchema = z
  .object({
    includeBank: z.boolean(),
    accountHolderName: z.string(),
    accountLastFour: z.string(),
    ifsc: z.string(),
    bankName: z.string(),
    accountType: z.string(),
  })
  .superRefine((v, ctx) => {
    if (!v.includeBank) return;
    if (v.accountHolderName.trim().length < 2) ctx.addIssue({ code: 'custom', path: ['accountHolderName'], message: 'Enter the account holder name' });
    if (!/^\d{9,18}$/.test(v.accountLastFour)) ctx.addIssue({ code: 'custom', path: ['accountLastFour'], message: 'Enter a valid account number (9–18 digits)' });
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(v.ifsc)) ctx.addIssue({ code: 'custom', path: ['ifsc'], message: 'Enter a valid IFSC' });
    if (v.bankName.trim().length < 2) ctx.addIssue({ code: 'custom', path: ['bankName'], message: 'Enter the bank name' });
    if (!v.accountType) ctx.addIssue({ code: 'custom', path: ['accountType'], message: 'Select account type' });
  });

export const kycFormSchema = z.object({
  phoneNumber: z.string(),
  dateOfBirth: z.string(),
  gender: z.string(),
  fatherOrSpouseName: z.string(),
  maritalStatus: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  residenceType: z.string(),
  panNumber: z.string(),
  aadhaarNumber: z.string(),
  idDocumentType: z.string(),
  includeBank: z.boolean(),
  accountHolderName: z.string(),
  accountLastFour: z.string(),
  ifsc: z.string(),
  bankName: z.string(),
  accountType: z.string(),
});

export type KycFormValues = z.infer<typeof kycFormSchema>;

export const KYC_FORM_DEFAULTS: KycFormValues = {
  phoneNumber: '', dateOfBirth: '', gender: '', fatherOrSpouseName: '', maritalStatus: '',
  addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', residenceType: '',
  panNumber: '', aadhaarNumber: '', idDocumentType: '',
  includeBank: false, accountHolderName: '', accountLastFour: '', ifsc: '', bankName: '', accountType: '',
};

export const STEP_SCHEMAS = {
  1: kycPersonalSchema,
  2: kycAddressSchema,
  3: kycIdentitySchema,
  4: kycBankSchema,
} as const;

export function valuesFromKyc(application: KycApplication): KycFormValues {
  const bank = application.bank;
  const hasBank = Boolean(bank?.accountLastFour || bank?.ifsc || bank?.accountHolderName);
  return {
    ...KYC_FORM_DEFAULTS,
    phoneNumber: toTenDigitMobile(application.contact?.phoneNumber),
    dateOfBirth: isoDate(application.personal?.dateOfBirth),
    gender: application.personal?.gender || '',
    fatherOrSpouseName: application.personal?.fatherOrSpouseName || '',
    maritalStatus: application.personal?.maritalStatus || '',
    addressLine1: application.address?.addressLine1 || '',
    addressLine2: application.address?.addressLine2 || '',
    city: application.address?.city || '',
    state: application.address?.state || '',
    pincode: application.address?.pincode || '',
    residenceType: application.address?.residenceType || '',
    panNumber: '',
    aadhaarNumber: '',
    idDocumentType: application.identity?.idDocumentType || 'AADHAAR_CARD',
    includeBank: hasBank,
    accountHolderName: bank?.accountHolderName || '',
    accountLastFour: bank?.accountLastFour || '',
    ifsc: bank?.ifsc || '',
    bankName: bank?.bankName || '',
    accountType: bank?.accountType || '',
  };
}

export function kycPatchBody(values: KycFormValues): Record<string, string> {
  const body: Record<string, string> = {};
  const fields: Array<keyof Omit<KycFormValues, 'includeBank' | 'panNumber' | 'aadhaarNumber'>> = [
    'phoneNumber', 'dateOfBirth', 'gender', 'fatherOrSpouseName', 'maritalStatus',
    'addressLine1', 'addressLine2', 'city', 'state', 'pincode', 'residenceType',
    'idDocumentType',
  ];
  for (const field of fields) {
    const value = values[field];
    if (value.trim()) {
      body[field] = field === 'phoneNumber' ? toTenDigitMobile(value) : value.trim();
    }
  }
  const pan = values.panNumber.trim().toUpperCase();
  if (pan) body.panLastFour = pan.slice(-4);
  const aadhaar = values.aadhaarNumber.replace(/\D/g, '');
  if (aadhaar) body.aadhaarLastFour = aadhaar.slice(-4);
  if (!body.idDocumentType) body.idDocumentType = 'AADHAAR_CARD';
  if (values.includeBank) {
    if (values.accountHolderName.trim()) body.accountHolderName = values.accountHolderName.trim();
    if (values.accountLastFour.trim()) body.accountLastFour = values.accountLastFour.trim();
    if (values.ifsc.trim()) body.ifsc = values.ifsc.trim().toUpperCase();
    if (values.bankName.trim()) body.bankName = values.bankName.trim();
    if (values.accountType.trim()) body.accountType = values.accountType.trim();
  }
  return body;
}
