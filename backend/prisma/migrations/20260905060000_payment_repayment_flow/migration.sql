-- AlterTable
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "scheduleId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_scheduleId_status_idx" ON "payments"("scheduleId", "status");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_scheduleId_fkey'
  ) THEN
    ALTER TABLE "payments"
      ADD CONSTRAINT "payments_scheduleId_fkey"
      FOREIGN KEY ("scheduleId") REFERENCES "repayment_schedules"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payment_webhook_events_provider_eventId_key" ON "payment_webhook_events"("provider", "eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_webhook_events_paymentId_idx" ON "payment_webhook_events"("paymentId");
