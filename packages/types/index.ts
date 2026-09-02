// ============================================================================
// Enums (mirrors Prisma schema — these are the frontend-readable versions)
// ============================================================================

export const UserRole = {
  BORROWER: 'BORROWER',
  LENDER: 'LENDER',
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
  UNDERWRITER: 'UNDERWRITER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BANNED: 'BANNED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  DELETED: 'DELETED',
  LOCKED: 'LOCKED',
  DORMANT: 'DORMANT',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const KycApplicationStatus = {
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  MORE_INFO_REQUIRED: 'MORE_INFO_REQUIRED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type KycApplicationStatus = (typeof KycApplicationStatus)[keyof typeof KycApplicationStatus];

export const LoanApplicationStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
  RE_SENT: 'RE_SENT',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;
export type LoanApplicationStatus =
  (typeof LoanApplicationStatus)[keyof typeof LoanApplicationStatus];

export const PaymentStatus = {
  INITIATED: 'INITIATED',
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  HOLD: 'HOLD',
  REVERSED: 'REVERSED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

// ============================================================================
// User types
// ============================================================================

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified: boolean;
  firstName: string;
  lastName: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CustomerProfile {
  id: string;
  userId: string;
  city?: string;
  state?: string;
  yearlyIncome?: number;
  occupation?: string;
  riskScore?: number;
  creditScore?: number;
}

// ============================================================================
// API Response types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Auth types
// ============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

// ============================================================================
// Loan types
// ============================================================================

export interface LoanProduct {
  id: string;
  code: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  baseInterestRate: number;
  processingFeeRate: number;
}

export interface LoanApplication {
  id: string;
  applicationNumber: string;
  userId: string;
  loanProductId: string;
  amountRequested: number;
  tenureMonths: number;
  interestRate: number;
  processingFee: number;
  status: LoanApplicationStatus;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Common utility types
// ============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
