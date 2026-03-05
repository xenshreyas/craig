import { TranscriptStatus } from '@prisma/client';
import config from 'config';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import { createLogger } from '../logger';
import { prisma } from '../prisma';
import { client as redisClient } from '../redis';
import { enqueueSummary } from '../summary/worker';
import { OpenAIWhisperProvider } from './openaiWhisperProvider';
import { TranscriptionProvider } from './provider';

interface TranscriptConfig {
  enabled: boolean;
  queueKey: string;
  lockTtlS: number;
  popTimeoutS: number;
  model: string;
  maxDurationSec: number;
  maxFileMb: number;
  previewChars: number;
  workerConcurrency: number;
  chunkEnabled: boolean;
  chunkDurationSec: number;
  chunkFormat: string;
  chunkBitrateKbps: number;
  chunkSampleRate: number;
}

const defaultConfig: TranscriptConfig = {
  enabled: true,
  queueKey: 'transcript:queue',
  lockTtlS: 14400,
  popTimeoutS: 5,
  model: 'whisper-1',
  maxDurationSec: 7200,
  maxFileMb: 24,
  previewChars: 1200,
  workerConcurrency: 1,
  chunkEnabled: true,
  chunkDurationSec: 600,
  chunkFormat: 'mp3',
  chunkBitrateKbps: 32,
  chunkSampleRate: 16000
};

const rawTranscriptConfig = config.has('transcript') ? (config.get('transcript') as any) : {};
const transcriptConfig = {
  ...defaultConfig,
  ...rawTranscriptConfig,
  chunkEnabled: rawTranscriptConfig?.chunking?.enabled ?? defaultConfig.chunkEnabled,
  chunkDurationSec: rawTranscriptConfig?.chunking?.durationSec ?? defaultConfig.chunkDurationSec,
  chunkFormat: rawTranscriptConfig?.chunking?.format ?? defaultConfig.chunkFormat,
  chunkBitrateKbps: rawTranscriptConfig?.chunking?.bitrateKbps ?? defaultConfig.chunkBitrateKbps,
  chunkSampleRate: rawTranscriptConfig?.chunking?.sampleRate ?? defaultConfig.chunkSampleRate
};

if (process.env.OPENAI_TRANSCRIPTION_MODEL) transcriptConfig.model = process.env.OPENAI_TRANSCRIPTION_MODEL;
if (process.env.TRANSCRIPT_ENABLED) transcriptConfig.enabled = process.env.TRANSCRIPT_ENABLED === 'true';
if (process.env.TRANSCRIPT_MAX_DURATION_SEC) transcriptConfig.maxDurationSec = Number(process.env.TRANSCRIPT_MAX_DURATION_SEC);
if (process.env.TRANSCRIPT_MAX_FILE_MB) transcriptConfig.maxFileMb = Number(process.env.TRANSCRIPT_MAX_FILE_MB);
if (process.env.TRANSCRIPT_PREVIEW_CHARS) transcriptConfig.previewChars = Number(process.env.TRANSCRIPT_PREVIEW_CHARS);
if (process.env.TRANSCRIPT_WORKER_CONCURRENCY) transcriptConfig.workerConcurrency = Number(process.env.TRANSCRIPT_WORKER_CONCURRENCY);
if (process.env.TRANSCRIPT_CHUNK_ENABLED) transcriptConfig.chunkEnabled = process.env.TRANSCRIPT_CHUNK_ENABLED === 'true';
if (process.env.TRANSCRIPT_CHUNK_DURATION_SEC) transcriptConfig.chunkDurationSec = Number(process.env.TRANSCRIPT_CHUNK_DURATION_SEC);
if (process.env.TRANSCRIPT_CHUNK_FORMAT) transcriptConfig.chunkFormat = process.env.TRANSCRIPT_CHUNK_FORMAT;
if (process.env.TRANSCRIPT_CHUNK_BITRATE_KBPS) transcriptConfig.chunkBitrateKbps = Number(process.env.TRANSCRIPT_CHUNK_BITRATE_KBPS);
if (process.env.TRANSCRIPT_CHUNK_SAMPLE_RATE) transcriptConfig.chunkSampleRate = Number(process.env.TRANSCRIPT_CHUNK_SAMPLE_RATE);
if (!Number.isFinite(transcriptConfig.maxDurationSec) || transcriptConfig.maxDurationSec <= 0) transcriptConfig.maxDurationSec = defaultConfig.maxDurationSec;
if (!Number.isFinite(transcriptConfig.maxFileMb) || transcriptConfig.maxFileMb <= 0) transcriptConfig.maxFileMb = defaultConfig.maxFileMb;
if (!Number.isFinite(transcriptConfig.previewChars) || transcriptConfig.previewChars <= 0) transcriptConfig.previewChars = defaultConfig.previewChars;
if (!Number.isFinite(transcriptConfig.workerConcurrency) || transcriptConfig.workerConcurrency <= 0)
  transcriptConfig.workerConcurrency = defaultConfig.workerConcurrency;
