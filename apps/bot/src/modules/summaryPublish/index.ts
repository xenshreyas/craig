import { SummaryPublishStatus } from '@prisma/client';
import { DexareClient, DexareModule } from 'dexare';
import Eris from 'eris';
import Redis from 'ioredis';

import type { CraigBotConfig } from '../../bot';
import { prisma } from '../../prisma';
import { client as redisClient } from '../../redis';
import type ShardingModule from '../sharding';
import { SUMMARY_PUBLISH_QUEUE_KEY } from './constants';
import { makePublishedSummaryMessage } from './messages';

export interface SummaryPublishJob {
  recordingId: string;
  guildId: string;
}

export default class SummaryPublishModule extends DexareModule<DexareClient<CraigBotConfig>> {
  consumer: Redis;
  running = false;

  constructor(client: DexareClient<CraigBotConfig>) {
    super(client, {
      name: 'summary-publish',
      description: 'Publishes meeting summaries to guild #silhouette channels'
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
      this.logger.error('Failed to connect summary publish consumer', err);
      return;
    }

    this.running = true;
    this.logger.info('Summary publish worker started. queue=%s', SUMMARY_PUBLISH_QUEUE_KEY);
    void this.runLoop();
  }

  private async runLoop() {
    while (this.running) {
      try {
        const result = await this.consumer.blpop(SUMMARY_PUBLISH_QUEUE_KEY, 0);
        if (!result) continue;

        const job = parsePublishJob(result[1]);
        if (!job) {
          this.logger.warn('Summary publish worker received invalid payload');
          continue;
        }

        await this.routePublish(job);
      } catch (err) {
        if (!this.running) break;
        this.logger.error('Summary publish worker loop error', err);
      }
    }
  }

  private get sharding() {
    return this.client.modules.get('sharding') as unknown as ShardingModule;
  }

  private async routePublish(job: SummaryPublishJob) {
    if (!this.sharding.on) {
      await this.executePublish(job);
      return;
    }

    try {
      const response = await this.sharding.sendAndRecieve<{ ok?: boolean; error?: string }>('publishSummaryToGuild', job, 15_000);
      if (response.d.ok) return;
      await this.fail(job.recordingId, response.d.error || 'Unable to route summary publish to the correct shard.');
    } catch (err) {
      this.logger.warn('Failed to route summary publish %s for guild %s', job.recordingId, job.guildId, err);
      await this.fail(job.recordingId, 'Unable to route summary publish to the correct shard.');
    }
  }

  async executePublish(job: SummaryPublishJob) {
    const recording = await prisma.recording.findUnique({
      where: { id: job.recordingId },
      include: { summary: true }
    });
    if (!recording || recording.guildId !== job.guildId || !recording.summary || !recording.summary.markdown) {
      await this.fail(job.recordingId, 'Recording summary is unavailable for publishing.');
      return;
    }
    if (recording.summary.publishStatus === SummaryPublishStatus.PUBLISHED) return;

    const guild = this.client.bot.guilds.get(job.guildId);
    if (!guild) {
      throw new Error('Guild is unavailable on the owning shard.');
    }

    const targetChannel = await this.findOrCreateSilhouetteChannel(guild);
    if (!targetChannel) {
      await this.fail(job.recordingId, 'Unable to access or create the #silhouette channel.');
      return;
    }

    const sourceChannel = guild.channels.get(recording.channelId);
    const sent = await this.client.bot
      .createMessage(
        targetChannel.id,
        makePublishedSummaryMessage(
          this.client.config,
          {
            recordingId: recording.id,
            accessKey: recording.accessKey,
            summaryMarkdown: recording.summary.markdown
          },
          {
            guildName: guild.name,
            sourceChannelName: sourceChannel && 'name' in sourceChannel ? (sourceChannel.name as string) : null,
            guildIconUrl: guild.icon ? guild.dynamicIconURL('png', 128) : null
          }
        ) as any
      )
      .catch((err) => {
        this.logger.warn('Failed to publish summary %s to guild %s', recording.id, job.guildId, err);
        return null;
      });

    if (!sent) {
      await this.fail(job.recordingId, 'Unable to send the published summary message.');
      return;
    }

    await prisma.recordingSummary.update({
      where: { recordingId: recording.id },
      data: {
        publishStatus: SummaryPublishStatus.PUBLISHED,
        publishedAt: new Date(),
        publishedChannelId: targetChannel.id,
        publishedMessageId: sent.id,
        publishError: null
      }
    });
  }

  private async findOrCreateSilhouetteChannel(guild: Eris.Guild) {
    const existing = guild.channels.find((channel) => {
      if (!('name' in channel) || !('type' in channel)) return false;
      return channel.type === 0 && channel.name.toLowerCase() === 'silhouette';
    }) as Eris.GuildTextableChannel | undefined;
    if (existing) return existing;

    const created = await this.client.bot.createChannel(guild.id, 'silhouette', 0).catch((err) => {
      this.logger.warn('Failed to create #silhouette channel in guild %s', guild.id, err);
      return null;
    });
    if (!created || !('id' in created)) return null;

    return created as Eris.GuildTextableChannel;
  }

  private async fail(recordingId: string, publishError: string) {
    await prisma.recordingSummary
      .update({
        where: { recordingId },
        data: {
          publishStatus: SummaryPublishStatus.FAILED,
          publishError: publishError.slice(0, 500)
        }
      })
      .catch(() => {});
  }
}

function parsePublishJob(raw: string): SummaryPublishJob | null {
  try {
    const parsed = JSON.parse(raw) as SummaryPublishJob;
    if (!parsed || typeof parsed.recordingId !== 'string' || typeof parsed.guildId !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}
