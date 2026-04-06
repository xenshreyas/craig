import config from 'config';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { createLogger } from '../logger';

const logger = createLogger('transcript');

const recPath = config.has('recording.path')
  ? path.join(__dirname, '..', '..', config.get<string>('recording.path'))
  : path.join(__dirname, '..', '..', '..', '..', 'rec');

export interface ParticipantInfo {
  id: string;
  username: string;
  discriminator: string;
  globalName?: string | null;
  nick?: string | null;
  bot?: boolean;
}

export type ParticipantMap = Map<number, ParticipantInfo>;

/**
 * Reads and parses the `.ogg.users` file for a recording.
 * Returns a map of track number → participant info, or null if the file is
 * missing or unparseable.
 *
 * The `.ogg.users` format is NDJSON-like:
 *   "0":{}
 *   ,"1":{"id":"...","username":"alice",...}
 * Parsing wraps the content in `{}` and calls JSON.parse.
 */
export async function readUsersFile(recordingId: string): Promise<ParticipantMap | null> {
  const filePath = path.join(recPath, `${recordingId}.ogg.users`);
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    const parsed = JSON.parse(`{${raw}}`) as Record<string, ParticipantInfo>;
    const map: ParticipantMap = new Map();
    for (const [key, value] of Object.entries(parsed)) {
      const trackNumber = Number(key);
      if (!Number.isFinite(trackNumber) || !value || typeof value !== 'object') continue;
      map.set(trackNumber, value);
    }
    return map;
  } catch (err) {
    logger.warn('Failed to read users file for recording %s: %s', recordingId, (err as Error).message);
    return null;
  }
}

/**
 * Sanitizes a display name by stripping characters that would break the
 * speaker label format: colons and newline characters.
 */
export function sanitizeDisplayName(name: string): string {
  return name.replace(/[:\n\r]/g, '');
}

/**
 * Resolves the display name for a participant using priority order:
 *   nick → globalName → username → "Unknown User {trackNumber}"
 * The result is sanitized before being returned.
 */
export function resolveDisplayName(participant: ParticipantInfo | undefined, trackNumber: number): string {
  let name: string;
  if (participant?.nick) {
    name = participant.nick;
  } else if (participant?.globalName) {
    name = participant.globalName;
  } else if (participant?.username) {
    name = participant.username;
  } else {
    name = `Unknown User ${trackNumber}`;
  }
  return sanitizeDisplayName(name);
}
