import clsx from 'clsx';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useEffect, useState } from 'react';

import BillingBanner from '../components/billingBanner';
import Button from '../components/button';
import GuildCard from '../components/guildCard';
import { Modal } from '../components/modal';
import prisma from '../lib/prisma';
import { getAvatarUrl, formatUsdFromCents, formatUsdFromMicros, getGuildIconUrl, parseUser } from '../utils';
import { getAccountTrialTotalMicros } from '../utils/budget';
import { DiscordUser } from '../utils/types';

interface Props {
  user: DiscordUser;
  linkedGuilds: LinkedGuild[];
  lifetimeUsageMicros: number;
  currentMonthUsageMicros: number;
  currentMonthBilledCents: number;
  trialTotalMicros: number;
  aiBillingMonthlyCapUsd: number;
  trialExhausted: boolean;
  hasStripeSetup: boolean;
  hasBillingOverride: boolean;
}

interface LinkedGuild {
  id: string;
  name: string;
  iconUrl: string | null;
  spentMicros: number;
}

export default function Index(props: Props) {
  const [modalParsed, setModalParsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Modal');
  const [modalContent, setModalContent] = useState<any>('');

  const trialSpentMicros = Math.min(props.lifetimeUsageMicros, props.trialTotalMicros);
  const trialUsagePct = Math.min(100, props.trialTotalMicros > 0 ? (trialSpentMicros / props.trialTotalMicros) * 100 : 0);
  const trialRemainingMicros = Math.max(0, props.trialTotalMicros - trialSpentMicros);
  const currentUsageLabel = props.hasStripeSetup
    ? formatUsdFromCents(props.currentMonthBilledCents)
    : formatUsdFromMicros(props.currentMonthUsageMicros);

  useEffect(() => {
    if (modalParsed) return;

    const p = new URLSearchParams(window.location.search);
    let title, content;
    if (p.get('error')) {
      const error = p.get('error');
      const from = p.get('from');
      if (from === 'discord') title = 'An error occurred while connecting to Discord.';
      else title = 'An error occurred.';

      if (error === 'access_denied') content = 'You denied access to your account.';
      else content = error;
    }

    const r = p.get('r');
    if (r === 'server_linked') {
      title = 'Server linked!';
      content = 'Your server is now linked to your Silhouette dashboard.';
    } else if (r === 'publish_started') {
      title = 'Publish started';
      content = 'The meeting notes are being published to #silhouette.';
    }

    if (title && content) {
      setModalTitle(title);
      setModalContent(content);
      setModalOpen(true);
    }
    setModalParsed(true);
  });

  return (
    <>
      <Head>
        <title>Silhouette Dashboard</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta httpEquiv="Content-Language" content="en" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#2dd4bf" />
        <meta name="og:site_name" content="Silhouette" />
        <meta name="og:title" content="Silhouette Dashboard" />
        <meta name="og:description" content="The multi-track recording bot for Discord." />
        <meta name="og:locale" content="en_US" />
        <meta name="og:image" content="/icon-512x512.png" />
        <meta name="msapplication-TileColor" content="#2dd4bf" />
        <meta name="theme-color" content="#2dd4bf" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-neutral-900 text-white font-body flex items-start justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-2xl flex flex-col gap-3">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-800/60 border border-zinc-700/50 px-5 py-4 shadow-lg">
            <div className="flex items-center gap-3">
              <img src={getAvatarUrl(props.user)} className="w-11 h-11 rounded-full ring-2 ring-teal-500/40" />
              <div>
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Dashboard</div>
                <div className="text-lg font-semibold text-white leading-tight">
                  Hello, {props.user.username}
                  {!!props.user.discriminator && props.user.discriminator !== '0' ? (
                    <span className="text-zinc-400 font-normal text-base">#{props.user.discriminator}</span>
                  ) : ''}
                </div>
              </div>
            </div>
            <button
              onClick={() => (location.href = '/api/logout')}
              className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-700/60"
            >
              Logout
            </button>
          </div>

          {/* Trial exhausted banner */}
          {props.trialExhausted && !props.hasStripeSetup && !props.hasBillingOverride ? <BillingBanner /> : null}

          {/* Billing Card */}
          <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 px-5 py-4 shadow-lg">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-widest mb-0.5">Billing</div>
                <div className="text-base font-semibold text-white">Trial Credits</div>
              </div>
              <a
                href="/billing"
                className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors mt-0.5"
              >
                Manage →
              </a>
            </div>

            <div className="h-1.5 w-full rounded-full bg-zinc-700 mb-2">
              <div
                className={clsx('h-1.5 rounded-full transition-all', {
                  'bg-teal-500': trialUsagePct < 80,
                  'bg-amber-500': trialUsagePct >= 80 && trialUsagePct < 100,
                  'bg-red-500': trialUsagePct >= 100
                })}
                style={{ width: `${trialUsagePct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
              <span>{formatUsdFromMicros(trialSpentMicros)} of {formatUsdFromMicros(props.trialTotalMicros)} used</span>
              <span>{formatUsdFromMicros(trialRemainingMicros)} remaining</span>
            </div>

            <div className="flex items-center justify-between text-sm border-t border-zinc-700/50 pt-3">
              <span className="text-zinc-400">
                This month: <span className="text-white font-medium">{currentUsageLabel}</span>
              </span>
              <span className="text-zinc-400">
                Monthly cap: <span className="text-white font-medium">${props.aiBillingMonthlyCapUsd}</span>
              </span>
            </div>
          </div>

          {/* Servers Card */}
          <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700/50">
              <div>
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-widest mb-0.5">Servers</div>
                <div className="text-base font-semibold text-white">
                  {props.linkedGuilds.length} linked {props.linkedGuilds.length === 1 ? 'server' : 'servers'}
                </div>
              </div>
              <button
                onClick={() => (location.href = '/api/install/start')}
                className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-500"
              >
                + Add Server
              </button>
            </div>

            <div className="divide-y divide-zinc-700/50">
              {props.linkedGuilds.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-zinc-500">
                  No servers linked yet.{' '}
                  <span className="text-teal-400">Add Server</span>{' '}
                  to install Silhouette and claim ownership in the dashboard.
                </div>
              ) : (
                props.linkedGuilds.map((guild) => (
                  <GuildCard
                    key={guild.id}
                    guildId={guild.id}
                    name={guild.name}
                    iconUrl={guild.iconUrl}
                    spentLabel={formatUsdFromMicros(guild.spentMicros)}
                  />
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      <Modal open={modalOpen} title={modalTitle} setOpen={setModalOpen}>
        <div className="flex flex-col gap-2">
          <span>{modalContent}</span>
          <Button
            type="brand"
            onClick={() => {
              setModalOpen(false);
              history.replaceState(null, null, '/dashboard');
            }}
            className="w-fit"
          >
            Close
          </Button>
        </div>
      </Modal>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async function (ctx) {
  const { getBillingStatus, getCurrentMonthAccountUsageMicros, getGuildUsageSummaries, getLifetimeAccountUsageMicros, getAccountTrialRemainingMicros } =
    await import('../utils/budgetData');
  const user = parseUser(ctx.req);

  if (!user)
    return {
      redirect: {
        destination: '/login?next=/dashboard',
        permanent: false
      }
    };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  const linkedGuilds = await prisma.guild.findMany({
    where: { ownerUserId: user.id },
    orderBy: { linkedAt: 'desc' }
  });
  const usageSummaries = await getGuildUsageSummaries(linkedGuilds.map((guild) => guild.id));
  const lifetimeUsageMicros = await getLifetimeAccountUsageMicros(user.id);
  const currentMonthUsageMicros = await getCurrentMonthAccountUsageMicros(user.id);
  const trialRemainingMicros = await getAccountTrialRemainingMicros(user.id);
  const billingStatus = await getBillingStatus(user.id);

  return {
    props: {
      user,
      lifetimeUsageMicros,
      currentMonthUsageMicros,
      currentMonthBilledCents: billingStatus.currentMonthBilledCents,
      trialTotalMicros: getAccountTrialTotalMicros(),
      aiBillingMonthlyCapUsd: dbUser?.aiBillingMonthlyCapUsd ?? 10,
      trialExhausted: trialRemainingMicros <= 0,
      hasStripeSetup: billingStatus.hasStripeSetup,
      hasBillingOverride: billingStatus.status === 'BILLING_OVERRIDE',
      linkedGuilds: linkedGuilds.map((guild) => ({
        id: guild.id,
        name: guild.name || `Guild ${guild.id}`,
        iconUrl: getGuildIconUrl(guild.id, guild.icon),
        spentMicros: usageSummaries.get(guild.id) ?? 0
      }))
    }
  };
};
