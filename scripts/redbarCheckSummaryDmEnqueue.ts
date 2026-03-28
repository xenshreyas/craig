import { prisma } from '../apps/tasks/src/prisma';
import { client as redisClient } from '../apps/tasks/src/redis';
import { getSummaryNotificationDedupeKey } from '../apps/tasks/src/summary/notifications';
import { enqueueSummaryCompleteNotification } from '../apps/tasks/src/summary/worker';

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function main() {
  const recordingId = getArg('--recording-id');
  if (!recordingId) {
    console.error('Missing required argument: --recording-id');
    process.exit(2);
  }

  await redisClient.del(getSummaryNotificationDedupeKey(recordingId));
  await prisma.recordingSummary.update({
    where: { recordingId },
    data: {
      dmSent: false
    }
  });

  const result = await enqueueSummaryCompleteNotification(recordingId);
  const summary = await prisma.recordingSummary.findUnique({
    where: { recordingId },
    select: {
      dmSent: true
    }
  });

  process.stdout.write(
    JSON.stringify({
      recordingId,
      dmQueued: result.dmQueued,
      dmSent: summary?.dmSent ?? false,
      recipientCount: result.recipientUserIds.length
    })
  );
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    redisClient.disconnect();
  });
