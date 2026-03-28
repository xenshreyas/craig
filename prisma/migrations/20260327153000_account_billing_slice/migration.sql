ALTER TABLE "User"
ADD COLUMN "aiBillingMonthlyCapUsd" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "Recording"
ADD COLUMN "billingUserId" TEXT;

ALTER TABLE "GuildAiUsageEvent"
ADD COLUMN "billingUserId" TEXT;

UPDATE "Recording" r
SET "billingUserId" = g."ownerUserId"
FROM "Guild" g
WHERE g."id" = r."guildId"
  AND r."billingUserId" IS NULL
  AND g."ownerUserId" IS NOT NULL;

UPDATE "GuildAiUsageEvent" e
SET "billingUserId" = r."billingUserId"
FROM "Recording" r
WHERE r."id" = e."recordingId"
  AND e."billingUserId" IS NULL
  AND r."billingUserId" IS NOT NULL;

CREATE INDEX "GuildAiUsageEvent_billingUserId_createdAt_idx" ON "GuildAiUsageEvent"("billingUserId", "createdAt");