if (!Number.isFinite(transcriptConfig.chunkDurationSec) || transcriptConfig.chunkDurationSec <= 0)
  transcriptConfig.chunkDurationSec = defaultConfig.chunkDurationSec;
if (!Number.isFinite(transcriptConfig.chunkBitrateKbps) || transcriptConfig.chunkBitrateKbps <= 0)
  transcriptConfig.chunkBitrateKbps = defaultConfig.chunkBitrateKbps;
if (!Number.isFinite(transcriptConfig.chunkSampleRate) || transcriptConfig.chunkSampleRate <= 0)
  transcriptConfig.chunkSampleRate = defaultConfig.chunkSampleRate;
transcriptConfig.chunkFormat = transcriptConfig.chunkFormat.toLowerCase();

const logger = createLogger('transcript');
const recPath = config.has('recording.path')
  ? path.join(__dirname, '..', '..', config.get<string>('recording.path'))
  : path.join(__dirname, '..', '..', '..', '..', 'rec');
const cookPath = config.has('cookPath')
  ? path.join(__dirname, '..', '..', config.get<string>('cookPath'))
  : path.join(__dirname, '..', '..', '..', '..', 'cook');

const lockPrefix = 'transcript:lock:';

let workerStarted = false;

export function startTranscriptWorker() {
  if (workerStarted) return;
  workerStarted = true;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!transcriptConfig.enabled) {
    logger.info('Transcript worker disabled.');
    return;
  }
  if (!apiKey) {
    logger.warn('Transcript worker disabled: OPENAI_API_KEY not set.');
    return;
  }

  const provider = new OpenAIWhisperProvider(apiKey);
  logger.info(
    'Transcript worker started. queue=%s model=%s maxDuration=%ds maxFile=%dMB concurrency=%d chunking=%s chunkDuration=%ds chunkFormat=%s chunkBitrate=%dk chunkSampleRate=%d',
    transcriptConfig.queueKey,
    transcriptConfig.model,
    transcriptConfig.maxDurationSec,
    transcriptConfig.maxFileMb,
    transcriptConfig.workerConcurrency,
    transcriptConfig.chunkEnabled ? 'on' : 'off',
    transcriptConfig.chunkDurationSec,
    transcriptConfig.chunkFormat,
    transcriptConfig.chunkBitrateKbps,
    transcriptConfig.chunkSampleRate
  );
  const concurrency = Math.max(1, transcriptConfig.workerConcurrency);
  for (let i = 0; i < concurrency; i++) {
    void runWorkerLoop(provider);
  }
}

async function runWorkerLoop(provider: TranscriptionProvider) {
  for (;;) {
    try {
      const queueItem = await redisClient.blpop(transcriptConfig.queueKey, transcriptConfig.popTimeoutS);
      if (!queueItem) continue;
      const recordingId = queueItem[1];
      await processQueuedRecording(recordingId, provider);
    } catch (err) {
      logger.error('Transcript worker loop error', err);
    }
  }
}

