-- Additive enum value for customer profile audits.
ALTER TYPE "AuditLogActionType" ADD VALUE IF NOT EXISTS 'PROFILE_UPDATED';
