import { ButtonStyle, ComponentType, EditMessageOptions, MessageFlags, SeparatorSpacingSize } from 'slash-create';

import type { CraigBotConfig } from '../../bot';
import {
  SUMMARY_BILLING_REQUIRED_DM,
  SUMMARY_DM_PREVIEW_CHARS,
  SUMMARY_ERROR_DM
} from './constants';

export type SummaryNotificationJob =
  | {
      status: 'COMPLETE';
      recordingId: string;
      recipientUserIds: string[];
      accessKey: string;
      summaryMarkdown: string;
    }
  | {
      status: 'ERROR';
      recordingId: string;
      recipientUserIds: string[];
    }
  | {
      status: 'SKIPPED';
      reason: 'BUDGET_CAP_REACHED';
      recordingId: string;
      recipientUserIds: string[];
    };

export interface SummaryNotificationContext {
  guildName?: string | null;
  channelName?: string | null;
  guildIconUrl?: string | null;
}

export function buildRecordingUrl(config: CraigBotConfig, recordingId: string, accessKey: string) {
  return `${config.craig.downloadProtocol ?? 'https'}://${config.craig.downloadDomain}/rec/${recordingId}?key=${accessKey}`;
}

export function makeSummarySuccessMessage(
  config: CraigBotConfig,
  job: Extract<SummaryNotificationJob, { status: 'COMPLETE' }>,
  context: SummaryNotificationContext
): EditMessageOptions {
  const preview = truncateSummaryPreview(job.summaryMarkdown);
  const contextLines = [
    context.guildName ? `**Guild:** ${context.guildName}` : '',
    context.channelName ? `**Channel:** ${context.channelName}` : '',
    `**Recording ID:** \`${job.recordingId}\``
  ]
    .filter(Boolean)
    .join('\n');

  return {
    flags: MessageFlags.IS_COMPONENTS_V2,
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
                    content: '### Meeting summary ready\nYour meeting summary is now available.'
                  }
                ]
              }
            : {
                type: ComponentType.TEXT_DISPLAY,
                content: '### Meeting summary ready\nYour meeting summary is now available.'
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
                url: buildRecordingUrl(config, job.recordingId, job.accessKey)
              }
            ]
          }
        ]
      }
    ]
  } as EditMessageOptions;
}

export function makeSummaryFailureMessage(
  config: CraigBotConfig,
  job: Exclude<SummaryNotificationJob, { status: 'COMPLETE' }>
): EditMessageOptions {
  const description =
    job.status === 'SKIPPED'
      ? `${SUMMARY_BILLING_REQUIRED_DM}\n\n${config.craig.dashboardURL.replace(/\/$/, '')}/billing`
      : SUMMARY_ERROR_DM;

  return {
    flags: MessageFlags.IS_COMPONENTS_V2,
    components: [
      {
        type: ComponentType.CONTAINER,
        components: [
          {
            type: ComponentType.TEXT_DISPLAY,
            content: `### Meeting summary update\n${description}`
          }
        ]
      }
    ]
  } as EditMessageOptions;
}

export function parseSummaryNotificationJob(raw: string): SummaryNotificationJob | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const candidate = parsed as Record<string, unknown>;
  if (
    typeof candidate.recordingId !== 'string' ||
    !Array.isArray(candidate.recipientUserIds) ||
    candidate.recipientUserIds.some((value) => typeof value !== 'string') ||
    typeof candidate.status !== 'string'
  )
    return null;

  if (candidate.status === 'COMPLETE') {
    if (typeof candidate.accessKey !== 'string' || typeof candidate.summaryMarkdown !== 'string') return null;
    return {
      status: 'COMPLETE',
      recordingId: candidate.recordingId,
      recipientUserIds: candidate.recipientUserIds as string[],
      accessKey: candidate.accessKey,
      summaryMarkdown: candidate.summaryMarkdown
    };
  }

  if (candidate.status === 'ERROR') {
    return {
      status: 'ERROR',
      recordingId: candidate.recordingId,
      recipientUserIds: candidate.recipientUserIds as string[]
    };
  }

  if (candidate.status === 'SKIPPED' && candidate.reason === 'BUDGET_CAP_REACHED') {
    return {
      status: 'SKIPPED',
      reason: 'BUDGET_CAP_REACHED',
      recordingId: candidate.recordingId,
      recipientUserIds: candidate.recipientUserIds as string[]
    };
  }

  return null;
}

function truncateSummaryPreview(markdown: string) {
  if (markdown.length <= SUMMARY_DM_PREVIEW_CHARS) return markdown.trim();

  const suffix = '\n\n-# Summary preview truncated. Open the recording page to read the full summary.';
  const sliceLimit = Math.max(1, SUMMARY_DM_PREVIEW_CHARS - suffix.length - 1);
  return `${markdown.slice(0, sliceLimit).trimEnd()}…${suffix}`;
}

export { truncateSummaryPreview };
