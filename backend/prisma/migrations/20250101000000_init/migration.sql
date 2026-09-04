-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BORROWER', 'LENDER', 'ADMIN', 'SUPPORT', 'UNDERWRITER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION', 'DELETED', 'LOCKED', 'DORMANT');

-- CreateEnum
CREATE TYPE "KycApplicationStatus" AS ENUM ('NOT_SUBMITTED', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED', 'RESUBMISSION_REQUIRED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KycDocumentType" AS ENUM ('PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'PAN_CARD', 'AADHAAR_CARD', 'UTILITY_BILL', 'BANK_STATEMENT', 'INCOME_PROOF', 'SELFIE', 'OTHERS');

-- CreateEnum
CREATE TYPE "KycDocumentStatus" AS ENUM ('UPLOADED', 'PROCESSED', 'VERIFIED', 'REJECTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "KycVerificationDecision" AS ENUM ('APPROVED', 'REJECTED', 'REQUESTED_MORE_INFO', 'ESCALATED', 'AUTO_ACCEPTED', 'AUTO_REJECTED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CONVERTED', 'EXPIRED', 'CANCELLED', 'DECLINED');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('INCOME', 'AGE', 'CREDIT_SCORE', 'EMPLOYMENT', 'CITY_POSTCODE', 'BANKRUPTCY', 'MAX_DEBT_RATIO', 'MIN_BALANCE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Operator" AS ENUM ('GREATER_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN', 'LESS_THAN_OR_EQUAL', 'EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'BETWEEN', 'CONTAINS', 'EXISTS', 'NOT_EXISTS', 'ANY_OF');

-- CreateEnum
CREATE TYPE "RuleEffect" AS ENUM ('ALLOW', 'BLOCK', 'SOFT_BLOCK');

-- CreateEnum
CREATE TYPE "EligibilityRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING_DEPRECATION', 'FAILED_VALIDATION');

-- CreateEnum
CREATE TYPE "EligibilityRuleVersionStatus" AS ENUM ('DRAFT', 'VALIDATED', 'ACTIVE', 'DEPRECATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EligibilityEvaluationStatus" AS ENUM ('ELIGIBLE', 'INELIGIBLE', 'PENDING', 'ERRORED', 'MANUAL_REVIEW_NEEDED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('DRAFT', 'PENDING_PRE_CHECK', 'PRE_APPROVED', 'RECOMMENDED', 'SUBMITTED', 'UNDERWRITING', 'ELIGIBILITY_IN_PROGRESS', 'APPROVED', 'REJECTED', 'OFFER_ISSUED', 'ACCEPTED', 'AGREEMENT_SIGNED', 'DISBURSED', 'ACTIVE', 'PARTIALLY_PAID', 'CLOSED', 'DEFAULTED', 'WRITTEN_OFF', 'CANCELLED', 'EXPIRED', 'PAUSED');

-- CreateEnum
CREATE TYPE "LoanApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'RE_SENT', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LoanApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'CONDITIONALLY_APPROVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REVERSED', 'REFUNDED', 'SCHEDULED', 'ON_HOLD', 'RECALLED');

-- CreateEnum
CREATE TYPE "DisbursementMethod" AS ENUM ('NEFT', 'IMPS', 'RTGS', 'UPI', 'BANKTRANSFER', 'CHEQUE', 'CASH_SLIP', 'WALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "RepaymentScheduleStatus" AS ENUM ('SCHEDULED', 'PAID', 'PARTIALLY_PAID', 'PAST_DUE', 'DEFAULTED', 'WAIVED', 'CANCELLED', 'RE_SCHEDULED', 'PREPAID', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "RepaymentStatus" AS ENUM ('SCHEDULED', 'PARTIAL_PAYMENT', 'PAID', 'PAST_DUE', 'DEFAULTED', 'WAIVED', 'WRITTEN_OFF', 'OVERPAID', 'REVERSED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'HOLD', 'REVERSED', 'REFUNDED', 'CANCELLED', 'AWAITING_CONFIRMATION', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('LOAN_DISBURSEMENT', 'EMI_REPAYMENT', 'PARTIAL_REPAYMENT', 'PREPAYMENT', 'PENALTY', 'FEES', 'REFUND', 'REVERSAL', 'CHARGEBACK');

-- CreateEnum
CREATE TYPE "PaymentTransactionType" AS ENUM ('PRINCIPAL', 'INTEREST', 'PENALTY', 'PROCESSING_FEE', 'INSURANCE', 'GST_TAX', 'OTHER_CHARGES', 'ADJUSTMENT', 'REVERSAL', 'REFUND');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'NEFT', 'IMPS', 'RTGS', 'CARD', 'NET_BANKING', 'WALLET', 'CASH', 'CHEQUE', 'AUTODEBIT');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('CUSTOMER', 'INTERNAL', 'PLATFORM', 'SYSTEM_ACCOUNT');

-- CreateEnum
CREATE TYPE "LedgerKind" AS ENUM ('PENDING', 'REALISED', 'HOLD', 'UNRECONCILED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "LedgerCategory" AS ENUM ('RECEIVABLE', 'PAYABLE', 'ESCROW_PENDING', 'ESCROW_REALISED_BENEFICIERY', 'FEE_COLLECTION_INTERNAL', 'FEE_COLLECTION_CUSTOMER', 'SETTLEMENT', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'REFUND', 'PAYOUT_COLLECTION', 'BUFFER', 'ADJUSTMENT', 'INTEREST_ACCRUAL', 'PENALTY_ACCRUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'INAPP', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'RETRY', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'ADMIN_NOTIFY');

-- CreateEnum
CREATE TYPE "NotificationPreferenceLevel" AS ENUM ('CHOOSE', 'FORCE_ON', 'FORCE_OFF');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('REFRESH', 'ACCESS', 'MFA', 'OTP', 'ONE_TIME', 'API', 'SSO', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'TWO_FACTOR_AUTH', 'PASSWORD_RESET', 'EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'TRANSACTION_SECURITY', 'KYC', 'OTHER_ADMIN');

-- CreateEnum
CREATE TYPE "OtpVerificationStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED', 'REVERIFIED', 'LOCKED');

-- CreateEnum
CREATE TYPE "MfaType" AS ENUM ('TOTP', 'SMS', 'EMAIL', 'YUBI_KEY', 'BIOMETRIC', 'BACKUP_CODE');

-- CreateEnum
CREATE TYPE "MfaStatus" AS ENUM ('ENABLED', 'DISABLED', 'PENDING_SETUP', 'FALLBACK_ONLY', 'LOCKED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'COMPROMISED', 'LOGGED_OUT', 'SUSPICIOUS', 'TERMINATED');

-- CreateEnum
CREATE TYPE "LedgerEntrySource" AS ENUM ('SYSTEM', 'USER', 'WEBHOOK', 'TWO_LEGGED_FLOW', 'APPROVER');

-- CreateEnum
CREATE TYPE "LedgerEntryDirection" AS ENUM ('INFLOW', 'OUTFLOW', 'NO_MOVEMENT');

-- CreateEnum
CREATE TYPE "AuditLogActionType" AS ENUM ('CREATE', 'UPDATE', 'READ', 'DELETE', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'MFA_ENROLL', 'MFA_CHALLENGE', 'OTP_SENT', 'OTP_VERIFIED', 'OTP_FAILED', 'PASSWORD_CHANGED', 'KYC_SUBMITTED', 'KYC_CREATED', 'KYC_UPDATED', 'KYC_DOCUMENT_UPLOADED', 'KYC_APPROVED', 'KYC_REJECTED', 'LOAN_STATUS_CHANGED', 'LOAN_APPROVAL', 'DISBURSEMENT', 'PAYMENT', 'PAYMENT_FAILED', 'REFERRAL_CREATED', 'REFERRAL_CODE_GENERATED', 'REFERRAL_APPLIED', 'REFERRAL_REJECTED', 'SETTING_CHANGED', 'ADMIN_ACTION', 'IMPERSONATION', 'SECURITY_EVENT', 'API_ACCESS', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isAssignable" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumber" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "photoUrl" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "password_hash" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "referral_code" TEXT,
    "referral_code_created_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "pan_number" TEXT,
    "pan_last_four" TEXT,
    "aadhaar_last_four" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "occupation" TEXT,
    "yearlyIncome" DECIMAL(12,2),
    "riskScore" INTEGER,
    "credit_score" INTEGER,
    "birthDateVerified" BOOLEAN NOT NULL DEFAULT false,
    "hasKycCompleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badge" TEXT,
    "department" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token_sha256" TEXT NOT NULL,
    "tokenType" "TokenType" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_fingerprint" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "channel" "NotificationType" NOT NULL,
    "target" TEXT,
    "status" "OtpVerificationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "cooldownUntil" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_setups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MfaType" NOT NULL,
    "secret_hash" TEXT,
    "recovery_codes_hash" TEXT[],
    "status" "MfaStatus" NOT NULL DEFAULT 'PENDING_SETUP',
    "verifiedAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mfa_setups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "KycApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "referenceCode" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_details" (
    "id" TEXT NOT NULL,
    "kycApplicationId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "fatherOrSpouseName" TEXT,
    "maritalStatus" TEXT,
    "nationality" TEXT DEFAULT 'IN',
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "residenceType" TEXT,
    "panLastFour" TEXT,
    "aadhaarLastFour" TEXT,
    "idDocumentType" TEXT,
    "accountHolderName" TEXT,
    "accountLastFour" TEXT,
    "ifsc" TEXT,
    "bankName" TEXT,
    "accountType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_documents" (
    "id" TEXT NOT NULL,
    "kycApplicationId" TEXT NOT NULL,
    "documentType" "KycDocumentType" NOT NULL,
    "status" "KycDocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "file_storage_key" TEXT NOT NULL,
    "file_url" TEXT,
    "mime_type" TEXT,
    "fileSizeBytes" INTEGER,
    "file_sha256" TEXT,
    "ocr_extracted" JSONB,
    "expiresAt" TIMESTAMP(3),
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replacedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_verification_decisions" (
    "id" TEXT NOT NULL,
    "kycApplicationId" TEXT NOT NULL,
    "documentId" TEXT,
    "decision" "KycVerificationDecision" NOT NULL,
    "reason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DECIMAL(5,2),
    "provider_used" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_verification_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_submission_history" (
    "id" TEXT NOT NULL,
    "kycApplicationId" TEXT NOT NULL,
    "fromStatus" "KycApplicationStatus",
    "toStatus" "KycApplicationStatus" NOT NULL,
    "snapshot" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_submission_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'ACCEPTED',
    "rewardAmount" DECIMAL(12,2),
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "ruleType" "RuleType" NOT NULL,
    "operator" "Operator" NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "status" "EligibilityRuleStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "applied_version_id" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eligibility_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_rule_versions" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "EligibilityRuleVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "ruleJson" JSONB NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "deprecatedAt" TIMESTAMP(3),
    "activatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eligibility_rule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_evaluations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT,
    "ruleVersionId" TEXT,
    "loanProductId" TEXT,
    "loanApplicationId" TEXT,
    "status" "EligibilityEvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "ruleValue" JSONB,
    "matched" BOOLEAN,
    "evaluationMeta" JSONB,
    "snapshotJson" JSONB,
    "scoredResult" DECIMAL(10,4),
    "evaluatedById" TEXT,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eligibility_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minAmount" DECIMAL(12,2) NOT NULL,
    "maxAmount" DECIMAL(12,2) NOT NULL,
    "minTenureMonths" INTEGER NOT NULL,
    "maxTenureMonths" INTEGER NOT NULL,
    "baseInterestRate" DECIMAL(7,4) NOT NULL,
    "processingFeeRate" DECIMAL(7,4) NOT NULL,
    "insuranceRate" DECIMAL(7,4),
    "penaltyRate" DECIMAL(7,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_applications" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loanProductId" TEXT NOT NULL,
    "amountRequested" DECIMAL(12,2) NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "interestRate" DECIMAL(7,4) NOT NULL,
    "processingFee" DECIMAL(12,2) NOT NULL,
    "downPayment" DECIMAL(12,2),
    "status" "LoanApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "currentState" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "metadata" JSONB,
    "ipAddress" TEXT,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "loan_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_application_state_events" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "fromState" TEXT NOT NULL,
    "toState" TEXT NOT NULL,
    "reason" TEXT,
    "changedByUserId" TEXT,
    "changedByAdminId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_application_state_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_approvals" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "decision" "LoanApprovalDecision" NOT NULL,
    "reason" TEXT,
    "approvedAmount" DECIMAL(12,2),
    "approvedTenure" INTEGER,
    "approvedInterest" DECIMAL(7,4),
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "levelApproval" INTEGER NOT NULL DEFAULT 1,
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_disbursements" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "DisbursementMethod" NOT NULL,
    "status" "DisbursementStatus" NOT NULL DEFAULT 'PENDING',
    "tx_ref" TEXT,
    "attemptedAt" TIMESTAMP(3),
    "successAt" TIMESTAMP(3),
    "provider_reference" TEXT,
    "beneficiaryBankName" TEXT,
    "beneficiaryAccount" TEXT,
    "beneficiary_ifsc" TEXT,
    "initiatedBy" TEXT,
    "approvedBy" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentId" TEXT,

    CONSTRAINT "loan_disbursements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repayment_schedules" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "principalPortion" DECIMAL(12,2) NOT NULL,
    "interestPortion" DECIMAL(12,2) NOT NULL,
    "penaltyPortion" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "status" "RepaymentScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repayment_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repayments" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "paymentId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "principalAllocated" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "interestAllocated" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "penaltyAllocated" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "RepaymentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "allocatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repayments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "loanApplicationId" TEXT,
    "userId" TEXT,
    "txRef" TEXT,
    "idempotency_key" TEXT,
    "method" "PaymentMethod" NOT NULL,
    "type" "PaymentType" NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "gateway" TEXT,
    "gatewayRef" TEXT,
    "initiatedById" TEXT,
    "metadata" JSONB,
    "capturedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refusalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" "PaymentTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "direction" "PaymentDirection" NOT NULL,
    "ledgerEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledgers" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "category" "LedgerCategory" NOT NULL,
    "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "userId" TEXT,
    "paymentId" TEXT,
    "entryType" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "category" "LedgerCategory" NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "entrySource" "LedgerEntrySource" NOT NULL DEFAULT 'SYSTEM',
    "direction" "LedgerEntryDirection" NOT NULL DEFAULT 'NO_MOVEMENT',
    "txnSeq" BIGSERIAL NOT NULL,
    "prevEntryHash" TEXT,
    "entryHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleTemplate" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "subjectTemplate" TEXT,
    "channel" "NotificationType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "templateId" TEXT,
    "type" "NotificationType" NOT NULL,
    "event_type" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "title" TEXT,
    "body" TEXT,
    "data" JSONB,
    "channel" "NotificationChannel" NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "error" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "is_admin_actor" BOOLEAN NOT NULL DEFAULT false,
    "actionType" "AuditLogActionType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventCategory" TEXT NOT NULL,
    "changedById" TEXT,
    "changedForUserId" TEXT,
    "severity" "Severity" NOT NULL DEFAULT 'INFO',
    "message" TEXT,
    "diffSummary" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "description" TEXT,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "idx_permission_module_action" ON "permissions"("module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_userId_key" ON "customer_profiles"("userId");

-- CreateIndex
CREATE INDEX "customer_profiles_userId_idx" ON "customer_profiles"("userId");

-- CreateIndex
CREATE INDEX "customer_profiles_pincode_idx" ON "customer_profiles"("pincode");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_userId_key" ON "admin_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_badge_key" ON "admin_users"("badge");

-- CreateIndex
CREATE INDEX "admin_users_department_idx" ON "admin_users"("department");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_sha256_key" ON "sessions"("token_sha256");

-- CreateIndex
CREATE INDEX "sessions_userId_status_idx" ON "sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "otp_requests_userId_purpose_status_idx" ON "otp_requests"("userId", "purpose", "status");

-- CreateIndex
CREATE INDEX "otp_requests_otp_hash_idx" ON "otp_requests"("otp_hash");

-- CreateIndex
CREATE INDEX "otp_requests_expires_at_idx" ON "otp_requests"("expires_at");

-- CreateIndex
CREATE INDEX "mfa_setups_userId_type_status_idx" ON "mfa_setups"("userId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_applications_referenceCode_key" ON "kyc_applications"("referenceCode");

-- CreateIndex
CREATE INDEX "kyc_applications_userId_status_idx" ON "kyc_applications"("userId", "status");

-- CreateIndex
CREATE INDEX "kyc_applications_reviewedBy_idx" ON "kyc_applications"("reviewedBy");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_details_kycApplicationId_key" ON "kyc_details"("kycApplicationId");

-- CreateIndex
CREATE INDEX "kyc_documents_kycApplicationId_documentType_idx" ON "kyc_documents"("kycApplicationId", "documentType");

-- CreateIndex
CREATE INDEX "kyc_documents_file_sha256_idx" ON "kyc_documents"("file_sha256");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_verification_decisions_documentId_key" ON "kyc_verification_decisions"("documentId");

-- CreateIndex
CREATE INDEX "kyc_verification_decisions_kycApplicationId_idx" ON "kyc_verification_decisions"("kycApplicationId");

-- CreateIndex
CREATE INDEX "kyc_submission_history_kycApplicationId_createdAt_idx" ON "kyc_submission_history"("kycApplicationId", "createdAt");

-- CreateIndex
CREATE INDEX "kyc_submission_history_toStatus_idx" ON "kyc_submission_history"("toStatus");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_refereeId_key" ON "referrals"("refereeId");

-- CreateIndex
CREATE INDEX "referrals_referrerId_status_idx" ON "referrals"("referrerId", "status");

-- CreateIndex
CREATE INDEX "referrals_code_idx" ON "referrals"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referrerId_refereeId_key" ON "referrals"("referrerId", "refereeId");

-- CreateIndex
CREATE UNIQUE INDEX "eligibility_rules_name_key" ON "eligibility_rules"("name");

-- CreateIndex
CREATE UNIQUE INDEX "eligibility_rules_key_key" ON "eligibility_rules"("key");

-- CreateIndex
CREATE INDEX "eligibility_rules_status_idx" ON "eligibility_rules"("status");

-- CreateIndex
CREATE INDEX "eligibility_rule_versions_ruleId_status_idx" ON "eligibility_rule_versions"("ruleId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "eligibility_rule_versions_ruleId_version_key" ON "eligibility_rule_versions"("ruleId", "version");

-- CreateIndex
CREATE INDEX "eligibility_evaluations_userId_status_idx" ON "eligibility_evaluations"("userId", "status");

-- CreateIndex
CREATE INDEX "eligibility_evaluations_loanProductId_idx" ON "eligibility_evaluations"("loanProductId");

-- CreateIndex
CREATE INDEX "eligibility_evaluations_loanApplicationId_idx" ON "eligibility_evaluations"("loanApplicationId");

-- CreateIndex
CREATE INDEX "eligibility_evaluations_ruleId_idx" ON "eligibility_evaluations"("ruleId");

-- CreateIndex
CREATE INDEX "eligibility_evaluations_ruleVersionId_idx" ON "eligibility_evaluations"("ruleVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "loan_products_code_key" ON "loan_products"("code");

-- CreateIndex
CREATE INDEX "loan_products_isActive_idx" ON "loan_products"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "loan_applications_applicationNumber_key" ON "loan_applications"("applicationNumber");

-- CreateIndex
CREATE INDEX "loan_applications_userId_status_idx" ON "loan_applications"("userId", "status");

-- CreateIndex
CREATE INDEX "loan_applications_loanProductId_idx" ON "loan_applications"("loanProductId");

-- CreateIndex
CREATE INDEX "loan_applications_status_idx" ON "loan_applications"("status");

-- CreateIndex
CREATE INDEX "loan_applications_applicationNumber_idx" ON "loan_applications"("applicationNumber");

-- CreateIndex
CREATE INDEX "loan_application_state_events_loanApplicationId_createdAt_idx" ON "loan_application_state_events"("loanApplicationId", "createdAt");

-- CreateIndex
CREATE INDEX "loan_approvals_loanApplicationId_idx" ON "loan_approvals"("loanApplicationId");

-- CreateIndex
CREATE INDEX "loan_approvals_approvedById_idx" ON "loan_approvals"("approvedById");

-- CreateIndex
CREATE UNIQUE INDEX "loan_disbursements_tx_ref_key" ON "loan_disbursements"("tx_ref");

-- CreateIndex
CREATE UNIQUE INDEX "loan_disbursements_provider_reference_key" ON "loan_disbursements"("provider_reference");

-- CreateIndex
CREATE UNIQUE INDEX "loan_disbursements_paymentId_key" ON "loan_disbursements"("paymentId");

-- CreateIndex
CREATE INDEX "loan_disbursements_loanApplicationId_status_idx" ON "loan_disbursements"("loanApplicationId", "status");

-- CreateIndex
CREATE INDEX "repayment_schedules_loanApplicationId_status_idx" ON "repayment_schedules"("loanApplicationId", "status");

-- CreateIndex
CREATE INDEX "repayment_schedules_dueDate_idx" ON "repayment_schedules"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "repayment_schedules_loanApplicationId_sequence_key" ON "repayment_schedules"("loanApplicationId", "sequence");

-- CreateIndex
CREATE INDEX "repayments_loanApplicationId_status_idx" ON "repayments"("loanApplicationId", "status");

-- CreateIndex
CREATE INDEX "repayments_scheduleId_idx" ON "repayments"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_externalId_key" ON "payments"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_txRef_key" ON "payments"("txRef");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_loanApplicationId_idx" ON "payments"("loanApplicationId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_capturedAt_idx" ON "payments"("capturedAt");

-- CreateIndex
CREATE INDEX "payments_gatewayRef_idx" ON "payments"("gatewayRef");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_ledgerEntryId_key" ON "payment_transactions"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "payment_transactions_paymentId_idx" ON "payment_transactions"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ledgers_code_key" ON "ledgers"("code");

-- CreateIndex
CREATE INDEX "ledgers_type_category_idx" ON "ledgers"("type", "category");

-- CreateIndex
CREATE INDEX "ledgers_userId_idx" ON "ledgers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_txnSeq_key" ON "ledger_entries"("txnSeq");

-- CreateIndex
CREATE INDEX "ledger_entries_ledgerId_createdAt_idx" ON "ledger_entries"("ledgerId", "createdAt");

-- CreateIndex
CREATE INDEX "ledger_entries_txnSeq_idx" ON "ledger_entries"("txnSeq");

-- CreateIndex
CREATE INDEX "ledger_entries_reference_idx" ON "ledger_entries"("reference");

-- CreateIndex
CREATE INDEX "ledger_entries_userId_idx" ON "ledger_entries"("userId");

-- CreateIndex
CREATE INDEX "ledger_entries_paymentId_idx" ON "ledger_entries"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_slug_key" ON "notification_templates"("slug");

-- CreateIndex
CREATE INDEX "notification_templates_channel_isActive_idx" ON "notification_templates"("channel", "isActive");

-- CreateIndex
CREATE INDEX "notifications_userId_status_idx" ON "notifications"("userId", "status");

-- CreateIndex
CREATE INDEX "notifications_type_status_idx" ON "notifications"("type", "status");

-- CreateIndex
CREATE INDEX "notifications_event_type_idx" ON "notifications"("event_type");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actionType_idx" ON "audit_logs"("actionType");

-- CreateIndex
CREATE INDEX "audit_logs_changedById_idx" ON "audit_logs"("changedById");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "system_settings_scope_idx" ON "system_settings"("scope");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_requests" ADD CONSTRAINT "otp_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_setups" ADD CONSTRAINT "mfa_setups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_applications" ADD CONSTRAINT "kyc_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_details" ADD CONSTRAINT "kyc_details_kycApplicationId_fkey" FOREIGN KEY ("kycApplicationId") REFERENCES "kyc_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_kycApplicationId_fkey" FOREIGN KEY ("kycApplicationId") REFERENCES "kyc_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_verification_decisions" ADD CONSTRAINT "kyc_verification_decisions_kycApplicationId_fkey" FOREIGN KEY ("kycApplicationId") REFERENCES "kyc_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_verification_decisions" ADD CONSTRAINT "kyc_verification_decisions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "kyc_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submission_history" ADD CONSTRAINT "kyc_submission_history_kycApplicationId_fkey" FOREIGN KEY ("kycApplicationId") REFERENCES "kyc_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_rule_versions" ADD CONSTRAINT "eligibility_rule_versions_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "eligibility_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_evaluations" ADD CONSTRAINT "eligibility_evaluations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_evaluations" ADD CONSTRAINT "eligibility_evaluations_loanProductId_fkey" FOREIGN KEY ("loanProductId") REFERENCES "loan_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_evaluations" ADD CONSTRAINT "eligibility_evaluations_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "eligibility_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_evaluations" ADD CONSTRAINT "eligibility_evaluations_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "eligibility_rule_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_evaluations" ADD CONSTRAINT "eligibility_evaluations_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_loanProductId_fkey" FOREIGN KEY ("loanProductId") REFERENCES "loan_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_application_state_events" ADD CONSTRAINT "loan_application_state_events_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_approvals" ADD CONSTRAINT "loan_approvals_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_disbursements" ADD CONSTRAINT "loan_disbursements_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_disbursements" ADD CONSTRAINT "loan_disbursements_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment_schedules" ADD CONSTRAINT "repayment_schedules_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "repayment_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "ledgers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- Immutability triggers for financial and audit tables

CREATE OR REPLACE FUNCTION deny_payment_transaction_modifications()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'payment_transactions is immutable: UPDATE and DELETE operations are not permitted';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deny_payment_transaction_update
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION deny_payment_transaction_modifications();

CREATE TRIGGER trg_deny_payment_transaction_delete
  BEFORE DELETE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION deny_payment_transaction_modifications();

CREATE OR REPLACE FUNCTION deny_ledger_entry_modifications()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is immutable: UPDATE and DELETE operations are not permitted';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deny_ledger_entry_update
  BEFORE UPDATE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION deny_ledger_entry_modifications();

CREATE TRIGGER trg_deny_ledger_entry_delete
  BEFORE DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION deny_ledger_entry_modifications();

CREATE OR REPLACE FUNCTION deny_ledger_balance_direct_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."currentBalance" IS DISTINCT FROM NEW."currentBalance" THEN
    RAISE EXCEPTION 'ledgers.currentBalance cannot be modified directly: use ledger_entries';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deny_ledger_balance_update
  BEFORE UPDATE ON ledgers
  FOR EACH ROW EXECUTE FUNCTION deny_ledger_balance_direct_update();

CREATE OR REPLACE FUNCTION deny_state_event_modifications()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'loan_application_state_events is immutable: cannot update or delete';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deny_state_event_update
  BEFORE UPDATE ON loan_application_state_events
  FOR EACH ROW EXECUTE FUNCTION deny_state_event_modifications();

CREATE TRIGGER trg_deny_state_event_delete
  BEFORE DELETE ON loan_application_state_events
  FOR EACH ROW EXECUTE FUNCTION deny_state_event_modifications();

CREATE OR REPLACE FUNCTION deny_audit_log_modifications()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is immutable: UPDATE and DELETE operations are not permitted';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deny_audit_log_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION deny_audit_log_modifications();

CREATE TRIGGER trg_deny_audit_log_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION deny_audit_log_modifications();

CREATE OR REPLACE FUNCTION deny_kyc_submission_history_modifications()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'kyc_submission_history is immutable: UPDATE and DELETE operations are not permitted';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deny_kyc_submission_history_update
  BEFORE UPDATE ON kyc_submission_history
  FOR EACH ROW EXECUTE FUNCTION deny_kyc_submission_history_modifications();

CREATE TRIGGER trg_deny_kyc_submission_history_delete
  BEFORE DELETE ON kyc_submission_history
  FOR EACH ROW EXECUTE FUNCTION deny_kyc_submission_history_modifications();
