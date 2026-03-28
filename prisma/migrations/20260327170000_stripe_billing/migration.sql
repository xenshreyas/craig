CREATE TYPE "RecordingBillingMode" AS ENUM ('TRIAL', 'PAID');

CREATE TYPE "StripeBillingUsageReportStatus" AS ENUM ('PENDING', 'REPORTED', 'FAILED');

ALTER TABLE "User"
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT,
ADD COLUMN "stripeSubscriptionItemId" TEXT,
ADD COLUMN "stripeSubscriptionStatus" TEXT,
ADD COLUMN "stripeCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Recording"
ADD COLUMN "billingMode" "RecordingBillingMode" NOT NULL DEFAULT 'TRIAL';

CREATE TABLE "StripeBillingUsageReport" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "billingUserId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "providerCostUsdMicros" INTEGER NOT NULL,
    "status" "StripeBillingUsageReportStatus" NOT NULL DEFAULT 'PENDING',
    "stripeSubscriptionItemId" TEXT NOT NULL,
    "reportedAt" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StripeBillingUsageReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeBillingUsageReport_recordingId_key" ON "StripeBillingUsageReport"("recordingId");
CREATE INDEX "StripeBillingUsageReport_billingUserId_createdAt_idx" ON "StripeBillingUsageReport"("billingUserId", "createdAt");
CREATE INDEX "StripeBillingUsageReport_status_updatedAt_idx" ON "StripeBillingUsageReport"("status", "updatedAt");

ALTER TABLE "StripeBillingUsageReport"
ADD CONSTRAINT "StripeBillingUsageReport_recordingId_fkey"
FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE CASCADE ON UPDATE CASCADE;
