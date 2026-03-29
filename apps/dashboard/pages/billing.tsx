import type { User } from '@prisma/client';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

import BillingBanner from '../components/billingBanner';
import BudgetCard from '../components/budgetCard';
import Section from '../components/section';
import prisma from '../lib/prisma';
import { formatUsdFromCents, formatUsdFromMicros, parseUser } from '../utils';
import { getAccountTrialTotalMicros } from '../utils/budget';
import type { BillingStatus } from '../utils/budgetData';

interface Props {
  lifetimeUsageMicros: number;
  currentMonthUsageMicros: number;
  currentMonthBilledCents: number;
  trialRemainingMicros: number;
  trialTotalMicros: number;
  aiBillingMonthlyCapUsd: number;
  billingStatus: BillingStatus;
  hasStripeSetup: boolean;
  stripeSubscriptionStatus: string | null;
  stripeCancelAtPeriodEnd: boolean;
}

const STATUS_CONFIG: Record<BillingStatus, { label: string; cls: string }> = {
  BILLING_OVERRIDE: { label: 'Override', cls: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20' },
  TRIAL_ONLY: { label: 'Trial', cls: 'bg-sky-500/15 text-sky-400 ring-sky-500/20' },
  BILLING_ACTIVE: { label: 'Active', cls: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20' },
  BILLING_REQUIRED: { label: 'Setup Required', cls: 'bg-red-500/15 text-red-400 ring-red-500/20' },
  BILLING_CANCELLED: { label: 'Cancelled', cls: 'bg-red-500/15 text-red-400 ring-red-500/20' },
  MONTHLY_CAP_REACHED: { label: 'Cap Reached', cls: 'bg-amber-500/15 text-amber-400 ring-amber-500/20' },
  SUBSCRIPTION_INACTIVE: { label: 'Inactive', cls: 'bg-amber-500/15 text-amber-400 ring-amber-500/20' }
};

function StatusBadge({ status }: { status: BillingStatus }) {
  const { label, cls } = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/20' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cls}`}>
      {label}
    </span>
  );
}

export default function BillingPage(props: Props) {
  const hasBillingOverride = props.billingStatus === 'BILLING_OVERRIDE';
  const showTrialExhausted = props.billingStatus === 'BILLING_REQUIRED';
  const showBillingWarning =
    props.billingStatus === 'BILLING_CANCELLED' ||
    props.billingStatus === 'SUBSCRIPTION_INACTIVE' ||
    props.billingStatus === 'MONTHLY_CAP_REACHED';
  const showPortal = props.billingStatus === 'BILLING_ACTIVE';
  const usageLabel = props.hasStripeSetup ? 'Billed' : 'Provider-cost';
  const usageValue = props.hasStripeSetup
    ? formatUsdFromCents(props.currentMonthBilledCents)
    : formatUsdFromMicros(props.currentMonthUsageMicros);

  const hasPromoError =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('error') === 'invalid_promotion_code';

  return (
    <>
      <Head>
        <title>Billing • Silhouette Dashboard</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-t from-neutral-800 to-zinc-900 px-4 py-12 text-white sm:px-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 rounded-lg bg-zinc-700 p-6 shadow-lg">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-3xl">Billing</h1>
                {hasBillingOverride && (
                  <div className="group relative flex items-center">
                    <span className="cursor-default rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                      Admin
                    </span>
                    <div className="pointer-events-none absolute left-0 top-full z-10 mt-2 w-64 rounded-md bg-zinc-800 px-3 py-2 text-xs text-zinc-300 opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover:opacity-100">
                      Billing override is enabled for this account. Trial and Stripe enforcement are bypassed.
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-400">Account-scoped AI usage across all linked servers.</p>
            </div>
            <a href="/" className="flex-shrink-0 rounded-md bg-zinc-600 px-4 py-2 text-sm font-medium hover:bg-zinc-500 transition-colors">
              Back
            </a>
          </div>

          {/* Alerts */}
          {showTrialExhausted && <BillingBanner href="/billing" />}
          {showBillingWarning && (
            <div className="w-full rounded-md border border-amber-400/40 bg-amber-950/40 px-4 py-3 text-amber-100">
              <div className="font-display text-base font-semibold">
                {props.billingStatus === 'BILLING_CANCELLED'
                  ? 'Billing has been cancelled'
                  : props.billingStatus === 'MONTHLY_CAP_REACHED'
                    ? 'Monthly billing cap reached'
                    : 'Billing is not active'}
              </div>
              <div className="mt-1 text-sm text-amber-200/80">
                {props.billingStatus === 'BILLING_CANCELLED'
                  ? 'Paid AI access is blocked immediately after cancellation. Reactivate billing to continue.'
                  : props.billingStatus === 'MONTHLY_CAP_REACHED'
                    ? 'You have reached your configured monthly cap. Increase it below or wait for the next billing month.'
                    : 'Your Stripe subscription is not active. Resume billing to continue.'}
              </div>
            </div>
          )}
          {hasPromoError && (
            <div className="w-full rounded-md border border-red-400/40 bg-red-950/40 px-4 py-3 text-red-100">
              <div className="font-display text-base font-semibold">Invalid promo code</div>
              <div className="mt-1 text-sm text-red-200/80">The promo code you entered was not found or is not active.</div>
            </div>
          )}

          {/* Trial Credits */}
          <Section title="Trial Credits" big>
            <BudgetCard
              title="Included AI Credits"
              spentMicros={Math.min(props.lifetimeUsageMicros, props.trialTotalMicros)}
              capMicros={props.trialTotalMicros}
            />
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-zinc-600/70 px-4 py-3 ring-1 ring-white/5">
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">Lifetime Usage</div>
                <div className="mt-1.5 font-display text-xl text-white">{formatUsdFromMicros(props.lifetimeUsageMicros)}</div>
              </div>
              <div className="rounded-md bg-zinc-600/70 px-4 py-3 ring-1 ring-white/5">
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">Trial Remaining</div>
                <div className="mt-1.5 font-display text-xl text-white">{formatUsdFromMicros(props.trialRemainingMicros)}</div>
              </div>
              <div className="rounded-md bg-zinc-600/70 px-4 py-3 ring-1 ring-white/5">
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">{usageLabel} This Month</div>
                <div className="mt-1.5 font-display text-xl text-white">{usageValue}</div>
              </div>
            </div>
          </Section>

          {/* Billing Status */}
          <Section title="Billing Status" big>
            <div className="w-full rounded-md bg-zinc-600/70 ring-1 ring-white/5 shadow-md overflow-hidden">
              <div className="px-4 py-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm text-zinc-400 w-36 flex-shrink-0">Status</span>
                  <StatusBadge status={props.billingStatus} />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm text-zinc-400 w-36 flex-shrink-0">Stripe subscription</span>
                  <span className="text-sm text-zinc-200">
                    {props.stripeSubscriptionStatus ?? (hasBillingOverride ? 'Not required' : 'Not configured')}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm text-zinc-400 w-36 flex-shrink-0">Monthly hard cap</span>
                  <span className="text-sm text-zinc-200">${props.aiBillingMonthlyCapUsd}</span>
                </div>
              </div>
              <div className="border-t border-zinc-500/40 px-4 py-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Stripe Setup</div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <form method="post" action="/api/billing/checkout" className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="promotionCode" className="text-xs text-zinc-400">
                        Promo code
                      </label>
                      <input
                        id="promotionCode"
                        name="promotionCode"
                        type="text"
                        placeholder="Optional"
                        className="rounded-md bg-zinc-800 px-3 py-2 text-sm text-white outline-none ring-1 ring-zinc-500 focus:ring-teal-400 transition-shadow"
                      />
                    </div>
                    <button
                      type="submit"
                      className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 transition-colors"
                    >
                      {props.hasStripeSetup ? 'Reactivate Billing' : 'Set Up Billing'}
                    </button>
                  </form>
                  {showPortal && (
                    <form method="post" action="/api/billing/portal">
                      <button
                        type="submit"
                        className="rounded-md bg-zinc-500 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-400 transition-colors"
                      >
                        Manage Billing
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </Section>

          {/* Monthly Cap */}
          <Section title="Monthly Cap" big>
            <form method="post" action="/api/billing/cap" className="w-full rounded-md bg-zinc-600/70 px-4 py-4 ring-1 ring-white/5 shadow-md">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="monthlyCapUsd" className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Hard Cap (USD / month)
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    id="monthlyCapUsd"
                    name="monthlyCapUsd"
                    type="number"
                    min={10}
                    max={50}
                    step={1}
                    defaultValue={props.aiBillingMonthlyCapUsd}
                    className="w-28 rounded-md bg-zinc-800 px-3 py-2 text-sm text-white outline-none ring-1 ring-zinc-500 focus:ring-teal-400 transition-shadow"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                Applies to billed pay-per-use dollars across all linked servers once Stripe is active. Range: $10–$50.
              </p>
            </form>
          </Section>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async function (ctx) {
  const { getAccountTrialRemainingMicros, getBillingStatus, getCurrentMonthAccountUsageMicros, getLifetimeAccountUsageMicros } =
    await import('../utils/budgetData');
  const user = parseUser(ctx.req);

  if (!user) {
    return {
      redirect: {
        destination: '/login?next=/billing',
        permanent: false
      }
    };
  }

  const dbUser = (await prisma.user.findUnique({ where: { id: user.id } })) as User | null;
  const lifetimeUsageMicros = await getLifetimeAccountUsageMicros(user.id);
  const currentMonthUsageMicros = await getCurrentMonthAccountUsageMicros(user.id);
  const trialRemainingMicros = await getAccountTrialRemainingMicros(user.id);
  const billingStatus = await getBillingStatus(user.id);

  return {
    props: {
      lifetimeUsageMicros,
      currentMonthUsageMicros,
      currentMonthBilledCents: billingStatus.currentMonthBilledCents,
      trialRemainingMicros,
      trialTotalMicros: getAccountTrialTotalMicros(),
      aiBillingMonthlyCapUsd: dbUser?.aiBillingMonthlyCapUsd ?? 10,
      billingStatus: billingStatus.status,
      hasStripeSetup: billingStatus.hasStripeSetup,
      stripeSubscriptionStatus: billingStatus.stripeSubscriptionStatus,
      stripeCancelAtPeriodEnd: billingStatus.stripeCancelAtPeriodEnd
    }
  };
};
