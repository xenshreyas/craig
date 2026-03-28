import { wait } from '../../util';
import * as logger from '../logger';
import ShardManagerModule from '../module';

const SHARD_LOOKUP_RETRIES = 5;
const SHARD_LOOKUP_DELAY_MS = 750;

export default class SummaryPublishShardModule extends ShardManagerModule {
  constructor(client: any) {
    super(client, {
      name: 'summarypublish',
      description: 'Routes summary publish jobs to the owning shard'
    });

    this.filePath = __filename;
  }

  load() {
    this.registerCommand('publishSummaryToGuild', async (shard, msg, respond) => {
      const { guildId, recordingId } = msg.d ?? {};
      if (typeof guildId !== 'string' || typeof recordingId !== 'string') {
        return respond({ ok: false, error: 'Invalid summary publish payload.' });
      }

      const owner = await this.findOwningShard(guildId);
      if (!owner) {
        logger.warn(`Shard ${shard.id}: No owning shard found for publish ${recordingId} (${guildId})`);
        return respond({ ok: false, error: 'Guild was not found on any active shard.' });
      }

      try {
        const result = await owner.sendAndRecieve<{ ok?: boolean; error?: string }>('executeSummaryPublish', { guildId, recordingId });
        return respond(result.d ?? { ok: false, error: 'Summary publish execution returned no result.' });
      } catch (error) {
        logger.warn(`Shard ${shard.id}: Failed to route publish ${recordingId} to shard ${owner.id}`, error);
        return respond({ ok: false, error: 'Unable to execute summary publish on the owning shard.' });
      }
    });
  }

  unload() {
    this.unregisterAllCommands();
  }

  private async findOwningShard(guildId: string) {
    for (let attempt = 0; attempt < SHARD_LOOKUP_RETRIES; attempt++) {
      const owner = await this.manager.findGuild(guildId);
      if (owner) return owner;
      if (attempt < SHARD_LOOKUP_RETRIES - 1) await wait(SHARD_LOOKUP_DELAY_MS);
    }
    return null;
  }
}
