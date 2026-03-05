import { captureException, withScope } from '@sentry/node';
import { RouteOptions } from 'fastify';

import { clearDownload, getDownload } from '../cache';
import { onCookRun, onRequest } from '../influx';
import { ErrorCode } from '../util';
import {
  allowedAvatarFormats,
  allowedContainers,
  allowedFormats,
  cook,
  cookAvatars,
  getDuration,
  getNotes,
  getReady,
  rawPartwise
} from '../util/cook';
import { removeFile, writeToFile } from '../util/download';
import {
  getRecordingAccess,
  getRecordingPageInfo,
  getUsers,
  readPersistedDuration,
  readPersistedNotes,
  recordingAccessKeyMatches,
  writePersistedDuration,
  writePersistedNotes
} from '../util/recording';

async function getAuthorizedPageInfo(id: string, key: string) {
  const recording = await getRecordingAccess(id);
  if (!recording) return { error: 'not_found' as const, recording: null, info: null };
  if (!recordingAccessKeyMatches(recording, key)) return { error: 'invalid_key' as const, recording: null, info: null };

  const info = await getRecordingPageInfo(id);
  if (!info) return { error: 'not_found' as const, recording: null, info: null };

  return { error: null, recording, info };
}

export const durationRoute: RouteOptions = {
  method: 'GET',
  url: '/api/recording/:id/duration',
  handler: async (request, reply) => {
    const { id } = request.params as Record<string, string>;
    if (!id) return reply.status(400).send({ ok: false, error: 'Invalid ID', code: ErrorCode.INVALID_ID });
    const { key } = request.query as Record<string, string>;
    if (!key) return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });

    const pageData = await getAuthorizedPageInfo(id, key);
    if (pageData.error === 'not_found') return reply.status(404).send({ ok: false, error: 'Recording not found', code: ErrorCode.RECORDING_NOT_FOUND });
    if (pageData.error === 'invalid_key') return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });
    onRequest(id);

    try {
      const persistedDuration = await readPersistedDuration(id);
      if (persistedDuration !== null) return reply.status(200).send({ ok: true, duration: persistedDuration });
      if (!pageData.info.audioAvailable)
        return reply.status(409).send({
          ok: false,
          error: 'Recording audio has expired and duration is unavailable.',
          code: ErrorCode.RECORDING_AUDIO_EXPIRED
        });

      const duration = await getDuration(id);
      await writePersistedDuration(id, duration).catch(() => {});
      return reply.status(200).send({ ok: true, duration });
    } catch (err) {
      withScope((scope) => {
        scope.setTag('recordingID', id);
        captureException(err);
      });
      return reply.status(500).send({ ok: false, error: err.message });
    }
  }
};

export const notesRoute: RouteOptions = {
  method: 'GET',
  url: '/api/recording/:id/notes',
  handler: async (request, reply) => {
    const { id } = request.params as Record<string, string>;
    if (!id) return reply.status(400).send({ ok: false, error: 'Invalid ID', code: ErrorCode.INVALID_ID });
    const { key } = request.query as Record<string, string>;
    if (!key) return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });

    const pageData = await getAuthorizedPageInfo(id, key);
    if (pageData.error === 'not_found') return reply.status(404).send({ ok: false, error: 'Recording not found', code: ErrorCode.RECORDING_NOT_FOUND });
    if (pageData.error === 'invalid_key') return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });
    onRequest(id);

    try {
      const persistedNotes = await readPersistedNotes(id);
      if (persistedNotes) return reply.status(200).send({ ok: true, notes: persistedNotes });
      if (!pageData.info.audioAvailable)
        return reply.status(409).send({
          ok: false,
          error: 'Recording audio has expired and notes are unavailable.',
          code: ErrorCode.RECORDING_AUDIO_EXPIRED
        });

      const notes = await getNotes(id);
      await writePersistedNotes(id, notes).catch(() => {});
      return reply.status(200).send({ ok: true, notes });
    } catch (err) {
      withScope((scope) => {
        scope.setTag('recordingID', id);
        captureException(err);
      });
      return reply.status(500).send({ ok: false, error: err.message });
    }
  }
};

