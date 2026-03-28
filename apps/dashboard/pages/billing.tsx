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

export default function BillingPage(props: Props) {
  const hasBillingOverride = props.billingStatus === 'BILLING_OVERRIDE';
  const showTrialExhausted = props.billingStatus === 'BILLING_REQUIRED';
  const showBillingWarning = props.billingStatus === 'BILLING_CANCELLED' || props.billingStatus === 'SUBSCRIPTION_INACTIVE' || props.billingStatus === 'MONTHLY_CAP_REACHED';
  const showPortal = props.billingStatus === 'BILLING_ACTIVE';
  const usageLabel = props.hasStripeSetup ? 'Current month billed usage' : 'Current month provider-cost usage';

  return (
    <>
      <Head>
        <title>Billing • Silhouette Dashboard</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-t from-neutral-800 to-zinc-900 px-4 py-12 text-white sm:px-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded bg-zinc-700 p-6 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl">Billing</h1>
              <p className="text-sm text-zinc-300">Account-scoped AI usage across all linked servers.</p>
            </div>
            <a href="/" className="rounded-md bg-zinc-600 px-4 py-2 font-medium hover:bg-zinc-500">
              Back
            </a>
          </div>

          {showTrialExhausted ? <BillingBanner href="/billing" /> : null}
          {showBillingWarning ? (
            <div className="w-full rounded-md border border-amber-400/40 bg-amber-950/40 px-4 py-3 text-amber-100 shadow-md">
              <div className="font-display text-lg">
                {props.billingStatus === 'BILLING_CANCELLED'
                  ? 'Billing has been cancelled'
                  : props.billingStatus === 'MONTHLY_CAP_REACHED'
                    ? 'Monthly billing cap reached'
                    : 'Billing is not active'}
              </div>
              <div className="mt-1 text-sm text-amber-100/90">
                {props.billingStatus === 'BILLING_CANCELLED'
                  ? 'Paid AI access is blocked immediately after cancellation. Reactivate billing to continue.'
                  : props.billingStatus === 'MONTHLY_CAP_REACHED'
                    ? 'You have reached your configured monthly paid usage cap. Increase it or wait for the next month.'
                    : 'Your Stripe subscription is not active. Resume billing to continue.'}
              </div>
            </div>
          ) : null}
          {hasBillingOverride ? (
            <div className="w-full rounded-md border border-emerald-400/40 bg-emerald-950/40 px-4 py-3 text-emerald-100 shadow-md">
              <div className="font-display text-lg">Billing override active</div>
              <div className="mt-1 text-sm text-emerald-100/90">
                This Silhouette account is on the billing override allowlist and is exempt from trial and Stripe enforcement.
              </div>
            </div>
          ) : null}
          {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('error') === 'invalid_promotion_code' ? (
            <div className="w-full rounded-md border border-red-400/40 bg-red-950/40 px-4 py-3 text-red-100 shadow-md">
              <div className="font-display text-lg">Invalid promo code</div>
              <div className="mt-1 text-sm text-red-100/90">
                The promo code you entered was not found or is not active.
              </div>
            </div>
          ) : null}

          <Section title="Trial" big>
            <BudgetCard title="Trial Credits" spentMicros={Math.min(props.lifetimeUsageMicros, props.trialTotalMicros)} capMicros={props.trialTotalMicros} />
            <div className="w-full rounded-md bg-zinc-600 px-4 py-4 text-sm text-zinc-200 shadow-md">
              <div>Lifetime AI usage: {formatUsdFromMicros(props.lifetimeUsageMicros)}</div>
              <div>Trial remaining: {formatUsdFromMicros(props.trialRemainingMicros)}</div>
              <div>{usageLabel}: {props.hasStripeSetup ? formatUsdFromCents(props.currentMonthBilledCents) : formatUsdFromMicros(props.currentMonthUsageMicros)}</div>
            </div>
          </Section>

          <Section title="Billing Status" big>
            <div className="w-full rounded-md bg-zinc-600 px-4 py-4 text-sm text-zinc-200 shadow-md">
              <div>
                Status:{' '}
                {props.billingStatus === 'BILLING_OVERRIDE'
                  ? 'Billing override'
                  : props.billingStatus === 'TRIAL_ONLY'
                  ? 'Trial only'
                  : props.billingStatus === 'BILLING_ACTIVE'
                    ? 'Billing active'
                    : props.billingStatus === 'BILLING_REQUIRED'
                      ? 'Billing setup required'
                      : props.billingStatus === 'BILLING_CANCELLED'
                        ? 'Cancelled'
                        : props.billingStatus === 'MONTHLY_CAP_REACHED'
                          ? 'Monthly cap reached'
                          : 'Subscription inactive'}
              </div>
              <div>Stripe subscription: {props.stripeSubscriptionStatus ?? (hasBillingOverride ? 'Not required' : 'Not configured')}</div>
              <div>Paid monthly hard cap: ${props.aiBillingMonthlyCapUsd}</div>
              {!hasBillingOverride ? <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <form method="post" action="/api/billing/checkout" className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="promotionCode" className="text-sm text-zinc-300">
                      Promo code
                    </label>
                    <input
                      id="promotionCode"
                      name="promotionCode"
                      type="text"
                      placeholder="Optional"
                      className="rounded-md bg-zinc-800 px-4 py-2 text-white outline-none ring-1 ring-zinc-500 focus:ring-teal-400"
                    />
                  </div>
                  <button type="submit" className="rounded-md bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-500">
                    {props.hasStripeSetup ? 'Reactivate Billing' : 'Set Up Billing'}
                  </button>
                </form>
                {showPortal ? (
                  <form method="post" action="/api/billing/portal">
                    <button type="submit" className="rounded-md bg-zinc-500 px-4 py-2 font-medium text-white hover:bg-zinc-400">
                      Manage Billing
                    </button>
                  </form>
                ) : null}
              </div> : null}
            </div>
          </Section>

          <Section title="Monthly Cap" big>
            <form method="post" action="/api/billing/cap" className="w-full rounded-md bg-zinc-600 px-4 py-4 shadow-md">
              <label htmlFor="monthlyCapUsd" className="mb-2 block text-sm text-zinc-200">
                Pay-per-use hard cap (USD per month)
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="monthlyCapUsd"
                  name="monthlyCapUsd"
                  type="number"
                  min={10}
                  max={50}
                  step={1}
                  defaultValue={props.aiBillingMonthlyCapUsd}
                  className="rounded-md bg-zinc-800 px-4 py-2 text-white outline-none ring-1 ring-zinc-500 focus:ring-teal-400"
                />
                <button type="submit" className="rounded-md bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-500">
                  Save
                </button>
              </div>
              <div className="mt-3 text-sm text-zinc-300">
                This cap applies to billed pay-per-use dollars across all linked servers once Stripe billing is active.
              </div>
            </form>
          </Section>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async function (ctx) {
  const { getAccountTrialRemainingMicros, getBillingStatus, getCurrentMonthAccountUsageMicros, getLifetimeAccountUsageMicros } = await import('../utils/budgetData');
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
