import { SummaryPublishStatus, SummaryStatus } from '@prisma/client';

import prisma from '../apps/dashboard/lib/prisma';
import redis from '../apps/dashboard/lib/redis';
import { enqueueSummaryPublish } from '../apps/dashboard/lib/summaryPublish';

const SUMMARY_PUBLISH_QUEUE_KEY = 'summary:publish';

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function main() {
  const guildId = getArg('--guild-id');
  const recordingId = getArg('--recording-id');
  if (!guildId) {
    console.error('Missing required argument: --guild-id');
    process.exit(2);
  }
  if (!recordingId) {
    console.error('Missing required argument: --recording-id');
    process.exit(2);
  }

  if (redis.status !== 'ready') await redis.connect();

  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
    include: { summary: true }
  });
  if (!recording || recording.guildId != guildId || !recording.summary) {
    throw new Error(`Recording ${recordingId} is unavailable for guild ${guildId}`);
  }
  if (recording.summary.status !== SummaryStatus.COMPLETE) {
    throw new Error(`Recording ${recordingId} summary is not complete`);
  }

  await prisma.recordingSummary.update({
    where: { recordingId },
    data: {
      publishStatus: SummaryPublishStatus.READY,
      publishError: null,
      publishedAt: null,
      publishedChannelId: null,
      publishedMessageId: null
    }
  });

  await redis.del(SUMMARY_PUBLISH_QUEUE_KEY);

  await prisma.recordingSummary.update({
    where: { recordingId },
    data: {
      publishStatus: SummaryPublishStatus.PUBLISHING,
      publishError: null
    }
  });

  const enqueueResult = await enqueueSummaryPublish({ recordingId, guildId });
  const queueLength = await redis.llen(SUMMARY_PUBLISH_QUEUE_KEY);
  const payload = await redis.lindex(SUMMARY_PUBLISH_QUEUE_KEY, -1);
  const refreshed = await prisma.recordingSummary.findUnique({
    where: { recordingId },
    select: {
      publishStatus: true,
      publishError: true
    }
  });

  process.stdout.write(
    JSON.stringify({
      recordingId,
      guildId,
      publishStatus: refreshed?.publishStatus ?? null,
      publishError: refreshed?.publishError ?? null,
      enqueueResult,
      queueLength,
      queuedPayload: payload ? JSON.parse(payload) : null
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
    redis.disconnect();
  });
