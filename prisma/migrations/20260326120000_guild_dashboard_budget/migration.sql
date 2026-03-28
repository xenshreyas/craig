ALTER TABLE "Guild"
ADD COLUMN "ownerUserId" TEXT,
ADD COLUMN "linkedAt" TIMESTAMPTZ(6),
ADD COLUMN "name" TEXT,
ADD COLUMN "icon" TEXT;

CREATE TYPE "AiUsageKind" AS ENUM ('TRANSCRIPT', 'SUMMARY');

CREATE TABLE "GuildAiUsageEvent" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "kind" "AiUsageKind" NOT NULL,
    "model" TEXT NOT NULL,
    "costUsdMicros" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildAiUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuildAiUsageEvent_recordingId_kind_key" ON "GuildAiUsageEvent"("recordingId", "kind");
CREATE INDEX "GuildAiUsageEvent_guildId_createdAt_idx" ON "GuildAiUsageEvent"("guildId", "createdAt");

ALTER TABLE "GuildAiUsageEvent"
ADD CONSTRAINT "GuildAiUsageEvent_guildId_fkey"
FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
