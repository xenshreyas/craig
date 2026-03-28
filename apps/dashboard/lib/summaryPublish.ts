import redis from './redis';

export const SUMMARY_PUBLISH_QUEUE_KEY = 'summary:publish';

export interface SummaryPublishJob {
  recordingId: string;
  guildId: string;
}

export async function enqueueSummaryPublish(job: SummaryPublishJob) {
  if (redis.status !== 'ready') await redis.connect();
  return await redis.rpush(SUMMARY_PUBLISH_QUEUE_KEY, JSON.stringify(job));
}