export const ennuizelRoute: RouteOptions = {
  method: 'GET',
  url: '/api/recording/:id/ennuizel',
  handler: async (request, reply) => {
    const { id } = request.params as Record<string, string>;
    if (!id) return reply.status(400).send({ ok: false, error: 'Invalid ID', code: ErrorCode.INVALID_ID });
    const { key, track } = request.query as Record<string, string>;
    if (!key) return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });
    if (!track) return reply.status(400).send({ ok: false, error: 'Invalid track', code: ErrorCode.INVALID_TRACK });
    const pageData = await getAuthorizedPageInfo(id, key);
    if (pageData.error === 'not_found') return reply.status(404).send({ ok: false, error: 'Recording not found', code: ErrorCode.RECORDING_NOT_FOUND });
    if (pageData.error === 'invalid_key') return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });
    if (!pageData.info.audioAvailable)
      return reply.status(410).send({ ok: false, error: 'Recording audio has expired.', code: ErrorCode.RECORDING_AUDIO_EXPIRED });
    onRequest(id);

    const trackNum = parseInt(track, 10);
    if (isNaN(trackNum) || trackNum <= 0) return reply.status(400).send({ ok: false, error: 'Invalid track', code: ErrorCode.INVALID_TRACK });

    const users = await getUsers(id);
    if (!users[trackNum - 1]) return reply.status(400).send({ ok: false, error: 'Invalid track', code: ErrorCode.INVALID_TRACK });

    try {
      const stream = rawPartwise(id, trackNum);
      return reply.status(200).send(stream);
    } catch (err) {
      withScope((scope) => {
        scope.setTag('recordingID', id);
        scope.setExtra('trackNum', trackNum);
        captureException(err);
      });
      return reply.status(500).send({ ok: false, error: err.message });
    }
  }
};

export const getRoute: RouteOptions = {
  method: 'GET',
  url: '/api/recording/:id/cook',
  config: {
    rateLimit: {
      max: 100,
      timeWindow: '1 minute'
    }
  },
  handler: async (request, reply) => {
    const { id } = request.params as Record<string, string>;
    if (!id) return reply.status(400).send({ ok: false, error: 'Invalid ID', code: ErrorCode.INVALID_ID });
    const { key } = request.query as Record<string, string>;
    if (!key) return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });

    const pageData = await getAuthorizedPageInfo(id, key);
    if (pageData.error === 'not_found') return reply.status(404).send({ ok: false, error: 'Recording not found', code: ErrorCode.RECORDING_NOT_FOUND });
    if (pageData.error === 'invalid_key') return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });
    if (!pageData.info.audioAvailable)
      return reply.status(410).send({ ok: false, error: 'Recording audio has expired.', code: ErrorCode.RECORDING_AUDIO_EXPIRED });
    onRequest(id, true);

    try {
      const ready = await getReady(id);
      const download = await getDownload(id);
      return reply.status(200).send({ ok: true, ready: ready === true, ...(ready !== true ? ready : {}), download });
    } catch (err) {
      withScope((scope) => {
        scope.setTag('recordingID', id);
        captureException(err);
      });
      return reply.status(500).send({ ok: false, error: err.message });
    }
  }
};

export const postRoute: RouteOptions = {
  method: 'POST',
  url: '/api/recording/:id/cook',
  handler: async (request, reply) => {
    const { id } = request.params as Record<string, string>;
    if (!id) return reply.status(400).send({ ok: false, error: 'Invalid ID', code: ErrorCode.INVALID_ID });
    const { key } = request.query as Record<string, string>;
    if (!key) return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });

    const pageData = await getAuthorizedPageInfo(id, key);
    if (pageData.error === 'not_found') return reply.status(404).send({ ok: false, error: 'Recording not found', code: ErrorCode.RECORDING_NOT_FOUND });
    if (pageData.error === 'invalid_key') return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });
    if (!pageData.info.audioAvailable)
      return reply.status(410).send({ ok: false, error: 'Recording audio has expired.', code: ErrorCode.RECORDING_AUDIO_EXPIRED });
    onRequest(id);

    const ready = await getReady(id);
    if (ready !== true)
      return reply.status(429).send({ ok: false, error: 'This recording is already being processed', code: ErrorCode.RECORDING_NOT_READY });

    const body = request.body as { format?: string; container?: string; dynaudnorm?: boolean };
    if (body.format && !allowedFormats.includes(body.format))
      return reply.status(400).send({ ok: false, error: 'Invalid format', code: ErrorCode.INVALID_FORMAT });
    if (body.format === 'mp3' && !pageData.info.features.mp3)
      return reply.status(403).send({ ok: false, error: 'This recording is missing the MP3 feature', code: ErrorCode.MISSING_MP3 });
    const format = body.format || 'flac';

    if (body.container && !Object.keys(allowedContainers).includes(body.container))
      return reply.status(400).send({ ok: false, error: 'Invalid container', code: ErrorCode.INVALID_CONTAINER });
    if (body.container === 'mix' && !pageData.info.features.mix)
      return reply.status(403).send({ ok: false, error: 'This recording is missing the mix feature', code: ErrorCode.MISSING_MIX });
    const container = body.container || 'zip';

    const dynaudnorm = Boolean(body.dynaudnorm);

    const download = await getDownload(id);
    if (download) {
      await clearDownload(id);
      await removeFile(download.file);
    }

    try {
      onCookRun(id, `${format}.${container}${dynaudnorm ? ':dynaudnorm' : ''}`);
      let ext = allowedContainers[container].ext || `${format}.zip`;
      if (container === 'mix') ext = format === 'vorbis' ? 'ogg' : format;
      // const mime = allowedContainers[container].mime || 'application/zip';

      const stream = await cook(id, format, container, dynaudnorm);
      await writeToFile(stream, id, ext, format, container, dynaudnorm);
      return reply.status(200).send({ ok: true });
    } catch (err) {
      withScope((scope) => {
        scope.setTag('recordingID', id);
        scope.setTag('format', `${format}.${container}${dynaudnorm ? ':dynaudnorm' : ''}`);
        captureException(err);
      });
      return reply.status(500).send({ ok: false, error: err.message });
    }
  }
};