async function processQueuedRecording(recordingId: string, provider: TranscriptionProvider) {
  const lockKey = `${lockPrefix}${recordingId}`;
  const lockToken = randomUUID();
  const hasLock = await redisClient.set(lockKey, lockToken, 'EX', transcriptConfig.lockTtlS, 'NX');
  if (!hasLock) return;

  let tempAudioPath: string | null = null;
  let tempChunkDir: string | null = null;
  const start = Date.now();
  try {
    await ensureTranscriptRow(recordingId);
    const transcript = await prisma.recordingTranscript.findUnique({ where: { recordingId } });
    if (!transcript) return;
    if (transcript.status === TranscriptStatus.COMPLETE || transcript.status === TranscriptStatus.SKIPPED) return;

    const sourceExists = await hasSourceRecording(recordingId);
    if (!sourceExists) {
      await markSkipped(recordingId, 'SOURCE_MISSING', 'Recording source files are unavailable.');
      return;
    }

    const durationSec = await getDurationSec(recordingId);
    if (durationSec > transcriptConfig.maxDurationSec) {
      await markSkipped(
        recordingId,
        'DURATION_LIMIT',
        `Recording duration (${durationSec}s) exceeds limit (${transcriptConfig.maxDurationSec}s).`,
        durationSec
      );
      return;
    }

    await prisma.recordingTranscript.update({
      where: { recordingId },
      data: {
        status: TranscriptStatus.PROCESSING,
        attempts: { increment: 1 },
        provider: 'openai',
        model: transcriptConfig.model,
        startedAt: new Date(),
        completedAt: null,
        errorCode: null,
        errorMessage: null
      }
    });

    tempAudioPath = path.join(tmpdir(), `craig-transcript-${recordingId}-${Date.now()}.flac`);
    await buildMixedAudioFile(recordingId, tempAudioPath);
    const stats = await fsp.stat(tempAudioPath);
    const maxBytes = transcriptConfig.maxFileMb * 1024 * 1024;
    let text = '';
    if (stats.size <= maxBytes) {
      text = await provider.transcribe(tempAudioPath, transcriptConfig.model);
    } else if (!transcriptConfig.chunkEnabled) {
      await markSkipped(
        recordingId,
        'CHUNKING_DISABLED_OVER_LIMIT',
        `Mixed audio size (${stats.size} bytes) exceeds limit (${maxBytes} bytes) and chunking is disabled.`,
        durationSec,
        stats.size
      );
      return;
    } else {
      const chunkResult = await transcribeWithChunking(recordingId, tempAudioPath, provider, transcriptConfig.model, maxBytes);
      tempChunkDir = chunkResult.chunkDir;
      text = chunkResult.text;
    }

    await prisma.recordingTranscript.update({
      where: { recordingId },
      data: {
        status: TranscriptStatus.COMPLETE,
        text,
        preview: text.slice(0, Math.max(1, transcriptConfig.previewChars)),
        durationSec,
        audioBytes: stats.size,
        completedAt: new Date(),
        errorCode: null,
        errorMessage: null
      }
    });
    await enqueueSummary(recordingId).catch((err) => {
      logger.error('Failed to enqueue summary for %s', recordingId, err);
    });
    logger.info('Transcript complete for %s in %dms', recordingId, Date.now() - start);
  } catch (err) {
    const { code, message } = sanitizeError(err);
    await prisma.recordingTranscript
      .update({
        where: { recordingId },
        data: {
          status: TranscriptStatus.ERROR,
          errorCode: code,
          errorMessage: message,
          completedAt: new Date()
        }
      })
      .catch(() => {});
    logger.error(`Transcript failed for ${recordingId} (${code})`, err);
  } finally {
    if (tempAudioPath) await fsp.unlink(tempAudioPath).catch(() => {});
    if (tempChunkDir) await fsp.rm(tempChunkDir, { recursive: true, force: true }).catch(() => {});
    const token = await redisClient.get(lockKey);
    if (token === lockToken) await redisClient.del(lockKey);
  }
}

async function transcribeWithChunking(
  recordingId: string,
  mixedPath: string,
  provider: TranscriptionProvider,
  model: string,
  maxBytes: number
): Promise<{ text: string; chunkDir: string }> {
  const chunkDir = path.join(tmpdir(), `craig-transcript-${recordingId}-${Date.now()}`);
  await fsp.mkdir(chunkDir, { recursive: true });

  const chunkPaths = await transcodeAndSegmentToChunks(mixedPath, chunkDir);
  await validateChunkSizes(chunkPaths, maxBytes);
  const text = await transcribeChunksSequentially(recordingId, chunkPaths, provider, model);
  return { text, chunkDir };
}

async function transcodeAndSegmentToChunks(inputPath: string, outputDir: string) {
  const segmentPattern = path.join(outputDir, `chunk-%04d.${transcriptConfig.chunkFormat}`);
  const ffmpegArgs = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    inputPath,
    '-ac',
    '1',
    '-ar',
    String(transcriptConfig.chunkSampleRate),
    '-b:a',
    `${transcriptConfig.chunkBitrateKbps}k`,
    '-f',
    'segment',
    '-segment_time',
    String(transcriptConfig.chunkDurationSec),
    '-reset_timestamps',
    '1'
  ];

  switch (transcriptConfig.chunkFormat) {
    case 'mp3':
      ffmpegArgs.push('-c:a', 'libmp3lame');
      break;
    case 'aac':
      ffmpegArgs.push('-c:a', 'aac');
      break;
    case 'ogg':
      ffmpegArgs.push('-c:a', 'libvorbis');
      break;
    case 'wav':
      ffmpegArgs.push('-c:a', 'pcm_s16le');
      break;
    default:
      throw new Error(`chunk_segment_failed:Unsupported chunk format "${transcriptConfig.chunkFormat}"`);
  }
  ffmpegArgs.push(segmentPattern);

  const result = await spawnWithOutput('ffmpeg', ffmpegArgs);
  if (result.code !== 0) throw new Error(`chunk_segment_failed:${result.stderr.slice(0, 300)}`);

  const files = await fsp.readdir(outputDir);
  const chunkPaths = files
    .filter((file) => file.endsWith(`.${transcriptConfig.chunkFormat}`))
    .sort()
    .map((file) => path.join(outputDir, file));
  if (!chunkPaths.length) throw new Error('chunk_segment_failed:No chunk files were generated.');
  return chunkPaths;
}

