import { parse } from 'cookie';
import { sign, verify } from 'jsonwebtoken';
import { IncomingMessage } from 'node:http';

import { config } from './config';
import { DiscordUser } from './types';

export function parseUser(req: IncomingMessage): DiscordUser | null {
  if (!req.headers.cookie) return null;
  const token = parse(req.headers.cookie)[config.cookieName];
  if (!token) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { iat, exp, ...user } = verify(token, config.jwtSecret) as DiscordUser & { iat: number; exp: number };
    return user;
  } catch (e) {
    return null;
  }
}

export function getAvatarUrl(user: DiscordUser): string {
  if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  return `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;
}

interface InstallStatePayload {
  userId: string;
  nonce: string;
  createdAt: number;
}

export function signInstallState(userId: string) {
  const payload: InstallStatePayload = {
    userId,
    nonce: Math.random().toString(36).slice(2),
    createdAt: Date.now()
  };
  return sign(payload, config.jwtSecret, { expiresIn: '10m' });
}

export function verifyInstallState(token: string): InstallStatePayload | null {
  try {
    const payload = verify(token, config.jwtSecret) as InstallStatePayload;
    if (!payload.userId || !payload.nonce || !payload.createdAt) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getGuildIconUrl(guildId: string, icon: string | null | undefined) {
  if (!icon) return null;
  return `https://cdn.discordapp.com/icons/${guildId}/${icon}.png?size=128`;
}

export function formatUsdFromMicros(micros: number) {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

export function formatUsdFromCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
