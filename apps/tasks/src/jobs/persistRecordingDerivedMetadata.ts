import config from 'config';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { TaskJob } from '../types';

const execFileAsync = promisify(execFile);

const recordingConfig = config.get('recording') as {
  fallbackExpiration: number;
  path: string;
  skipIds: string[];
  skipAll?: boolean;
};

const cookPath = config.has('cookPath')
  ? path.join(__dirname, '..', '..', config.get<string>('cookPath'))
  : path.join(__dirname, '..', '..', '..', '..', 'cook');

const persistWindowMs = 60 * 60 * 1000;

export default class PersistRecordingDerivedMetadata extends TaskJob {
  constructor() {
    super('persistRecordingDerivedMetadata', '15,45 * * * *');
  }

  async run() {
    this.logger.log('Persisting recording derived metadata...');
    if (recordingConfig.skipAll) return;
    const recPath = path.join(__dirname, '..', '..', recordingConfig.path);
    const files = await readdir(recPath);
    const recordingExts: { [file: string]: string[] } = {};

    for (const file of files) {
      const [id, ext, type] = file.split('.');
      if (ext !== 'ogg') continue;
      if (recordingConfig.skipIds.includes(id)) continue;

      if (!recordingExts[id]) recordingExts[id] = [];
      recordingExts[id].push(type);
    }

    for (const id of Object.keys(recordingExts)) {
      const types = recordingExts[id];
      if (!types.includes('info')) continue;
      if (!types.includes('data') || !types.includes('header1') || !types.includes('header2')) continue;

      const infoPath = path.join(recPath, `${id}.ogg.info`);
      const s = await stat(infoPath).catch(() => null);
      if (!s) continue;

      try {
        const info = JSON.parse(await readFile(infoPath, 'utf8'));
        const expiryTime =
          info.expiresAfter !== undefined
            ? Date.parse(info.startTime) + info.expiresAfter * 60 * 60 * 1000
            : s.mtime.getTime() + recordingConfig.fallbackExpiration;

        if (expiryTime > Date.now() + persistWindowMs) continue;

        const durationPath = path.join(recPath, `${id}.ogg.duration`);
        if (!types.includes('duration')) {
          const durationScript = path.join(cookPath, 'duration.sh');
          const { stdout } = await execFileAsync(durationScript, [id], {
            cwd: recPath,
            maxBuffer: 1024 * 1024
          });
          const duration = Number.parseFloat(stdout.trim());
          if (!Number.isFinite(duration)) throw new Error(`Invalid duration output for ${id}: ${stdout}`);
          await writeFile(durationPath, `${duration}`, 'utf8');
          this.logger.info(`Persisted duration for ${id}.`);
        }

        const notesPath = path.join(recPath, `${id}.ogg.notes`);
        if (!types.includes('notes')) {
          try {
            const notesScript = path.join(cookPath, 'jsonnotes.sh');
            const { stdout } = await execFileAsync(notesScript, [id], {
              cwd: recPath,
              maxBuffer: 1024 * 1024
            });
            const notes = JSON.parse(stdout);
            await writeFile(notesPath, JSON.stringify(notes), 'utf8');
            this.logger.info(`Persisted notes for ${id}.`);
          } catch (err) {
            this.logger.warn(`Failed to persist notes for ${id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } catch (err) {
        this.logger.error(`Failed to persist derived metadata for ${id}.`, err);
      }
    }

    this.logger.info('OK.');
  }
}
