import { TranscriptStatus } from '@prisma/client';

import { prisma } from '../apps/tasks/src/prisma';
import { client as redisClient } from '../apps/tasks/src/redis';
import { enqueueSummary } from '../apps/tasks/src/summary/worker';

async function main() {
  await redisClient.connect();

  const recordings = await prisma.recording.findMany({
    where: {
      transcript: {
        is: {
          status: TranscriptStatus.COMPLETE,
          text: {
            not: null
          }
        }
      },
      summary: null
    },
    select: {
      id: true
    }
  });

  let enqueuedCount = 0;
  let skippedCount = 0;

  for (const recording of recordings) {
    const enqueued = await enqueueSummary(recording.id);
    if (enqueued) enqueuedCount++;
    else skippedCount++;
  }

  console.log(`Scanned ${recordings.length} recordings with completed transcripts and no summary.`);
  console.log(`Enqueued ${enqueuedCount} summary jobs.`);
  console.log(`Skipped ${skippedCount} already-enqueued recordings.`);
}

main()
  .catch(async (err) => {
    console.error('Failed to backfill recording summaries.', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
    redisClient.disconnect();
  });
