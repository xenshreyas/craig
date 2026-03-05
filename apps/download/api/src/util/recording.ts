import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';

import { Recording } from '@prisma/client';

import { prisma } from '../prisma';
import StreamConcat from './streamConcat';

export const recPath = path.join(__dirname, '..', '..', '..', '..', 'rec');

export interface RecordingInfo {
  format: 1;
  key: number | string;
  delete: number | string;
  guild: string;
  guildExtra: {
    name: string;
    id: string;
    icon: string | null;
  };
  channel: string;
  channelExtra: {
    name: string;
    id: string;
    type: number;
  };
  requester: string;
  requesterExtra: {
    username: string;
    discriminator: string;
    avatar: string | null;
  };
  requesterId: string;
  startTime: string;
  expiresAfter?: number;
  user?: string;
  userId?: string;
  userExtra?: {
    username: string;
    discriminator: string;
    avatar?: string;
  };
  features: { [features: string]: boolean };
}

export interface RecordingUser {
  id: string;
  name?: string;
  discrim?: string;
  username: string;
  discriminator: string;
  avatar?: string;
}

export interface RecordingNote {
  time: string;
  note: string;
}

export type RecordingAccess = Pick<Recording, 'id' | 'accessKey' | 'deleteKey' | 'expiresAt' | 'guildId' | 'userId'>;
export interface DurableRecordingPageInfo extends RecordingInfo {
  audioAvailable: boolean;
  audioExpired: boolean;
  duration: number | null;
}

const audioTypes = ['data', 'header1', 'header2'] as const;
const deletableMetadataTypes = ['info', 'users', 'features', 'key', 'duration', 'notes'] as const;

function recordingFilePath(id: string, type: string) {
  return path.join(recPath, `${id}.ogg.${type}`);
}

export async function fileExists(file: string) {
  try {
    await fs.access(file);
    return true;
  } catch (err) {
    return false;
  }
}

export function getRawRecordingStream(id: string) {
  const stream = new StreamConcat(audioTypes.map((ext) => createReadStream(recordingFilePath(id, ext))));
  return stream;
}

export async function getRecording(id: string): Promise<RecordingInfo | false> {
  const dataExists = !(await Promise.all(audioTypes.map((ext) => fileExists(recordingFilePath(id, ext))))).some((exists) => exists === false);
  const infoExists = await fileExists(recordingFilePath(id, 'info'));
  if (!dataExists && infoExists) return false;
  if (!dataExists || !infoExists) return null;

  const info = await readRecordingInfo(id);
  if (!info) return null;

  return info;
}

async function readRecordingInfo(id: string): Promise<RecordingInfo | null> {
  const infoExists = await fileExists(recordingFilePath(id, 'info'));
  if (!infoExists) return null;

  const info: Partial<RecordingInfo> = JSON.parse(await fs.readFile(recordingFilePath(id, 'info'), 'utf8'));

  // check for a key file
  if (!info.key) {
    const keyExists = await fileExists(recordingFilePath(id, 'key'));
    if (keyExists) info.key = await fs.readFile(recordingFilePath(id, 'key'), 'utf8');
  }

  // fill in features
  if (!info.features) {
    const featsExists = await fileExists(recordingFilePath(id, 'features'));
    if (featsExists) info.features = JSON.parse(await fs.readFile(recordingFilePath(id, 'features'), 'utf8'));
    else info.features = {};
  }

  return info as RecordingInfo;
}

export async function getRecordingAccess(id: string): Promise<RecordingAccess | null> {
  return prisma.recording.findUnique({
    where: { id },
    select: {
      id: true,
      accessKey: true,
      deleteKey: true,
      expiresAt: true,
      guildId: true,
      userId: true
    }
  });
}

export async function isAudioAvailable(id: string): Promise<boolean> {
  return !(await Promise.all(audioTypes.map((ext) => fileExists(recordingFilePath(id, ext))))).some((exists) => exists === false);
}

export async function readPersistedDuration(id: string): Promise<number | null> {
  const file = recordingFilePath(id, 'duration');
  if (!(await fileExists(file))) return null;
  const parsed = Number.parseFloat((await fs.readFile(file, 'utf8')).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export async function writePersistedDuration(id: string, duration: number): Promise<void> {
  await fs.writeFile(recordingFilePath(id, 'duration'), `${duration}`, 'utf8');
}

export async function readPersistedNotes(id: string): Promise<RecordingNote[] | null> {
  const file = recordingFilePath(id, 'notes');
  if (!(await fileExists(file))) return null;
  return JSON.parse(await fs.readFile(file, 'utf8')) as RecordingNote[];
}

export async function writePersistedNotes(id: string, notes: RecordingNote[]): Promise<void> {
  await fs.writeFile(recordingFilePath(id, 'notes'), JSON.stringify(notes), 'utf8');
}

export async function getRecordingPageInfo(id: string): Promise<DurableRecordingPageInfo | null> {
  const info = await readRecordingInfo(id);
  if (!info) return null;
  const audioAvailable = await isAudioAvailable(id);
  const duration = await readPersistedDuration(id);
  return {
    ...info,
    audioAvailable,
    audioExpired: !audioAvailable,
    duration
  };
}

export async function getRecordingUsersDurable(id: string): Promise<RecordingUser[] | null> {
  const file = recordingFilePath(id, 'users');
  if (!(await fileExists(file))) return null;
  const userText = await fs.readFile(file, 'utf8');
  const users: { [index: string]: RecordingUser } = JSON.parse(`{${userText}}`);
  return Object.values(users).filter((user) => Object.keys(user).length !== 0);
}

async function unlinkRecordingTypes(id: string, types: readonly string[]): Promise<void> {
  const unlinkResults = await Promise.allSettled(types.map((type) => fs.unlink(recordingFilePath(id, type))));

  for (const result of unlinkResults) {
    if (result.status === 'rejected' && (result.reason as { code?: string })?.code !== 'ENOENT') throw result.reason;
  }
}

export async function getUsers(id: string): Promise<RecordingUser[]> {
  return (await getRecordingUsersDurable(id)) ?? [];
}

export async function expireRecordingAudio(id: string): Promise<void> {
  await unlinkRecordingTypes(id, audioTypes);
}

export async function deleteRecordingArtifacts(id: string): Promise<void> {
  await unlinkRecordingTypes(id, [...audioTypes, ...deletableMetadataTypes]);
}

export function keyMatches(rec: RecordingInfo, key: string) {
  return key === String(rec.key);
}

export function recordingAccessKeyMatches(rec: RecordingAccess, key: string) {
  return key === String(rec.accessKey);
}

export function recordingDeleteKeyMatches(rec: RecordingAccess, key: string) {
  return key === String(rec.deleteKey);
}
