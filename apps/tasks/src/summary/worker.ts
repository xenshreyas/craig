import { SummaryStatus, TranscriptStatus } from '@prisma/client';
import config from 'config';
import { randomUUID } from 'node:crypto';

import { createLogger } from '../logger';
import { prisma } from '../prisma';
import { client as redisClient } from '../redis';
import { OpenAISummaryProvider } from './openaiSummaryProvider';

interface SummaryConfig {
  enabled: boolean;
  queueKey: string;
  lockTtlS: number;
  popTimeoutS: number;
  model: string;
  previewChars: number;
  workerConcurrency: number;
  maxTranscriptChars: number;
}

const defaultConfig: SummaryConfig = {
  enabled: true,
  queueKey: 'summary:queue',
  lockTtlS: 14400,
  popTimeoutS: 5,
  model: 'gpt-5-mini',
  previewChars: 1200,
  workerConcurrency: 1,
  maxTranscriptChars: 120000
};

const rawSummaryConfig = config.has('summary') ? (config.get('summary') as Partial<SummaryConfig>) : {};
const summaryConfig: SummaryConfig = {
  ...defaultConfig,
  ...rawSummaryConfig
};

if (process.env.SUMMARY_ENABLED) summaryConfig.enabled = process.env.SUMMARY_ENABLED === 'true';
if (process.env.OPENAI_SUMMARY_MODEL) summaryConfig.model = process.env.OPENAI_SUMMARY_MODEL;
if (process.env.SUMMARY_PREVIEW_CHARS) summaryConfig.previewChars = Number(process.env.SUMMARY_PREVIEW_CHARS);
if (process.env.SUMMARY_WORKER_CONCURRENCY) summaryConfig.workerConcurrency = Number(process.env.SUMMARY_WORKER_CONCURRENCY);
if (process.env.SUMMARY_MAX_TRANSCRIPT_CHARS) summaryConfig.maxTranscriptChars = Number(process.env.SUMMARY_MAX_TRANSCRIPT_CHARS);
if (!Number.isFinite(summaryConfig.previewChars) || summaryConfig.previewChars <= 0) summaryConfig.previewChars = defaultConfig.previewChars;
if (!Number.isFinite(summaryConfig.workerConcurrency) || summaryConfig.workerConcurrency <= 0)
  summaryConfig.workerConcurrency = defaultConfig.workerConcurrency;
if (!Number.isFinite(summaryConfig.maxTranscriptChars) || summaryConfig.maxTranscriptChars <= 0)
  summaryConfig.maxTranscriptChars = defaultConfig.maxTranscriptChars;

const logger = createLogger('summary');
const lockPrefix = 'summary:lock:';

let workerStarted = false;

export function getSummaryQueueKey() {
  return summaryConfig.queueKey;
}

export function getSummaryEnqueueKey(recordingId: string) {
  return `summary:enqueued:${recordingId}`;
}

export async function enqueueSummary(recordingId: string): Promise<boolean> {
  const dedupeKey = getSummaryEnqueueKey(recordingId);
  const enqueued = await redisClient.set(dedupeKey, '1', 'EX', 60, 'NX');
  if (!enqueued) return false;
  await redisClient.rpush(summaryConfig.queueKey, recordingId);
  return true;
}

export function startSummaryWorker() {
  if (workerStarted) return;
  workerStarted = true;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!summaryConfig.enabled) {
    logger.info('Summary worker disabled.');
    return;
  }
  if (!apiKey) {
    logger.warn('Summary worker disabled: OPENAI_API_KEY not set.');
    return;
  }

  const provider = new OpenAISummaryProvider(apiKey);
  logger.info(
    'Summary worker started. queue=%s model=%s concurrency=%d maxTranscriptChars=%d',
    summaryConfig.queueKey,
    summaryConfig.model,
    summaryConfig.workerConcurrency,
    summaryConfig.maxTranscriptChars
  );

  const concurrency = Math.max(1, summaryConfig.workerConcurrency);
  for (let i = 0; i < concurrency; i++) {
    void runWorkerLoop(provider);
  }
}

async function runWorkerLoop(provider: OpenAISummaryProvider) {
  for (;;) {
    try {
      const queueItem = await redisClient.blpop(summaryConfig.queueKey, summaryConfig.popTimeoutS);
      if (!queueItem) continue;
      const recordingId = queueItem[1];
      await processQueuedSummary(recordingId, provider);
    } catch (err) {
      logger.error('Summary worker loop error', err);
    }
  }
}

