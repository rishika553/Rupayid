-- Additive customer-portal schema completion.
-- Does not drop tables, columns, or enum values.

-- ============================================================================
-- AUTH / PROFILE
-- ============================================================================

ALTER TABLE "customer_profiles" ADD COLUMN IF NOT EXISTS "pan_last_four" TEXT;
ALTER TABLE "customer_profiles" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "customer_profiles_pincode_idx" ON "customer_profiles"("pincode");
CREATE INDEX IF NOT EXISTS "users_deletedAt_idx" ON "users"("deletedAt");

DROP INDEX IF EXISTS "sessions_token_sha256_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_sha256_key" ON "sessions"("token_sha256");

-- ============================================================================
-- KYC SUBMISSION HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS "kyc_submission_history" (
    "id" TEXT NOT NULL,
    "kycApplicationId" TEXT NOT NULL,
    "fromStatus" "KycApplicationStatus",
    "toStatus" "KycApplicationStatus" NOT NULL,
    "snapshot" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_submission_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "kyc_submission_history_kycApplicationId_createdAt_idx"
  ON "kyc_submission_history"("kycApplicationId", "createdAt");
CREATE INDEX IF NOT EXISTS "kyc_submission_history_toStatus_idx"
  ON "kyc_submission_history"("toStatus");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kyc_submission_history_kycApplicationId_fkey'
  ) THEN
    ALTER TABLE "kyc_submission_history"
      ADD CONSTRAINT "kyc_submission_history_kycApplicationId_fkey"
      FOREIGN KEY ("kycApplicationId") REFERENCES "kyc_applications"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION deny_kyc_submission_history_modifications()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'kyc_submission_history is immutable: UPDATE and DELETE operations are not permitted';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deny_kyc_submission_history_update ON "kyc_submission_history";
CREATE TRIGGER trg_deny_kyc_submission_history_update
  BEFORE UPDATE ON "kyc_submission_history"
  FOR EACH ROW EXECUTE FUNCTION deny_kyc_submission_history_modifications();

DROP TRIGGER IF EXISTS trg_deny_kyc_submission_history_delete ON "kyc_submission_history";
CREATE TRIGGER trg_deny_kyc_submission_history_delete
  BEFORE DELETE ON "kyc_submission_history"
  FOR EACH ROW EXECUTE FUNCTION deny_kyc_submission_history_modifications();

CREATE UNIQUE INDEX IF NOT EXISTS "kyc_applications_one_open_per_user"
  ON "kyc_applications" ("userId")
  WHERE status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RESUBMISSION_REQUIRED');

-- ============================================================================
-- REFERRALS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referrals_no_self_referral'
  ) THEN
    ALTER TABLE "referrals"
      ADD CONSTRAINT "referrals_no_self_referral"
      CHECK ("referrerId" <> "refereeId");
  END IF;
END $$;

-- ============================================================================
-- ELIGIBILITY
-- ============================================================================

ALTER TABLE "eligibility_rule_versions" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
UPDATE "eligibility_rule_versions" SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP);
ALTER TABLE "eligibility_rule_versions" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "eligibility_rule_versions" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "eligibility_evaluations" ADD COLUMN IF NOT EXISTS "ruleVersionId" TEXT;
ALTER TABLE "eligibility_evaluations" ADD COLUMN IF NOT EXISTS "loanApplicationId" TEXT;
ALTER TABLE "eligibility_evaluations" ADD COLUMN IF NOT EXISTS "snapshotJson" JSONB;
ALTER TABLE "eligibility_evaluations" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
UPDATE "eligibility_evaluations" SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP);
ALTER TABLE "eligibility_evaluations" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "eligibility_evaluations" ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "eligibility_evaluations_loanApplicationId_idx"
  ON "eligibility_evaluations"("loanApplicationId");
CREATE INDEX IF NOT EXISTS "eligibility_evaluations_ruleVersionId_idx"
  ON "eligibility_evaluations"("ruleVersionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'eligibility_evaluations_ruleVersionId_fkey'
  ) THEN
    ALTER TABLE "eligibility_evaluations"
      ADD CONSTRAINT "eligibility_evaluations_ruleVersionId_fkey"
      FOREIGN KEY ("ruleVersionId") REFERENCES "eligibility_rule_versions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'eligibility_evaluations_loanApplicationId_fkey'
  ) THEN
    ALTER TABLE "eligibility_evaluations"
      ADD CONSTRAINT "eligibility_evaluations_loanApplicationId_fkey"
      FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- DISBURSEMENT / REPAYMENT / PAYMENTS
-- ============================================================================

ALTER TABLE "loan_disbursements" ADD COLUMN IF NOT EXISTS "tx_ref" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "loan_disbursements_tx_ref_key" ON "loan_disbursements"("tx_ref");
CREATE UNIQUE INDEX IF NOT EXISTS "loan_disbursements_provider_reference_key"
  ON "loan_disbursements"("provider_reference");

ALTER TABLE "repayment_schedules" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_key_key" ON "payments"("idempotency_key");
CREATE INDEX IF NOT EXISTS "payments_gatewayRef_idx" ON "payments"("gatewayRef");

-- ============================================================================
-- LEDGER (customer-scoped references)
-- ============================================================================

ALTER TABLE "ledgers" ADD COLUMN IF NOT EXISTS "userId" TEXT;
CREATE INDEX IF NOT EXISTS "ledgers_userId_idx" ON "ledgers"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ledgers_user_category_unique"
  ON "ledgers"("userId", "category")
  WHERE "userId" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ledgers_userId_fkey'
  ) THEN
    ALTER TABLE "ledgers"
      ADD CONSTRAINT "ledgers_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ledger_entries" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "ledger_entries" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;
CREATE INDEX IF NOT EXISTS "ledger_entries_userId_idx" ON "ledger_entries"("userId");
CREATE INDEX IF NOT EXISTS "ledger_entries_paymentId_idx" ON "ledger_entries"("paymentId");

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "event_type" TEXT;
CREATE INDEX IF NOT EXISTS "notifications_event_type_idx" ON "notifications"("event_type");
