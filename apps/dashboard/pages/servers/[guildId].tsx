import { SummaryPublishStatus, SummaryStatus, TranscriptStatus } from '@prisma/client';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

import BillingBanner from '../../components/billingBanner';
import BudgetCard from '../../components/budgetCard';
import Pagination from '../../components/pagination';
import RecordingsTable from '../../components/recordingsTable';
import Section from '../../components/section';
import prisma from '../../lib/prisma';
import { config } from '../../utils/config';
import { formatUsdFromMicros, getGuildIconUrl, parseUser } from '../../utils';
import { getAccountTrialTotalMicros } from '../../utils/budget';

interface Props {
  guild: {
    id: string;
    name: string;
    iconUrl: string | null;
  };
  spentMicros: number;
  trialExhausted: boolean;
  hasStripeSetup: boolean;
  hasBillingOverride: boolean;
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  recordings: Array<{
    id: string;
    createdAt: string;
    userId: string;
    accessKey: string;
    transcriptStatus: TranscriptStatus | 'NONE';
    summaryStatus: SummaryStatus | 'NONE';
    publishStatus: SummaryPublishStatus;
  }>;
}

const PAGE_SIZE = 10;

export default function ServerDashboard({ guild, spentMicros, trialExhausted, hasStripeSetup, hasBillingOverride, page, hasPrev, hasNext, recordings }: Props) {
  return (
    <>
      <Head>
        <title>{guild.name} • Silhouette Dashboard</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-t from-neutral-800 to-zinc-900 text-white font-body flex items-center justify-center flex-col py-12 sm:px-12">
        <div className="bg-zinc-700 sm:rounded flex justify-center items-center sm:shadow-md w-full flex-col sm:w-4/5 sm:max-w-5xl">
          <div className="flex w-full items-center justify-between gap-4 bg-black/20 p-4">
            <div className="flex items-center gap-3">
              {guild.iconUrl ? (
                <img src={guild.iconUrl} alt="" className="h-12 w-12 rounded-full bg-zinc-800 object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 font-display text-lg text-zinc-300">
                  {guild.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="font-display text-2xl">{guild.name}</h1>
                <p className="text-sm text-zinc-300">{formatUsdFromMicros(spentMicros)} spent in this server this month</p>
              </div>
            </div>
            <a href="/" className="rounded-md bg-zinc-600 px-4 py-2 font-medium hover:bg-zinc-500">
              Back
            </a>
          </div>
          <div className="flex w-full flex-col gap-4 p-6">
            {trialExhausted && !hasStripeSetup && !hasBillingOverride ? <BillingBanner /> : null}
            <BudgetCard title="Server Usage This Month" spentMicros={spentMicros} capMicros={getAccountTrialTotalMicros()} />
            <Section title="Recent Recordings" big>
              <RecordingsTable
                rows={recordings}
                downloadBaseUri={config.downloadBaseUri}
                guildId={guild.id}
                returnTo={`/servers/${guild.id}?page=${page}`}
              />
              <Pagination
                page={page}
                hasPrev={hasPrev}
                hasNext={hasNext}
                buildHref={(targetPage) => `/servers/${guild.id}?page=${targetPage}`}
              />
            </Section>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async function (ctx) {
  const { getAccountTrialRemainingMicros, getBillingStatus, getGuildUsageMicros } = await import('../../utils/budgetData');
  const user = parseUser(ctx.req);
  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  const guildId = typeof ctx.params?.guildId === 'string' ? ctx.params.guildId : null;
  if (!guildId) return { notFound: true };

  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild || guild.ownerUserId !== user.id) return { notFound: true };

  const page = Math.max(1, Number.parseInt(String(ctx.query.page || '1'), 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const rows = await prisma.recording.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
    skip,
    take: PAGE_SIZE + 1,
    include: {
      transcript: { select: { status: true } },
      summary: { select: { status: true, publishStatus: true } }
    }
  });

  const spentMicros = await getGuildUsageMicros(guildId);
  const trialRemainingMicros = await getAccountTrialRemainingMicros(user.id);
  const billingStatus = await getBillingStatus(user.id);
  const pageRows = rows.slice(0, PAGE_SIZE);

  return {
    props: {
      guild: {
        id: guild.id,
        name: guild.name || `Guild ${guild.id}`,
        iconUrl: getGuildIconUrl(guild.id, guild.icon)
      },
      spentMicros,
      trialExhausted: trialRemainingMicros <= 0,
      hasStripeSetup: billingStatus.hasStripeSetup,
      hasBillingOverride: billingStatus.status === 'BILLING_OVERRIDE',
      page,
      hasPrev: page > 1,
      hasNext: rows.length > PAGE_SIZE,
      recordings: pageRows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        userId: row.userId,
        accessKey: row.accessKey,
        transcriptStatus: row.transcript?.status ?? 'NONE',
        summaryStatus: row.summary?.status ?? 'NONE',
        publishStatus: row.summary?.publishStatus ?? SummaryPublishStatus.NOT_READY
      }))
    }
  };
};
