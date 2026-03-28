import { getAccountAdmissionDecisionForGuild } from '../apps/bot/src/modules/billing';

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function main() {
  const guildId = getArg('--guild-id');
  if (!guildId) {
    console.error('Missing required argument: --guild-id');
    process.exit(2);
  }

  const admission = await getAccountAdmissionDecisionForGuild(guildId);
  process.stdout.write(JSON.stringify(admission));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
