export interface CustomerUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  status: string;
  phoneVerified: boolean;
  createdAt?: string;
}

export interface LoanProduct {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  minAmount: number | string;
  maxAmount: number | string;
  minTenureMonths: number;
  maxTenureMonths: number;
  baseInterestRate: number | string;
  processingFeeRate: number | string;
  isActive?: boolean;
}

export interface LoanApplication {
  id: string;
  applicationNumber: string;
  userId: string;
  loanProductId: string;
  amountRequested: number | string;
  tenureMonths: number;
  interestRate: number | string;
  processingFee: number | string;
  status: string;
  currentState?: string;
  submittedAt?: string | null;
  createdAt: string;
  loanProduct?: LoanProduct;
}

export interface RepaymentScheduleItem {
  id: string;
  loanApplicationId: string;
  sequence: number;
  dueDate: string;
  principalPortion: number | string;
  interestPortion: number | string;
  penaltyPortion: number | string;
  totalAmount: number | string;
  paidAmount: number | string;
  status: string;
}

export interface KycApplication {
  id: string;
  status: string;
  referenceCode?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  personal?: {
    dateOfBirth?: string | null;
    gender?: string | null;
    fatherOrSpouseName?: string | null;
    maritalStatus?: string | null;
    nationality?: string | null;
  } | null;
  address?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    residenceType?: string | null;
  } | null;
  identity?: {
    panLastFour?: string | null;
    aadhaarLastFour?: string | null;
    idDocumentType?: string | null;
  } | null;
  bank?: {
    accountHolderName?: string | null;
    accountLastFour?: string | null;
    ifsc?: string | null;
    bankName?: string | null;
    accountType?: string | null;
  } | null;
  documents?: KycDocument[];
  verificationHistory?: Array<{
    id: string;
    decision: string;
    reason?: string | null;
    reviewedAt?: string;
    createdAt?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface KycStatus {
  status: string;
  exists: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  documentCount: number;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  referenceCode?: string | null;
  reason?: string | null;
}

export interface KycDocument {
  id: string;
  documentType: string;
  status: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  uploadedAt?: string;
}

export interface PaymentRecord {
  id: string;
  txRef?: string | null;
  method: string;
  type: string;
  status: string;
  amount: number | string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  title?: string | null;
  body?: string | null;
  status: string;
  createdAt: string;
}

export interface ReferralMe {
  code: string | null;
  codeCreatedAt: string | null;
  referredBy: {
    firstName: string;
    lastName: string;
    acceptedAt: string;
  } | null;
  referredCount: number;
  referred: Array<{
    id: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    status: string;
  }>;
}

export interface PaginatedNotifications {
  data: NotificationRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerProfile {
  personal: {
    firstName: string;
    lastName: string;
    middleName?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    fatherOrSpouseName?: string | null;
    maritalStatus?: string | null;
    occupation?: string | null;
  };
  contact: {
    phoneNumber?: string | null;
    phoneVerified: boolean;
    email?: string | null;
    emailVerified: boolean;
  };
  address: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    residenceType?: string | null;
  };
  account: {
    status: string;
    referralCode?: string | null;
    memberSince?: string;
    yearlyIncome?: string | null;
    panLastFour?: string | null;
    aadhaarLastFour?: string | null;
    idDocumentType?: string | null;
    accountHolderName?: string | null;
    accountLastFour?: string | null;
    ifsc?: string | null;
    bankName?: string | null;
    accountType?: string | null;
    identityLocked: boolean;
  };
  kyc: {
    status: string;
    completed: boolean;
    canEdit: boolean;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    referenceCode?: string | null;
  };
}

export const MOCK_PRODUCTS: LoanProduct[] = [
  {
    id: 'mock-pl-1l',
    code: 'PL-1L-12M',
    name: 'Personal Loan 1L 12M',
    description: 'Short-tenure personal loan for salaried borrowers.',
    minAmount: 50000,
    maxAmount: 200000,
    minTenureMonths: 6,
    maxTenureMonths: 12,
    baseInterestRate: 0.12,
    processingFeeRate: 0.01,
  },
  {
    id: 'mock-pl-3l',
    code: 'PL-3L-36M',
    name: 'Personal Loan 3L 36M',
    description: 'Longer tenure for larger personal needs.',
    minAmount: 100000,
    maxAmount: 500000,
    minTenureMonths: 12,
    maxTenureMonths: 36,
    baseInterestRate: 0.105,
    processingFeeRate: 0.0075,
  },
];
