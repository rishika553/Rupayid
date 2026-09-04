import { z } from 'zod';
import type { KycApplication } from '@/lib/types';
import { isoDate } from '@/lib/kyc';

function adultDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return date <= cutoff;
}

export const kycPersonalSchema = z.object({
  dateOfBirth: z
    .string()
    .min(1, 'Enter your date of birth')
    .refine(adultDate, 'You must be at least 18 years old'),
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

export const kycIdentitySchema = z
  .object({
    panLastFour: z.string().regex(/^[A-Za-z0-9]{4}$|^$/, 'Enter the last 4 characters of PAN'),
    aadhaarLastFour: z.string().regex(/^\d{4}$|^$/, 'Enter the last 4 digits of Aadhaar'),
    idDocumentType: z.string().min(1, 'Select the ID you will upload'),
  })
  .refine((value) => Boolean(value.panLastFour || value.aadhaarLastFour), {
    message: 'Provide PAN last 4 or Aadhaar last 4',
    path: ['aadhaarLastFour'],
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
  .superRefine((value, ctx) => {
    if (!value.includeBank) {
      return;
    }
    if (value.accountHolderName.trim().length < 2) {
      ctx.addIssue({ code: 'custom', path: ['accountHolderName'], message: 'Enter the account holder name' });
    }
    if (!/^\d{4}$/.test(value.accountLastFour)) {
      ctx.addIssue({ code: 'custom', path: ['accountLastFour'], message: 'Enter the last 4 digits of the account' });
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(value.ifsc)) {
      ctx.addIssue({ code: 'custom', path: ['ifsc'], message: 'Enter a valid IFSC' });
    }
    if (value.bankName.trim().length < 2) {
      ctx.addIssue({ code: 'custom', path: ['bankName'], message: 'Enter the bank name' });
    }
    if (!value.accountType) {
      ctx.addIssue({ code: 'custom', path: ['accountType'], message: 'Select account type' });
    }
  });

export const kycFormSchema = z.object({
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
  panLastFour: z.string(),
  aadhaarLastFour: z.string(),
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
  dateOfBirth: '',
  gender: '',
  fatherOrSpouseName: '',
  maritalStatus: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  residenceType: '',
  panLastFour: '',
  aadhaarLastFour: '',
  idDocumentType: '',
  includeBank: false,
  accountHolderName: '',
  accountLastFour: '',
  ifsc: '',
  bankName: '',
  accountType: '',
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
    panLastFour: application.identity?.panLastFour || '',
    aadhaarLastFour: application.identity?.aadhaarLastFour || '',
    idDocumentType: application.identity?.idDocumentType || '',
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
  const fields: Array<keyof Omit<KycFormValues, 'includeBank'>> = [
    'dateOfBirth',
    'gender',
    'fatherOrSpouseName',
    'maritalStatus',
    'addressLine1',
    'addressLine2',
    'city',
    'state',
    'pincode',
    'residenceType',
    'panLastFour',
    'aadhaarLastFour',
    'idDocumentType',
  ];
  for (const field of fields) {
    const value = values[field];
    if (value.trim()) {
      body[field] = value.trim();
    }
  }
  if (values.includeBank) {
    if (values.accountHolderName.trim()) body.accountHolderName = values.accountHolderName.trim();
    if (values.accountLastFour.trim()) body.accountLastFour = values.accountLastFour.trim();
    if (values.ifsc.trim()) body.ifsc = values.ifsc.trim().toUpperCase();
    if (values.bankName.trim()) body.bankName = values.bankName.trim();
    if (values.accountType.trim()) body.accountType = values.accountType.trim();
  }
  return body;
}
