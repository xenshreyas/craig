CREATE TYPE "SummaryPublishStatus" AS ENUM ('NOT_READY', 'READY', 'PUBLISHING', 'PUBLISHED', 'FAILED');

ALTER TABLE "RecordingSummary"
ADD COLUMN "publishStatus" "SummaryPublishStatus" NOT NULL DEFAULT 'NOT_READY',
ADD COLUMN "publishedAt" TIMESTAMPTZ(6),
ADD COLUMN "publishedChannelId" TEXT,
ADD COLUMN "publishedMessageId" TEXT,
ADD COLUMN "publishError" TEXT;

UPDATE "RecordingSummary"
SET "publishStatus" = 'READY'
WHERE "status" = 'COMPLETE';
