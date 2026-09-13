-- Admin KYC document view audits.
ALTER TYPE "AuditLogActionType" ADD VALUE IF NOT EXISTS 'KYC_DOCUMENT_VIEWED';
