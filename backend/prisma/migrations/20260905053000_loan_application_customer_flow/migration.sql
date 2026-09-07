-- Customer loan application states and idempotent drafts.
ALTER TYPE "LoanApplicationStatus" ADD VALUE IF NOT EXISTS 'ELIGIBILITY_CHECK';
ALTER TYPE "LoanApplicationStatus" ADD VALUE IF NOT EXISTS 'DISBURSEMENT_PENDING';
ALTER TYPE "LoanApplicationStatus" ADD VALUE IF NOT EXISTS 'DISBURSED';
ALTER TYPE "LoanApplicationStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "LoanApplicationStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

ALTER TABLE "loan_applications" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "loan_applications" ALTER COLUMN "currentState" SET DEFAULT 'DRAFT';

ALTER TABLE "loan_applications" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "loan_applications_idempotency_key_key" ON "loan_applications"("idempotency_key");
