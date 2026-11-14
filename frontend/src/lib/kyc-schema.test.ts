import { describe, expect, it } from 'vitest';
import {
  toTenDigitMobile,
  kycPersonalSchema,
  kycAddressSchema,
  kycIdentitySchema,
} from './kyc-schema';

describe('toTenDigitMobile', () => {
  it('strips a +91 country code', () => {
    expect(toTenDigitMobile('+91 98765 43210')).toBe('9876543210');
  });
  it('strips a leading zero on an 11-digit number', () => {
    expect(toTenDigitMobile('09876543210')).toBe('9876543210');
  });
  it('keeps the last 10 digits when longer', () => {
    expect(toTenDigitMobile('009198765432109')).toBe('8765432109');
  });
  it('returns empty for empty input', () => {
    expect(toTenDigitMobile(null)).toBe('');
  });
});

describe('kycPersonalSchema', () => {
  const base = {
    phoneNumber: '9876543210',
    dateOfBirth: '1995-01-01',
    gender: 'male',
    fatherOrSpouseName: 'Ramesh',
    maritalStatus: 'single',
  };

  it('accepts a valid personal payload', () => {
    expect(kycPersonalSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a phone that does not start with 6-9', () => {
    const result = kycPersonalSchema.safeParse({ ...base, phoneNumber: '5876543210' });
    expect(result.success).toBe(false);
  });

  it('rejects a DOB under 18', () => {
    const recent = new Date();
    recent.setFullYear(recent.getFullYear() - 10);
    const iso = recent.toISOString().slice(0, 10);
    const result = kycPersonalSchema.safeParse({ ...base, dateOfBirth: iso });
    expect(result.success).toBe(false);
  });
});

describe('kycAddressSchema', () => {
  it('requires a 6-digit pincode', () => {
    const result = kycAddressSchema.safeParse({
      addressLine1: '123 Main',
      city: 'Mumbai',
      state: 'MH',
      pincode: '40000',
      residenceType: 'rented',
    });
    expect(result.success).toBe(false);
  });
});

describe('kycIdentitySchema', () => {
  it('requires at least PAN or Aadhaar last four', () => {
    const result = kycIdentitySchema.safeParse({
      panLastFour: '',
      aadhaarLastFour: '',
      idDocumentType: 'aadhaar',
    });
    expect(result.success).toBe(false);
  });
  it('accepts just PAN last four', () => {
    const result = kycIdentitySchema.safeParse({
      panLastFour: 'AB12',
      aadhaarLastFour: '',
      idDocumentType: 'pan',
    });
    expect(result.success).toBe(true);
  });
});
