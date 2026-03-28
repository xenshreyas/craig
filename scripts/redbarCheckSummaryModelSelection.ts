import { prisma } from '../apps/tasks/src/prisma';
import { getSummaryModelForRecording } from '../apps/tasks/src/budget';

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function main() {
  const billingUserId = getArg('--billing-user-id');
  if (!billingUserId) {
    console.error('Missing required argument: --billing-user-id');
    process.exit(2);
  }

  const model = await getSummaryModelForRecording(prisma, { billingUserId });
  process.stdout.write(JSON.stringify({ billingUserId, model }));
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
