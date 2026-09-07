export interface CustomerUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  status: string;
  phoneVerified: boolean;
  createdAt?: string;
  roles?: Array<{ role: { name: string } }>;
}

export interface CustomerDashboard {
  customer: {
    firstName: string;
    lastName: string;
    fullName: string;
  };
  kyc: {
    id: string | null;
    status: string;
    actionRequired: boolean;
    actionLabel: string | null;
    actionHref: string;
  };
  loan: {
    currentApplication: {
      id: string;
      applicationNumber: string;
      productName: string;
      status: string;
      requestedAmount: string;
      appliedAt: string;
    } | null;
    activeLoan: {
      id: string;
      applicationNumber: string;
      productName: string;
      status: string;
      approvedAmount: string;
      tenureMonths: number;
      outstandingAmount: string;
    } | null;
  };
  repayment: {
    nextInstallment: {
      installmentNumber: number;
      dueDate: string;
      amountDue: string;
      paymentStatus: string;
    } | null;
  };
  payments: {
    recent: Array<{
      id: string;
      reference: string | null;
      amount: string;
      currency: string;
      method: string;
      type: string;
      status: string;
      createdAt: string;
    }>;
  };
  referral: {
    code: string | null;
    referredCount: number;
    convertedCount: number;
    referredBy: string | null;
  };
  notifications: {
    unreadCount: number;
  };
}

export interface LoanProduct {
  id: string;
  name: string;
  description?: string | null;
  minAmount: number | string;
  maxAmount: number | string;
  minTenureMonths: number;
  maxTenureMonths: number;
  tenureOptions?: number[];
  interest?: {
    annualRate: number | string;
  };
  fees?: {
    processingFeeRate: number | string;
    insuranceRate?: number | string;
    latePaymentRate?: number | string;
  };
  eligibilityRequirements?: string[];
  isActive?: boolean;
  baseInterestRate?: number | string;
  processingFeeRate?: number | string;
}

export interface EligibilityResult {
  reference: string;
  eligible: boolean;
  status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'ADDITIONAL_INFORMATION_REQUIRED';
  category?: string;
  reason?: string;
  eligibleAmount?: string | null;
  availableTenure?: number[] | null;
}

export interface LoanApplication {
  id: string;
  applicationNumber: string;
  userId?: string;
  loanProductId?: string;
  amountRequested: number | string;
  tenureMonths: number;
  interestRate: number | string;
  processingFee: number | string;
  status: string;
  currentState?: string;
  costBreakdown?: {
    amount?: string;
    processingFee?: string;
    estimatedInterest?: string;
    totalPayable?: string;
    interestRate?: string;
    tenureMonths?: number;
  } | null;
  eligibilityReference?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  loanProduct?: LoanProduct;
  timeline?: Array<{ fromState: string; toState: string; reason?: string | null; createdAt: string }>;
}

export type CustomerInstallmentStatus = 'UPCOMING' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export interface CustomerInstallment {
  installmentNumber: number;
  dueDate: string;
  principal: string;
  interest: string;
  fees: string;
  totalDue: string;
  amountPaid: string;
  outstanding: string;
  status: CustomerInstallmentStatus;
}

export interface CustomerRepaymentSchedule {
  loanId: string;
  applicationNumber: string;
  nextPayment: CustomerInstallment | null;
  totals: {
    totalDue: string;
    amountPaid: string;
    outstanding: string;
  };
  installments: CustomerInstallment[];
}

export interface RepaymentScheduleItem {
  id?: string;
  loanApplicationId?: string;
  sequence?: number;
  installmentNumber?: number;
  dueDate: string;
  principalPortion?: number | string;
  interestPortion?: number | string;
  penaltyPortion?: number | string;
  principal?: string;
  interest?: string;
  fees?: string;
  totalDue?: string;
  totalAmount?: number | string;
  paidAmount?: number | string;
  amountPaid?: string;
  outstanding?: string;
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

export interface CustomerLoan {
  id: string;
  applicationNumber: string;
  status: string;
  loanProduct?: { id: string; name: string; description?: string | null } | null;
  approvedAmount: string;
  requestedAmount?: string;
  tenureMonths: number;
  interestRate?: string;
  processingFee?: string;
  applicationDate: string;
  approvalDate?: string | null;
  disbursementDate?: string | null;
  outstandingAmount: string;
  nextRepayment?: {
    dueDate: string;
    amount: string;
    paidAmount?: string;
    status: string;
  } | null;
  schedule?: CustomerInstallment[];
  paymentHistory?: Array<{
    id: string;
    reference?: string | null;
    method: string;
    type: string;
    direction?: string;
    status: string;
    amount: string;
    paidAt: string;
  }>;
  costBreakdown?: LoanApplication['costBreakdown'];
  timeline?: Array<{ fromState: string; toState: string; createdAt: string }>;
}

export interface PaymentRecord {
  id: string;
  txRef?: string | null;
  loanId?: string | null;
  installmentNumber?: number | null;
  method: string;
  type: string;
  status: string;
  amount: number | string;
  currency?: string;
  createdAt: string;
  capturedAt?: string | null;
  checkout?: {
    provider: string;
    orderId: string;
    keyId: string;
    amountMinor: string;
    currency: string;
  } | null;
}

export interface NotificationRecord {
  id: string;
  type: string;
  title?: string | null;
  body?: string | null;
  referenceId?: string | null;
  deliveryStatus: string;
  readAt?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ReferralMe {
  code: string | null;
  codeCreatedAt: string | null;
  invitePath: string | null;
  referredBy: {
    firstName: string;
    lastName: string;
    acceptedAt: string;
    status: string;
  } | null;
  referredCount: number;
  referred: Array<{
    firstName: string;
    lastName: string;
    createdAt: string;
    status: string;
  }>;
}

export interface PaginatedNotifications {
  data: NotificationRecord[];
  unreadCount: number;
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
    reason?: string | null;
  };
}
