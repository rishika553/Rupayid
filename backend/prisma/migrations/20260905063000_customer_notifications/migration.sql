ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "dedupe_key" TEXT,
  ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "provider_message_id" TEXT,
  ADD COLUMN IF NOT EXISTS "attempt_count" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "notifications_dedupe_key_key"
  ON "notifications"("dedupe_key");

CREATE TABLE IF NOT EXISTS "notification_delivery_attempts" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "provider_message_id" TEXT,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "notification_delivery_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_delivery_attempts_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES "notifications"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_delivery_attempts_notificationId_attemptNumber_key"
  ON "notification_delivery_attempts"("notificationId", "attemptNumber");

CREATE INDEX IF NOT EXISTS "notification_delivery_attempts_status_startedAt_idx"
  ON "notification_delivery_attempts"("status", "startedAt");

INSERT INTO "notification_templates"
  ("id", "slug", "titleTemplate", "bodyTemplate", "channel", "isActive", "createdAt", "updatedAt")
VALUES
  ('tpl-otp-sms', 'otp_sms', 'Your RupayAid OTP', 'Your OTP is {{otp}}. It expires shortly.', 'SMS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-kyc-submitted-inapp', 'kyc_submitted_inapp', 'KYC submitted', 'Your KYC application {{reference}} is under review.', 'INAPP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-kyc-submitted-email', 'kyc_submitted_email', 'KYC submitted', 'Your KYC application {{reference}} is under review.', 'EMAIL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-kyc-approved-inapp', 'kyc_approved_inapp', 'KYC approved', 'Your KYC verification has been approved.', 'INAPP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-kyc-approved-email', 'kyc_approved_email', 'KYC approved', 'Your KYC verification has been approved.', 'EMAIL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-kyc-approved-sms', 'kyc_approved_sms', 'KYC approved', 'Your RupayAid KYC has been approved.', 'SMS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-kyc-rejected-inapp', 'kyc_rejected_inapp', 'KYC needs attention', 'Your KYC was rejected. {{reason}}', 'INAPP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-kyc-rejected-email', 'kyc_rejected_email', 'KYC needs attention', 'Your KYC was rejected. {{reason}}', 'EMAIL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-kyc-rejected-sms', 'kyc_rejected_sms', 'KYC needs attention', 'Your RupayAid KYC needs attention. {{reason}}', 'SMS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-loan-submitted-inapp', 'loan_submitted_inapp', 'Loan application submitted', 'Application {{applicationNumber}} was submitted.', 'INAPP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-loan-submitted-email', 'loan_submitted_email', 'Loan application submitted', 'Application {{applicationNumber}} was submitted.', 'EMAIL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-loan-approved-inapp', 'loan_approved_inapp', 'Loan approved', 'Application {{applicationNumber}} has been approved.', 'INAPP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-loan-approved-email', 'loan_approved_email', 'Loan approved', 'Application {{applicationNumber}} has been approved.', 'EMAIL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-loan-approved-sms', 'loan_approved_sms', 'Loan approved', 'Your RupayAid loan {{applicationNumber}} has been approved.', 'SMS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-loan-rejected-inapp', 'loan_rejected_inapp', 'Loan application update', 'Application {{applicationNumber}} was rejected. {{reason}}', 'INAPP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-loan-rejected-email', 'loan_rejected_email', 'Loan application update', 'Application {{applicationNumber}} was rejected. {{reason}}', 'EMAIL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-disbursement-inapp', 'disbursement_inapp', 'Loan disbursed', '₹{{amount}} has been disbursed for {{applicationNumber}}.', 'INAPP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-disbursement-email', 'disbursement_email', 'Loan disbursed', '₹{{amount}} has been disbursed for {{applicationNumber}}.', 'EMAIL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-disbursement-sms', 'disbursement_sms', 'Loan disbursed', '₹{{amount}} has been disbursed for {{applicationNumber}}.', 'SMS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-repayment-due-inapp', 'repayment_due_inapp', 'Repayment due', 'Installment {{installmentNumber}} of ₹{{amount}} is due on {{dueDate}}.', 'INAPP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-repayment-due-email', 'repayment_due_email', 'Repayment due', 'Installment {{installmentNumber}} of ₹{{amount}} is due on {{dueDate}}.', 'EMAIL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-repayment-due-sms', 'repayment_due_sms', 'Repayment due', 'Your RupayAid installment of ₹{{amount}} is due on {{dueDate}}.', 'SMS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-repayment-success-inapp', 'repayment_successful_inapp', 'Repayment successful', 'We received your repayment of ₹{{amount}}.', 'INAPP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-repayment-success-email', 'repayment_successful_email', 'Repayment successful', 'We received your repayment of ₹{{amount}}.', 'EMAIL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-repayment-success-sms', 'repayment_successful_sms', 'Repayment successful', 'Your RupayAid repayment of ₹{{amount}} was successful.', 'SMS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-payment-failed-inapp', 'payment_failed_inapp', 'Payment failed', 'Your payment of ₹{{amount}} could not be completed.', 'INAPP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-payment-failed-sms', 'payment_failed_sms', 'Payment failed', 'Your RupayAid payment of ₹{{amount}} failed. Please try again.', 'SMS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "titleTemplate" = EXCLUDED."titleTemplate",
  "bodyTemplate" = EXCLUDED."bodyTemplate",
  "channel" = EXCLUDED."channel",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
