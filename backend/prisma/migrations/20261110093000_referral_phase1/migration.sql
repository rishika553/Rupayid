-- Additive: existing sign-up referrals and their statuses are preserved.
ALTER TYPE "ReferralStatus" ADD VALUE IF NOT EXISTS 'CONTACTED';
ALTER TYPE "ReferralStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TABLE "referrals"
  ALTER COLUMN "refereeId" DROP NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'PENDING',
  ADD COLUMN "referredName" TEXT,
  ADD COLUMN "referredPhone" TEXT,
  ADD COLUMN "consentAttestedAt" TIMESTAMP(3),
  ADD COLUMN "consentVersion" TEXT;
CREATE UNIQUE INDEX "referrals_referredPhone_key" ON "referrals"("referredPhone");
CREATE INDEX "referrals_status_createdAt_idx" ON "referrals"("status", "createdAt");
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_contact_details_check" CHECK (
  ("referredPhone" IS NULL AND "refereeId" IS NOT NULL)
  OR ("referredPhone" ~ '^\+91[6-9][0-9]{9}$'
      AND "referredName" IS NOT NULL AND length(trim("referredName")) BETWEEN 2 AND 100
      AND "consentAttestedAt" IS NOT NULL AND "consentVersion" IS NOT NULL)
);
