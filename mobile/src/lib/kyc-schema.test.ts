import {
  toTenDigitMobile,
  kycPersonalSchema,
  kycAddressSchema,
  kycIdentitySchema,
  kycBankSchema,
  kycPatchBody,
  KYC_FORM_DEFAULTS,
} from './kyc-schema';

describe('toTenDigitMobile', () => {
  it('strips +91', () => {
    expect(toTenDigitMobile('+91 98765 43210')).toBe('9876543210');
  });
  it('strips a leading 0', () => {
    expect(toTenDigitMobile('09876543210')).toBe('9876543210');
  });
  it('returns empty for null', () => {
    expect(toTenDigitMobile(null)).toBe('');
  });
});

describe('kycPersonalSchema', () => {
  const ok = {
    phoneNumber: '9876543210',
    dateOfBirth: '1995-01-01',
    gender: 'female',
    fatherOrSpouseName: 'Ramesh',
    maritalStatus: 'single',
  };
  it('accepts a valid payload', () => {
    expect(kycPersonalSchema.safeParse(ok).success).toBe(true);
  });
  it('rejects a phone starting with 5', () => {
    expect(kycPersonalSchema.safeParse({ ...ok, phoneNumber: '5876543210' }).success).toBe(false);
  });
  it('rejects an under-18 DOB', () => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 10);
    expect(kycPersonalSchema.safeParse({ ...ok, dateOfBirth: d.toISOString().slice(0, 10) }).success).toBe(false);
  });
});

describe('kycAddressSchema', () => {
  it('requires a 6-digit pincode', () => {
    expect(kycAddressSchema.safeParse({
      addressLine1: '123 Main', city: 'Mumbai', state: 'MH', pincode: '40000', residenceType: 'rented',
    }).success).toBe(false);
  });
});

describe('kycIdentitySchema', () => {
  it('rejects an invalid PAN', () => {
    expect(kycIdentitySchema.safeParse({
      panNumber: 'XX123', aadhaarNumber: '123456789012', idDocumentType: 'pan',
    }).success).toBe(false);
  });
  it('accepts a valid PAN + Aadhaar', () => {
    expect(kycIdentitySchema.safeParse({
      panNumber: 'ABCDE1234F', aadhaarNumber: '123456789012', idDocumentType: 'pan',
    }).success).toBe(true);
  });
});

describe('kycBankSchema', () => {
  it('is skipped when includeBank is false', () => {
    const res = kycBankSchema.safeParse({
      includeBank: false, accountHolderName: '', accountLastFour: '', ifsc: '', bankName: '', accountType: '',
    });
    expect(res.success).toBe(true);
  });
  it('requires a valid IFSC when includeBank is true', () => {
    const res = kycBankSchema.safeParse({
      includeBank: true, accountHolderName: 'Asha', accountLastFour: '123456789',
      ifsc: 'bad-ifsc', bankName: 'HDFC', accountType: 'savings',
    });
    expect(res.success).toBe(false);
  });
});

describe('kycPatchBody', () => {
  it('extracts PAN last four and uppercases IFSC', () => {
    const body = kycPatchBody({
      ...KYC_FORM_DEFAULTS,
      phoneNumber: '+91 98765 43210',
      dateOfBirth: '1990-01-01',
      gender: 'female',
      fatherOrSpouseName: 'Rani',
      maritalStatus: 'single',
      addressLine1: '1 MG Rd', city: 'BLR', state: 'KA', pincode: '560001', residenceType: 'owned',
      panNumber: 'abcde1234f', aadhaarNumber: '1234 5678 9012',
      includeBank: true, accountHolderName: 'Asha',
      accountLastFour: '123456789', ifsc: 'hdfc0001234', bankName: 'HDFC', accountType: 'savings',
    });
    expect(body.phoneNumber).toBe('9876543210');
    expect(body.panLastFour).toBe('234F');
    expect(body.aadhaarLastFour).toBe('9012');
    expect(body.ifsc).toBe('HDFC0001234');
    expect(body.idDocumentType).toBe('AADHAAR_CARD');
  });

  it('omits bank fields when includeBank is false', () => {
    const body = kycPatchBody({
      ...KYC_FORM_DEFAULTS,
      phoneNumber: '9876543210', dateOfBirth: '1990-01-01', gender: 'male',
      fatherOrSpouseName: 'R', maritalStatus: 'single',
      addressLine1: '1', city: 'B', state: 'K', pincode: '560001', residenceType: 'owned',
      panNumber: 'ABCDE1234F', aadhaarNumber: '123456789012',
      includeBank: false,
    });
    expect(body.ifsc).toBeUndefined();
    expect(body.accountLastFour).toBeUndefined();
  });
});
