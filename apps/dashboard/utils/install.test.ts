import test from 'node:test';
import assert from 'node:assert/strict';

process.env.CLIENT_ID = process.env.CLIENT_ID || 'test-client-id';
process.env.CLIENT_SECRET = process.env.CLIENT_SECRET || 'test-client-secret';
process.env.PATREON_CLIENT_ID = process.env.PATREON_CLIENT_ID || 'test';
process.env.PATREON_CLIENT_SECRET = process.env.PATREON_CLIENT_SECRET || 'test';
process.env.PATREON_WEBHOOK_SECRET = process.env.PATREON_WEBHOOK_SECRET || 'test';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test';
process.env.MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || 'test';
process.env.MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || 'test';
process.env.DROPBOX_CLIENT_ID = process.env.DROPBOX_CLIENT_ID || 'test';
process.env.DROPBOX_CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET || 'test';
process.env.DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || 'test';
process.env.DISCORD_APP_ID = process.env.DISCORD_APP_ID || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

test('install state round-trips for same user', async () => {
  const { signInstallState, verifyInstallState } = await import('./index');
  const token = signInstallState('user-123');
  const payload = verifyInstallState(token);

  assert.ok(payload);
  assert.equal(payload?.userId, 'user-123');
  assert.ok(payload?.nonce);
  assert.ok(payload?.createdAt);
});

test('invalid install state token fails verification', async () => {
  const { verifyInstallState } = await import('./index');
  assert.equal(verifyInstallState('not-a-real-token'), null);
});
