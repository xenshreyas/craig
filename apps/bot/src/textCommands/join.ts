import { stripIndents } from 'common-tags';
import { CommandContext, DexareClient } from 'dexare';
import { ButtonStyle, ComponentType } from 'slash-create';

import TextCommand, { replyOrSend } from '../util';

export default class JoinCommand extends TextCommand {
  constructor(client: DexareClient<any>) {
    super(client, {
      name: 'join'
    });

    this.filePath = __filename;
  }

  async run(ctx: CommandContext) {
    await replyOrSend(ctx, {
      content: stripIndents`
        **${ctx.client.bot.user.username}** now uses slash commands for recordings!
        Please make sure that my commands are showing up when typing \`/\` in your chat box.
      `,
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.LINK,
              label: 'Link this server in Silhouette',
              url: `${this.client.config.craig.dashboardURL.replace(/\/$/, '')}/api/install/start?guild_id=${ctx.guild?.id}`,
              emoji: this.emojis.getPartial('craig') || undefined
            },
            {
              type: ComponentType.BUTTON,
              style: ButtonStyle.LINK,
              label: 'What are slash commands?',
              url: 'https://support.discord.com/hc/en-us/articles/1500000368501-Slash-Commands-FAQ',
              emoji: { name: '❔' }
            }
          ]
        }
      ]
    });
  }
}