async function processQueuedSummary(recordingId: string, provider: OpenAISummaryProvider) {
  const lockKey = `${lockPrefix}${recordingId}`;
  const lockToken = randomUUID();
  const hasLock = await redisClient.set(lockKey, lockToken, 'EX', summaryConfig.lockTtlS, 'NX');
  if (!hasLock) return;

  const startedAt = Date.now();
  try {
    const recording = await prisma.recording.findUnique({ where: { id: recordingId }, select: { id: true } });
    if (!recording) {
      logger.warn('Summary skipped for %s (RECORDING_MISSING)', recordingId);
      return;
    }

    await ensureSummaryRow(recordingId);
    const summary = await prisma.recordingSummary.findUnique({ where: { recordingId } });
    if (!summary) return;
    if (summary.status === SummaryStatus.COMPLETE || summary.status === SummaryStatus.SKIPPED) {
      return;
    }

    const transcript = await prisma.recordingTranscript.findUnique({ where: { recordingId } });
    if (!transcript || transcript.status !== TranscriptStatus.COMPLETE) {
      await markSkipped(recordingId, 'TRANSCRIPT_NOT_READY', 'Transcript is not complete yet.');
      return;
    }
    if (!transcript.text || !transcript.text.trim()) {
      await markSkipped(recordingId, 'TRANSCRIPT_EMPTY', 'Transcript completed without text.');
      return;
    }

    await prisma.recordingSummary.update({
      where: { recordingId },
      data: {
        status: SummaryStatus.PROCESSING,
        attempts: { increment: 1 },
        provider: 'openai',
        model: summaryConfig.model,
        startedAt: new Date(),
        completedAt: null,
        errorCode: null,
        errorMessage: null
      }
    });

    const promptInput = truncateTranscript(transcript.text);
    const markdown = await provider.summarize(promptInput, summaryConfig.model);
    const normalizedMarkdown = markdown.trim();

    await prisma.recordingSummary.update({
      where: { recordingId },
      data: {
        status: SummaryStatus.COMPLETE,
        markdown: normalizedMarkdown,
        preview: normalizedMarkdown.slice(0, Math.max(1, summaryConfig.previewChars)),
        completedAt: new Date(),
        errorCode: null,
        errorMessage: null
      }
    });

    logger.info('Summary complete for %s in %dms', recordingId, Date.now() - startedAt);
  } catch (err) {
    const { code, message } = sanitizeError(err);
    await prisma.recordingSummary
      .update({
        where: { recordingId },
        data: {
          status: SummaryStatus.ERROR,
          errorCode: code,
          errorMessage: message,
          completedAt: new Date()
        }
      })
      .catch(() => {});
    logger.error(`Summary failed for ${recordingId} (${code})`, err);
  } finally {
    const token = await redisClient.get(lockKey);
    if (token === lockToken) await redisClient.del(lockKey);
  }
}

async function ensureSummaryRow(recordingId: string) {
  await prisma.recordingSummary.upsert({
    where: { recordingId },
    update: {},
    create: {
      recordingId
    }
  });
}

async function markSkipped(recordingId: string, errorCode: string, errorMessage: string) {
  await prisma.recordingSummary.update({
    where: { recordingId },
    data: {
      status: SummaryStatus.SKIPPED,
      errorCode,
      errorMessage: errorMessage.slice(0, 500),
      completedAt: new Date()
    }
  });
  logger.warn('Summary skipped for %s (%s)', recordingId, errorCode);
}

function truncateTranscript(text: string) {
  if (text.length <= summaryConfig.maxTranscriptChars) return text;

  const windowSize = Math.max(1, Math.floor((summaryConfig.maxTranscriptChars - 32) / 2));
  const head = text.slice(0, windowSize).trimEnd();
  const tail = text.slice(-windowSize).trimStart();
  return `${head}\n\n[... transcript truncated ...]\n\n${tail}`;
}

function sanitizeError(err: unknown) {
  const fallback = { code: 'SUMMARY_ERROR', message: 'Summary generation failed.' };
  if (err instanceof Error) {
    const raw = err.message || fallback.message;
    const [codePart, messagePart] = raw.split(':', 2);
    const code = codePart ? codePart.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 64) : fallback.code;
    const message = (messagePart || raw).slice(0, 500);
    return { code: code || fallback.code, message: message || fallback.message };
  }
  return fallback;
}