export const avatarRoute: RouteOptions = {
  method: 'POST',
  url: '/api/recording/:id/cook/avatars',
  handler: async (request, reply) => {
    const { id } = request.params as Record<string, string>;
    if (!id) return reply.status(400).send({ ok: false, error: 'Invalid ID', code: ErrorCode.INVALID_ID });
    const { key } = request.query as Record<string, string>;
    if (!key) return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });

    const pageData = await getAuthorizedPageInfo(id, key);
    if (pageData.error === 'not_found') return reply.status(404).send({ ok: false, error: 'Recording not found', code: ErrorCode.RECORDING_NOT_FOUND });
    if (pageData.error === 'invalid_key') return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });
    if (!pageData.info.audioAvailable)
      return reply.status(410).send({ ok: false, error: 'Recording audio has expired.', code: ErrorCode.RECORDING_AUDIO_EXPIRED });
    onRequest(id);

    const ready = await getReady(id);
    if (!ready) return reply.status(429).send({ ok: false, error: 'This recording is already being processed', code: ErrorCode.RECORDING_NOT_READY });

    const body = request.body as {
      format?: string;
      container?: string;
      transparent?: boolean;
      bg?: string;
      fg?: string;
    };

    if (((body.format && body.format !== 'png') || body.container === 'exe') && !pageData.info.features.glowers)
      return reply.status(403).send({ ok: false, error: 'This recording is missing the glowers feature', code: ErrorCode.MISSING_GLOWERS });
    if (body.format && !allowedAvatarFormats.includes(body.format))
      return reply.status(400).send({ ok: false, error: 'Invalid format', code: ErrorCode.INVALID_FORMAT });
    const format = body.format || 'png';

    if (body.container && body.container !== 'exe' && body.container !== 'zip')
      return reply.status(400).send({ ok: false, error: 'Invalid container', code: ErrorCode.INVALID_CONTAINER });
    if (body.container === 'exe' && !['movsfx', 'movpngsfx'].includes(format))
      return reply.status(400).send({ ok: false, error: 'Invalid container', code: ErrorCode.INVALID_CONTAINER });
    const container = body.container || (format === 'movsfx' || format === 'movpngsfx' ? 'exe' : 'zip');

    const transparent = Boolean(body.transparent);

    if (body.bg && !/^[a-f0-9]{6}$/.exec(body.bg))
      return reply.status(400).send({ ok: false, error: 'Invalid background color', code: ErrorCode.INVALID_BG });
    const bg = body.bg || '000000';

    if (body.fg && !/^[a-f0-9]{6}$/.exec(body.fg))
      return reply.status(400).send({ ok: false, error: 'Invalid foreground color', code: ErrorCode.INVALID_FG });
    const fg = body.fg || '008000';

    // sanity checks
    if (format === 'png' && container !== 'zip')
      return reply.status(400).send({
        ok: false,
        error: 'PNG format cannot use containers other than ZIP',
        code: ErrorCode.PNG_FORMAT_MISMATCH
      });

    const download = await getDownload(id);
    if (download) {
      await clearDownload(id);
      await removeFile(download.file);
    }

    try {
      onCookRun(id, `avatar:${format}.${container}`);
      const ext = container === 'exe' ? (format === 'movpngsfx' ? 'movpng.exe' : 'mov.exe') : `${format}.zip`;
      // const mime = container === 'exe' ? 'application/vnd.microsoft.portable-executable' : 'application/zip';

      const stream = await cookAvatars(id, format, container, transparent, bg, fg);
      await writeToFile(stream, id, ext, format, container, false, 'avatars');
      return reply.status(200).send({ ok: true });
    } catch (err) {
      withScope((scope) => {
        scope.setTag('recordingID', id);
        scope.setTag('format', `avatar:${format}.${container}`);
        captureException(err);
      });
      return reply.status(500).send({ ok: false, error: err.message });
    }
  }
};
