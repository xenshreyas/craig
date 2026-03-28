import { DexareClient, DexareModule } from 'dexare';
import Redis from 'ioredis';

import type { CraigBotConfig } from '../../bot';
import { prisma } from '../../prisma';
import { client as redisClient } from '../../redis';
import { SUMMARY_NOTIFICATION_QUEUE_KEY } from './constants';
import {
  SummaryNotificationContext,
  SummaryNotificationJob,
  makeSummaryFailureMessage,
  makeSummarySuccessMessage,
  parseSummaryNotificationJob
} from './messages';

export default class SummaryNotificationsModule extends DexareModule<DexareClient<CraigBotConfig>> {
  consumer: Redis;
  running = false;

  constructor(client: DexareClient<CraigBotConfig>) {
    super(client, {
      name: 'summary-notifications',
      description: 'Sends post-processing summary DMs to requesters'
    });

    this.filePath = __filename;
    this.consumer = redisClient.duplicate();
  }

  load() {
    this.registerEvent('ready', this.onReady.bind(this));
  }

  unload() {
    this.unregisterAllEvents();
    this.running = false;
    this.consumer.disconnect();
  }

  async onReady() {
    if (this.running) return;

    try {
      if (this.consumer.status !== 'ready') await this.consumer.connect();
    } catch (err) {
      this.logger.error('Failed to connect summary notification consumer', err);
      return;
    }

    this.running = true;
    this.logger.info('Summary notification worker started. queue=%s', SUMMARY_NOTIFICATION_QUEUE_KEY);
    void this.runLoop();
  }

  private async runLoop() {
    while (this.running) {
      try {
        const result = await this.consumer.blpop(SUMMARY_NOTIFICATION_QUEUE_KEY, 0);
        if (!result) continue;

        const job = parseSummaryNotificationJob(result[1]);
        if (!job) {
          this.logger.warn('Summary notification worker received invalid payload');
          continue;
        }

        await this.sendNotification(job);
      } catch (err) {
        if (!this.running) break;
        this.logger.error('Summary notification worker loop error', err);
      }
    }
  }

  private async sendNotification(job: SummaryNotificationJob) {
    const context = await this.getNotificationContext(job.recordingId);
    for (const userId of job.recipientUserIds) {
      const dmChannel = await this.client.bot.getDMChannel(userId).catch(() => null);
      if (!dmChannel) {
        this.logger.warn('Unable to open DM channel for summary notification user %s (%s)', userId, job.recordingId);
        continue;
      }

      const message =
        job.status === 'COMPLETE'
          ? makeSummarySuccessMessage(this.client.config, job, context)
          : makeSummaryFailureMessage(this.client.config, job);

      await dmChannel.createMessage(message as any).catch((err) => {
        this.logger.warn('Failed to send summary notification DM to %s for %s', userId, job.recordingId, err);
      });
    }
  }

  private async getNotificationContext(recordingId: string): Promise<SummaryNotificationContext> {
    const recording = await prisma.recording
      .findUnique({
        where: { id: recordingId },
        select: { guildId: true, channelId: true }
      })
      .catch(() => null);
    if (!recording) return {};

    const guild = this.client.bot.guilds.get(recording.guildId);
    const channel = guild?.channels.get(recording.channelId);
    return {
      guildName: guild?.name ?? null,
      channelName: channel && 'name' in channel ? (channel.name as string) : null,
      guildIconUrl: guild?.icon ? guild.dynamicIconURL('png', 128) : null
    };
  }
}
