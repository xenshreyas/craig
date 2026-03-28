import { NextApiRequest, NextApiResponse } from 'next';

import { config } from '../../../utils/config';
import { parseUser, signInstallState } from '../../../utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = parseUser(req);
  const guildId = typeof req.query.guild_id === 'string' ? req.query.guild_id : null;
  const next = guildId ? `/api/install/start?guild_id=${encodeURIComponent(guildId)}` : '/api/install/start';
  if (!user) return res.redirect(`/login?next=${encodeURIComponent(next)}`);

  const state = signInstallState(user.id);
  const query = new URLSearchParams({
    client_id: config.discordAppId,
    scope: 'bot applications.commands',
    permissions: '0',
    response_type: 'code',
    redirect_uri: `${config.appUri}/api/install/callback`,
    state
  });
  if (guildId) query.set('guild_id', guildId);

  return res.redirect(`https://discord.com/api/oauth2/authorize?${query.toString()}`);
}
