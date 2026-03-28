import { ButtonStyle, ComponentType, EditMessageOptions, MessageFlags, SeparatorSpacingSize } from 'slash-create';

import type { CraigBotConfig } from '../../bot';
import { buildRecordingUrl, truncateSummaryPreview } from '../summaryNotifications/messages';

export interface SummaryPublishMessageContext {
  guildName?: string | null;
  sourceChannelName?: string | null;
  guildIconUrl?: string | null;
}

export function makePublishedSummaryMessage(
  config: CraigBotConfig,
  params: {
    recordingId: string;
    accessKey: string;
    summaryMarkdown: string;
  },
  context: SummaryPublishMessageContext
): EditMessageOptions {
  const preview = truncateSummaryPreview(params.summaryMarkdown);
  const contextLines = [
    context.guildName ? `**Guild:** ${context.guildName}` : '',
    context.sourceChannelName ? `**Recorded In:** ${context.sourceChannelName}` : '',
    `**Recording ID:** \`${params.recordingId}\``
  ]
    .filter(Boolean)
    .join('\n');

  return {
    flags: MessageFlags.IS_COMPONENTS_V2,
    allowedMentions: {
      everyone: false,
      roles: false,
      users: false
    },
    components: [
      {
        type: ComponentType.CONTAINER,
        components: [
          context.guildIconUrl
            ? {
                type: ComponentType.SECTION,
                accessory: {
                  type: ComponentType.THUMBNAIL,
                  media: { url: context.guildIconUrl }
                },
                components: [
                  {
                    type: ComponentType.TEXT_DISPLAY,
                    content: '### Meeting notes\nPublished from Silhouette.'
                  }
                ]
              }
            : {
                type: ComponentType.TEXT_DISPLAY,
                content: '### Meeting notes\nPublished from Silhouette.'
              },
          {
            type: ComponentType.SEPARATOR,
            divider: true,
            spacing: SeparatorSpacingSize.SMALL
          },
          {
            type: ComponentType.TEXT_DISPLAY,
            content: contextLines
          },
          {
            type: ComponentType.SEPARATOR,
            divider: true,
            spacing: SeparatorSpacingSize.SMALL
          },
          {
            type: ComponentType.TEXT_DISPLAY,
            content: preview
          },
          {
            type: ComponentType.SEPARATOR,
            divider: true,
            spacing: SeparatorSpacingSize.SMALL
          },
          {
            type: ComponentType.ACTION_ROW,
            components: [
              {
                type: ComponentType.BUTTON,
                style: ButtonStyle.LINK,
                label: 'Open recording',
                url: buildRecordingUrl(config, params.recordingId, params.accessKey)
              }
            ]
          }
        ]
      }
    ]
  } as EditMessageOptions;
}
