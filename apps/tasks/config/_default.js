module.exports = {
  // Redis defaults to the compose service name when running in Docker.
  redis: {
    host: process.env.REDIS_HOST || (process.env.container === 'docker' ? 'redis' : 'localhost'),
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
    keyPrefix: 'craig:'
  },
  // redis: {
  //   host: 'localhost',
  //   port: 6379,
  //   keyPrefix: 'craig:'
  // },

  // For drive upload in Google Drive
  drive: {
    clientId: '',
    clientSecret: ''
  },

  // For drive upload in Microsoft OneDrive
  microsoft: {
    clientId: '',
    clientSecret: '',
    redirect: ''
  },

  // For drive upload in Dropbox
  dropbox: {
    clientId: '',
    clientSecret: '',
    folderName: 'CraigChat'
  },

  // for refresh patrons job
  patreon: {
    campaignId: 0,
    accessToken: '',
    tiers: {},
    skipUsers: []
  },

  downloads: {
    expiration: 24 * 60 * 60 * 1000,
    path: '../download/downloads'
  },

  recording: {
    fallbackExpiration: 24 * 60 * 60 * 1000,
    path: '../../rec',
    skipIds: []
  },

  timezone: 'America/New_York',
  loggerLevel: 'debug',
  tasks: {
    ignore: []
  },

  transcript: {
    enabled: process.env.TRANSCRIPT_ENABLED ? process.env.TRANSCRIPT_ENABLED === 'true' : true,
    queueKey: 'transcript:queue',
    lockTtlS: 14400,
    popTimeoutS: 5,
    model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1',
    maxDurationSec: process.env.TRANSCRIPT_MAX_DURATION_SEC ? Number(process.env.TRANSCRIPT_MAX_DURATION_SEC) : 7200,
    maxFileMb: process.env.TRANSCRIPT_MAX_FILE_MB ? Number(process.env.TRANSCRIPT_MAX_FILE_MB) : 24,
    previewChars: process.env.TRANSCRIPT_PREVIEW_CHARS ? Number(process.env.TRANSCRIPT_PREVIEW_CHARS) : 1200,
    workerConcurrency: process.env.TRANSCRIPT_WORKER_CONCURRENCY ? Number(process.env.TRANSCRIPT_WORKER_CONCURRENCY) : 1,
    chunking: {
      enabled: process.env.TRANSCRIPT_CHUNK_ENABLED ? process.env.TRANSCRIPT_CHUNK_ENABLED === 'true' : true,
      durationSec: process.env.TRANSCRIPT_CHUNK_DURATION_SEC ? Number(process.env.TRANSCRIPT_CHUNK_DURATION_SEC) : 600,
      format: process.env.TRANSCRIPT_CHUNK_FORMAT || 'mp3',
      bitrateKbps: process.env.TRANSCRIPT_CHUNK_BITRATE_KBPS ? Number(process.env.TRANSCRIPT_CHUNK_BITRATE_KBPS) : 32,
      sampleRate: process.env.TRANSCRIPT_CHUNK_SAMPLE_RATE ? Number(process.env.TRANSCRIPT_CHUNK_SAMPLE_RATE) : 16000
    }
  },

  summary: {
    enabled: process.env.SUMMARY_ENABLED ? process.env.SUMMARY_ENABLED === 'true' : true,
    queueKey: 'summary:queue',
    lockTtlS: 14400,
    popTimeoutS: 5,
    model: process.env.OPENAI_SUMMARY_MODEL || 'gpt-5-mini',
    previewChars: process.env.SUMMARY_PREVIEW_CHARS ? Number(process.env.SUMMARY_PREVIEW_CHARS) : 1200,
    workerConcurrency: process.env.SUMMARY_WORKER_CONCURRENCY ? Number(process.env.SUMMARY_WORKER_CONCURRENCY) : 1,
    maxTranscriptChars: process.env.SUMMARY_MAX_TRANSCRIPT_CHARS ? Number(process.env.SUMMARY_MAX_TRANSCRIPT_CHARS) : 120000
  }
};
