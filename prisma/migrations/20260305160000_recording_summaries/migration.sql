CREATE TYPE "SummaryStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE', 'ERROR', 'SKIPPED');

CREATE TABLE "RecordingSummary" (
    "recordingId" TEXT NOT NULL,
    "status" "SummaryStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL DEFAULT 'gpt-5-mini',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "markdown" TEXT,
    "preview" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RecordingSummary_pkey" PRIMARY KEY ("recordingId")
);

ALTER TABLE "RecordingSummary"
ADD CONSTRAINT "RecordingSummary_recordingId_fkey"
FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE CASCADE ON UPDATE CASCADE;