async function validateChunkSizes(chunkPaths: string[], maxBytes: number) {
  for (const chunkPath of chunkPaths) {
    const stats = await fsp.stat(chunkPath);
    if (stats.size > maxBytes) {
      throw new Error(`chunk_too_large:Chunk ${path.basename(chunkPath)} (${stats.size} bytes) exceeds limit (${maxBytes} bytes).`);
    }
  }
}

async function transcribeChunksSequentially(recordingId: string, chunkPaths: string[], provider: TranscriptionProvider, model: string) {
  const chunkTexts: string[] = [];
  for (let i = 0; i < chunkPaths.length; i++) {
    const chunkPath = chunkPaths[i];
    logger.info('Transcribing chunk %d/%d for %s (%s)', i + 1, chunkPaths.length, recordingId, path.basename(chunkPath));
    try {
      const text = await provider.transcribe(chunkPath, model);
      chunkTexts.push(text);
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 300) : 'Unknown chunk transcription error';
      throw new Error(`chunk_transcribe_failed:Chunk ${i + 1}/${chunkPaths.length} failed (${msg})`);
    }
  }
  return chunkTexts
    .map((chunkText) => chunkText.trim())
    .filter((chunkText) => chunkText.length > 0)
    .join('\n\n');
}

async function ensureTranscriptRow(recordingId: string) {
  await prisma.recordingTranscript.upsert({
    where: { recordingId },
    update: {},
    create: {
      recordingId
    }
  });
}

async function hasSourceRecording(recordingId: string) {
  const dataFile = path.join(recPath, `${recordingId}.ogg.data`);
  const infoFile = path.join(recPath, `${recordingId}.ogg.info`);
  return (await fileExists(dataFile)) && (await fileExists(infoFile));
}

async function fileExists(filePath: string) {
  try {
    await fsp.access(filePath);
    return true;
  } catch (err) {
    return false;
  }
}

async function getDurationSec(recordingId: string) {
  const durationPath = path.join(cookPath, 'duration.sh');
  const result = await spawnWithOutput(durationPath, [recordingId]);
  if (result.code !== 0) throw new Error(`duration_failed:${result.stderr.slice(0, 200)}`);
  const parsed = Math.ceil(Number.parseFloat(result.stdout.trim()));
  if (!Number.isFinite(parsed)) throw new Error(`duration_invalid:${result.stdout.trim().slice(0, 120)}`);
  return parsed;
}

async function buildMixedAudioFile(recordingId: string, outputPath: string) {
  const cookingPath = path.join(cookPath, '..', 'cook.sh');
  const child = spawn(cookingPath, [recordingId, 'flac', 'mix'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const writer = fs.createWriteStream(outputPath, { flags: 'w' });
  let stderr = '';

  child.stderr.on('data', (buf: Buffer) => {
    stderr += buf.toString();
  });

  await pipeline(child.stdout, writer);
  const code = await new Promise<number>((resolve) => child.once('close', (exitCode) => resolve(exitCode ?? 0)));
  if (code !== 0) throw new Error(`cook_failed:${stderr.slice(0, 300)}`);
}

async function markSkipped(recordingId: string, errorCode: string, errorMessage: string, durationSec?: number, audioBytes?: number) {
  await prisma.recordingTranscript.update({
    where: { recordingId },
    data: {
      status: TranscriptStatus.SKIPPED,
      errorCode,
      errorMessage: errorMessage.slice(0, 500),
      durationSec,
      audioBytes,
      completedAt: new Date()
    }
  });
  logger.warn('Transcript skipped for %s (%s)', recordingId, errorCode);
}

function sanitizeError(err: unknown) {
  const fallback = { code: 'TRANSCRIPT_ERROR', message: 'Transcript generation failed.' };
  if (err instanceof Error) {
    const raw = err.message || fallback.message;
    const [codePart, messagePart] = raw.split(':', 2);
    const code = codePart ? codePart.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 64) : fallback.code;
    const message = (messagePart || raw).slice(0, 500);
    return { code: code || fallback.code, message: message || fallback.message };
  }
  return fallback;
}

async function spawnWithOutput(cmd: string, args: string[]) {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (buf: Buffer) => {
    stdout += buf.toString();
  });
  child.stderr.on('data', (buf: Buffer) => {
    stderr += buf.toString();
  });

  const code = await new Promise<number>((resolve) => child.once('close', (exitCode) => resolve(exitCode ?? 0)));
  return { code, stdout, stderr };
}
