import { client as redisClient } from '../redis';

const SUMMARY_NOTIFICATION_QUEUE_KEY = 'summary:notifications';
const SUMMARY_NOTIFICATION_DEDUPE_TTL_S = 60 * 60 * 24 * 30;

export type SummaryNotificationJob =
  | {
      status: 'COMPLETE';
      recordingId: string;
      recipientUserIds: string[];
      accessKey: string;
      summaryMarkdown: string;
    }
  | {
      status: 'ERROR';
      recordingId: string;
      recipientUserIds: string[];
    }
  | {
      status: 'SKIPPED';
      reason: 'BUDGET_CAP_REACHED';
      recordingId: string;
      recipientUserIds: string[];
    };

export function getSummaryNotificationQueueKey() {
  return SUMMARY_NOTIFICATION_QUEUE_KEY;
}

export function getSummaryNotificationDedupeKey(recordingId: string) {
  return `summary:notification:${recordingId}`;
}

export async function enqueueSummaryNotification(job: SummaryNotificationJob): Promise<boolean> {
  const dedupeKey = getSummaryNotificationDedupeKey(job.recordingId);
  const claimed = await redisClient.set(dedupeKey, '1', 'EX', SUMMARY_NOTIFICATION_DEDUPE_TTL_S, 'NX');
  if (!claimed) return false;

  try {
    await redisClient.rpush(SUMMARY_NOTIFICATION_QUEUE_KEY, JSON.stringify(job));
    return true;
  } catch (err) {
    await redisClient.del(dedupeKey).catch(() => {});
    throw err;
  }
}
