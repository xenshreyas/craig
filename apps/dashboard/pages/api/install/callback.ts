import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';

import prisma from '../../../lib/prisma';
import { parseUser, verifyInstallState } from '../../../utils';
import { config } from '../../../utils/config';

type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = parseUser(req);
  if (!user) return res.redirect('/login');

  const { state, guild_id: guildId, error } = req.query;
  if (error) return res.redirect(`/?error=${encodeURIComponent(String(error))}&from=discord`);
  if (!state || typeof state !== 'string') return res.redirect('/?error=missing_install_state&from=discord');
  if (!guildId || typeof guildId !== 'string') return res.redirect('/?error=missing_guild_id&from=discord');

  const verified = verifyInstallState(state);
  if (!verified || verified.userId !== user.id) {
    return res.redirect('/?error=invalid_install_state&from=discord');
  }

  const existingGuild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (existingGuild?.ownerUserId && existingGuild.ownerUserId !== user.id) {
    return res.redirect('/?error=guild_already_linked&from=discord');
  }

  const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
    headers: {
      Authorization: `Bot ${config.discordBotToken}`
    }
  });
  if (!guildResponse.ok) {
    return res.redirect(`/?error=${encodeURIComponent(`guild_lookup_failed_${guildResponse.status}`)}&from=discord`);
  }

  const guild = (await guildResponse.json()) as DiscordGuild;
  await prisma.guild.upsert({
    where: { id: guildId },
    update: {
      ownerUserId: user.id,
      linkedAt: new Date(),
      name: guild.name,
      icon: guild.icon
    },
    create: {
      id: guildId,
      ownerUserId: user.id,
      linkedAt: new Date(),
      name: guild.name,
      icon: guild.icon,
      accessRoles: []
    }
  });

  return res.redirect(`/?r=server_linked&guild=${guildId}`);
}
