import { RecordingBillingMode } from '@prisma/client';

import { prisma } from '../prisma';

const ACCOUNT_TRIAL_TOTAL_MICROS = 5_000_000;
const ACTIVE_STRIPE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);
const BILLING_OVERRIDE_USER_IDS = new Set(
  (process.env.AI_BILLING_OVERRIDE_USER_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

export type GuildAdmissionDecision =
  | {
      allowed: true;
      billingUserId: string;
      billingMode: RecordingBillingMode;
      lifetimeUsageMicros: number;
      trialRemainingMicros: number;
      currentMonthBilledCents: number;
      monthlyCapUsd: number;
    }
  | {
      allowed: false;
      reason:
        | 'OWNER_LINK_REQUIRED'
        | 'BILLING_REQUIRED'
        | 'SUBSCRIPTION_INACTIVE'
        | 'CANCELLED'
        | 'MONTHLY_CAP_REACHED';
      billingUserId: string | null;
      lifetimeUsageMicros: number;
      trialRemainingMicros: number;
      currentMonthBilledCents: number;
      monthlyCapUsd: number;
    };

export function getBillingPageUrl(dashboardUrl: string) {
  return `${dashboardUrl.replace(/\/$/, '')}/billing`;
}

export function isBillingOverrideUser(userId: string | null | undefined) {
  return !!userId && BILLING_OVERRIDE_USER_IDS.has(userId);
}

export async function getBillingOwnerForGuild(guildId: string) {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    select: { ownerUserId: true }
  });
  return guild?.ownerUserId ?? null;
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

export async function getCurrentMonthBilledCents(userId: string, now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
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

function isStripeSubscriptionActive(status: string | null | undefined) {
  return !!status && ACTIVE_STRIPE_SUBSCRIPTION_STATUSES.has(status);
}

export async function getAccountAdmissionDecisionForGuild(guildId: string): Promise<GuildAdmissionDecision> {
  const billingUserId = await getBillingOwnerForGuild(guildId);
  if (!billingUserId) {
    return {
      allowed: false,
      reason: 'OWNER_LINK_REQUIRED',
      billingUserId: null,
      lifetimeUsageMicros: 0,
      trialRemainingMicros: 0,
      currentMonthBilledCents: 0,
      monthlyCapUsd: 10
    };
  }

  const [lifetimeUsageMicros, currentMonthBilledCents, user] = await Promise.all([
    getLifetimeAccountUsageMicros(billingUserId),
    getCurrentMonthBilledCents(billingUserId),
    prisma.user.findUnique({
      where: { id: billingUserId },
      select: {
        aiBillingMonthlyCapUsd: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeSubscriptionStatus: true,
        stripeCancelAtPeriodEnd: true
      }
    })
  ]);
  const trialRemainingMicros = Math.max(0, ACCOUNT_TRIAL_TOTAL_MICROS - lifetimeUsageMicros);
  const monthlyCapUsd = user?.aiBillingMonthlyCapUsd ?? 10;
  const hasStripeSetup = !!(user?.stripeCustomerId && user?.stripeSubscriptionId);

  if (isBillingOverrideUser(billingUserId)) {
    return {
      allowed: true,
      billingUserId,
      billingMode: RecordingBillingMode.TRIAL,
      lifetimeUsageMicros,
      trialRemainingMicros,
      currentMonthBilledCents,
      monthlyCapUsd
    };
  }

  if (trialRemainingMicros > 0) {
    return {
      allowed: true,
      billingUserId,
      lifetimeUsageMicros,
      billingMode: RecordingBillingMode.TRIAL,
      trialRemainingMicros,
      currentMonthBilledCents,
      monthlyCapUsd
    };
  }

  if (!hasStripeSetup) {
    return {
      allowed: false,
      reason: 'BILLING_REQUIRED',
      billingUserId,
      lifetimeUsageMicros,
      trialRemainingMicros,
      currentMonthBilledCents,
      monthlyCapUsd
    };
  }

  if (user?.stripeCancelAtPeriodEnd) {
    return {
      allowed: false,
      reason: 'CANCELLED',
      billingUserId,
      lifetimeUsageMicros,
      trialRemainingMicros,
      currentMonthBilledCents,
      monthlyCapUsd
    };
  }

  if (!isStripeSubscriptionActive(user?.stripeSubscriptionStatus)) {
    return {
      allowed: false,
      reason: 'SUBSCRIPTION_INACTIVE',
      billingUserId,
      lifetimeUsageMicros,
      trialRemainingMicros,
      currentMonthBilledCents,
      monthlyCapUsd
    };
  }

  if (currentMonthBilledCents >= monthlyCapUsd * 100) {
    return {
      allowed: false,
      reason: 'MONTHLY_CAP_REACHED',
      billingUserId,
      lifetimeUsageMicros,
      trialRemainingMicros,
      currentMonthBilledCents,
      monthlyCapUsd
    };
  }

  return {
    allowed: true,
    billingUserId,
    billingMode: RecordingBillingMode.PAID,
    lifetimeUsageMicros,
    trialRemainingMicros,
    currentMonthBilledCents,
    monthlyCapUsd
  };
}
