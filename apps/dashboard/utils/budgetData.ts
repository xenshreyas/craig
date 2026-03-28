import prisma from '../lib/prisma';
import { config } from './config';
import { getAccountTrialTotalMicros, getMonthWindow, isStripeSubscriptionActive } from './budget';

export type BillingStatus =
  | 'BILLING_OVERRIDE'
  | 'TRIAL_ONLY'
  | 'BILLING_REQUIRED'
  | 'BILLING_ACTIVE'
  | 'SUBSCRIPTION_INACTIVE'
  | 'BILLING_CANCELLED'
  | 'MONTHLY_CAP_REACHED';

const billingOverrideUserIds = new Set(
  config.aiBillingOverrideUserIds
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

export function isBillingOverrideUser(userId: string) {
  return billingOverrideUserIds.has(userId);
}

export async function getGuildUsageMicros(guildId: string, date = new Date()) {
  const { start, end } = getMonthWindow(date);
  const result = await prisma.guildAiUsageEvent.aggregate({
    where: {
      guildId,
      createdAt: {
        gte: start,
        lt: end
      }
    },
    _sum: {
      costUsdMicros: true
    }
  });
  return result._sum.costUsdMicros ?? 0;
}

export async function getGuildUsageSummaries(guildIds: string[], date = new Date()) {
  if (guildIds.length === 0) return new Map<string, number>();
  const { start, end } = getMonthWindow(date);
  const grouped = await prisma.guildAiUsageEvent.groupBy({
    by: ['guildId'],
    where: {
      guildId: { in: guildIds },
      createdAt: {
        gte: start,
        lt: end
      }
    },
    _sum: {
      costUsdMicros: true
    }
  });
  return new Map(grouped.map((row) => [row.guildId, row._sum.costUsdMicros ?? 0]));
}

export async function getLifetimeAccountUsageMicros(userId: string) {
  const result = await prisma.guildAiUsageEvent.aggregate({
    where: {
      billingUserId: userId
    },
    _sum: {
      costUsdMicros: true
    }
  });
  return result._sum.costUsdMicros ?? 0;
}

export async function getCurrentMonthAccountUsageMicros(userId: string, date = new Date()) {
  const { start, end } = getMonthWindow(date);
  const result = await prisma.guildAiUsageEvent.aggregate({
    where: {
      billingUserId: userId,
      createdAt: {
        gte: start,
        lt: end
      }
    },
    _sum: {
      costUsdMicros: true
    }
  });
  return result._sum.costUsdMicros ?? 0;
}

export async function getAccountTrialRemainingMicros(userId: string) {
  const lifetimeUsageMicros = await getLifetimeAccountUsageMicros(userId);
  return Math.max(0, getAccountTrialTotalMicros() - lifetimeUsageMicros);
}

export async function getCurrentMonthBilledCents(userId: string, date = new Date()) {
  const { start, end } = getMonthWindow(date);
  const result = await prisma.stripeBillingUsageReport.aggregate({
    where: {
      billingUserId: userId,
      createdAt: {
        gte: start,
        lt: end
      }
    },
    _sum: {
      amountCents: true
    }
  });
  return result._sum.amountCents ?? 0;
}

export async function getBillingStatus(userId: string, date = new Date()) {
  if (isBillingOverrideUser(userId)) {
    const [trialRemainingMicros, currentMonthBilledCents, dbUser] = await Promise.all([
      getAccountTrialRemainingMicros(userId),
      getCurrentMonthBilledCents(userId, date),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          aiBillingMonthlyCapUsd: true
        }
      })
    ]);

    return {
      status: 'BILLING_OVERRIDE' as const,
      aiBillingMonthlyCapUsd: dbUser?.aiBillingMonthlyCapUsd ?? 10,
      trialRemainingMicros,
      currentMonthBilledCents,
      hasStripeSetup: false,
      stripeSubscriptionStatus: null,
      stripeCancelAtPeriodEnd: false
    };
  }

  const [dbUser, trialRemainingMicros, currentMonthBilledCents] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        aiBillingMonthlyCapUsd: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeSubscriptionStatus: true,
        stripeCancelAtPeriodEnd: true
      }
    }),
    getAccountTrialRemainingMicros(userId),
    getCurrentMonthBilledCents(userId, date)
  ]);

  const monthlyCapUsd = dbUser?.aiBillingMonthlyCapUsd ?? 10;
  const hasStripeSetup = !!(dbUser?.stripeCustomerId && dbUser?.stripeSubscriptionId);
  const subscriptionActive = isStripeSubscriptionActive(dbUser?.stripeSubscriptionStatus);
  const billingCancelled = !!dbUser?.stripeCancelAtPeriodEnd;
  const monthlyCapReached = currentMonthBilledCents >= monthlyCapUsd * 100;

  let status: BillingStatus = 'TRIAL_ONLY';
  if (trialRemainingMicros <= 0 && !hasStripeSetup) status = 'BILLING_REQUIRED';
  else if (billingCancelled) status = 'BILLING_CANCELLED';
  else if (hasStripeSetup && !subscriptionActive) status = 'SUBSCRIPTION_INACTIVE';
  else if (hasStripeSetup && monthlyCapReached) status = 'MONTHLY_CAP_REACHED';
  else if (hasStripeSetup && subscriptionActive) status = 'BILLING_ACTIVE';

  return {
    status,
    aiBillingMonthlyCapUsd: monthlyCapUsd,
    trialRemainingMicros,
    currentMonthBilledCents,
    hasStripeSetup,
    stripeSubscriptionStatus: dbUser?.stripeSubscriptionStatus ?? null,
    stripeCancelAtPeriodEnd: billingCancelled
  };
}
