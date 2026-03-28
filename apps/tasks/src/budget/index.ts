import { AiUsageKind, PrismaClient } from '@prisma/client';
import config from 'config';

export const ACCOUNT_TRIAL_TOTAL_USD = 5;
export const ACCOUNT_TRIAL_TOTAL_MICROS = usdToMicros(ACCOUNT_TRIAL_TOTAL_USD);
export const TRIAL_MODEL_DOWNGRADE_THRESHOLD_USD = 4;
export const TRIAL_MODEL_DOWNGRADE_THRESHOLD_MICROS = usdToMicros(TRIAL_MODEL_DOWNGRADE_THRESHOLD_USD);
export const BILLING_MARKUP_MULTIPLIER = 5;
export const ACTIVE_STRIPE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);
export const PRIMARY_SUMMARY_MODEL = 'gpt-5.4';
export const DOWNGRADED_TRIAL_SUMMARY_MODEL = 'gpt-5.4-mini';

const BILLING_OVERRIDE_USER_IDS = new Set(
  (process.env.AI_BILLING_OVERRIDE_USER_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

type BudgetConfig = {
  monthlyCapUsd: number;
  transcriptCostPerMinuteUsd: number;
  summaryInputCostPer1MTokensUsd: number;
  summaryCachedInputCostPer1MTokensUsd: number;
  summaryOutputCostPer1MTokensUsd: number;
};

const rawBudgetConfig = config.has('aiBudget') ? (config.get('aiBudget') as Partial<BudgetConfig>) : {};

const defaults: BudgetConfig = {
  monthlyCapUsd: 15,
  transcriptCostPerMinuteUsd: 0.006,
  summaryInputCostPer1MTokensUsd: 0.75,
  summaryCachedInputCostPer1MTokensUsd: 0.075,
  summaryOutputCostPer1MTokensUsd: 4.5
};

export const budgetConfig: BudgetConfig = {
  monthlyCapUsd: readNumber(process.env.AI_BUDGET_MONTHLY_CAP_USD, rawBudgetConfig.monthlyCapUsd, defaults.monthlyCapUsd),
  transcriptCostPerMinuteUsd: readNumber(
    process.env.AI_BUDGET_TRANSCRIPT_COST_PER_MINUTE_USD,
    rawBudgetConfig.transcriptCostPerMinuteUsd,
    defaults.transcriptCostPerMinuteUsd
  ),
  summaryInputCostPer1MTokensUsd: readNumber(
    process.env.AI_BUDGET_SUMMARY_INPUT_COST_PER_1M_TOKENS_USD,
    rawBudgetConfig.summaryInputCostPer1MTokensUsd,
    defaults.summaryInputCostPer1MTokensUsd
  ),
  summaryCachedInputCostPer1MTokensUsd: readNumber(
    process.env.AI_BUDGET_SUMMARY_CACHED_INPUT_COST_PER_1M_TOKENS_USD,
    rawBudgetConfig.summaryCachedInputCostPer1MTokensUsd,
    defaults.summaryCachedInputCostPer1MTokensUsd
  ),
  summaryOutputCostPer1MTokensUsd: readNumber(
    process.env.AI_BUDGET_SUMMARY_OUTPUT_COST_PER_1M_TOKENS_USD,
    rawBudgetConfig.summaryOutputCostPer1MTokensUsd,
    defaults.summaryOutputCostPer1MTokensUsd
  )
};

export function getMonthWindow(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

export async function getBillingOwnerForGuild(prisma: PrismaClient, guildId: string) {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    select: { ownerUserId: true }
  });
  return guild?.ownerUserId ?? null;
}

export async function getGuildMonthlyUsageMicros(prisma: PrismaClient, guildId: string, now = new Date()) {
  const { start, end } = getMonthWindow(now);
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

export async function getLifetimeAccountUsageMicros(prisma: PrismaClient, userId: string) {
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

export async function getCurrentMonthAccountUsageMicros(prisma: PrismaClient, userId: string, now = new Date()) {
  const { start, end } = getMonthWindow(now);
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

export async function getCurrentMonthBilledCents(prisma: PrismaClient, userId: string, now = new Date()) {
  const { start, end } = getMonthWindow(now);
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

export function isBillingOverrideUser(userId: string | null | undefined) {
  return !!userId && BILLING_OVERRIDE_USER_IDS.has(userId);
}

export async function getAccountTrialRemainingMicros(prisma: PrismaClient, userId: string) {
  const lifetimeUsageMicros = await getLifetimeAccountUsageMicros(prisma, userId);
  return Math.max(0, ACCOUNT_TRIAL_TOTAL_MICROS - lifetimeUsageMicros);
}

export async function getAccountAdmissionDecision(prisma: PrismaClient, userId: string) {
  const [lifetimeUsageMicros, user, currentMonthBilledCents] = await Promise.all([
    getLifetimeAccountUsageMicros(prisma, userId),
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
    getCurrentMonthBilledCents(prisma, userId)
  ]);
  const trialRemainingMicros = Math.max(0, ACCOUNT_TRIAL_TOTAL_MICROS - lifetimeUsageMicros);
  const hasStripeSetup = !!(user?.stripeCustomerId && user?.stripeSubscriptionId);
  const subscriptionActive = isStripeSubscriptionActive(user?.stripeSubscriptionStatus);
  const monthlyCapUsd = user?.aiBillingMonthlyCapUsd ?? 10;
  const currentMonthCapCents = monthlyCapUsd * 100;
  let decision:
    | 'ALLOW_TRIAL'
    | 'ALLOW_PAID'
    | 'BLOCK_BILLING_REQUIRED'
    | 'BLOCK_SUBSCRIPTION_INACTIVE'
    | 'BLOCK_CANCELLED'
    | 'BLOCK_MONTHLY_CAP_REACHED';

  if (trialRemainingMicros > 0) decision = 'ALLOW_TRIAL';
  else if (!hasStripeSetup) decision = 'BLOCK_BILLING_REQUIRED';
  else if (user?.stripeCancelAtPeriodEnd) decision = 'BLOCK_CANCELLED';
  else if (!subscriptionActive) decision = 'BLOCK_SUBSCRIPTION_INACTIVE';
  else if (currentMonthBilledCents >= currentMonthCapCents) decision = 'BLOCK_MONTHLY_CAP_REACHED';
  else decision = 'ALLOW_PAID';

  return {
    lifetimeUsageMicros,
    trialTotalMicros: ACCOUNT_TRIAL_TOTAL_MICROS,
    trialRemainingMicros,
    currentMonthBilledCents,
    monthlyCapUsd,
    decision
  };
}

export function getMonthlyCapMicros() {
  return usdToMicros(budgetConfig.monthlyCapUsd);
}

export async function isGuildBudgetAvailable(prisma: PrismaClient, guildId: string, now = new Date()) {
  const spentMicros = await getGuildMonthlyUsageMicros(prisma, guildId, now);
  return {
    spentMicros,
    capMicros: getMonthlyCapMicros(),
    allowed: spentMicros < getMonthlyCapMicros()
  };
}

export async function recordUsageEvent(params: {
  prisma: PrismaClient;
  guildId: string;
  billingUserId?: string | null;
  recordingId: string;
  kind: AiUsageKind;
  model: string;
  costUsdMicros: number;
}) {
  const { prisma, guildId, billingUserId, recordingId, kind, model, costUsdMicros } = params;
  await prisma.guild.upsert({
    where: { id: guildId },
    update: {},
    create: {
      id: guildId,
      accessRoles: []
    }
  });
  return prisma.guildAiUsageEvent.upsert({
    where: {
      recordingId_kind: {
        recordingId,
        kind
      }
    },
    update: {
      guildId,
      billingUserId,
      model,
      costUsdMicros
    },
    create: {
      guildId,
      billingUserId,
      recordingId,
      kind,
      model,
      costUsdMicros
    }
  });
}

export function estimateTranscriptCostMicrosFromUsageSeconds(usageSeconds: number) {
  const minutes = Math.max(0, usageSeconds) / 60;
  return usdToMicros(minutes * budgetConfig.transcriptCostPerMinuteUsd);
}

export function estimateSummaryCostMicrosFromUsage(usage: {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: {
    cached_tokens?: number;
  };
}) {
  const inputTokens = Math.max(0, usage.input_tokens ?? 0);
  const cachedTokens = Math.max(0, usage.input_tokens_details?.cached_tokens ?? 0);
  const uncachedInputTokens = Math.max(0, inputTokens - cachedTokens);
  const outputTokens = Math.max(0, usage.output_tokens ?? 0);
  const totalUsd =
    (uncachedInputTokens / 1_000_000) * budgetConfig.summaryInputCostPer1MTokensUsd +
    (cachedTokens / 1_000_000) * budgetConfig.summaryCachedInputCostPer1MTokensUsd +
    (outputTokens / 1_000_000) * budgetConfig.summaryOutputCostPer1MTokensUsd;

  return usdToMicros(totalUsd);
}

export function providerCostMicrosToBilledCents(costUsdMicros: number) {
  return Math.ceil((Math.max(0, costUsdMicros) * BILLING_MARKUP_MULTIPLIER) / 10_000);
}

export function isStripeSubscriptionActive(status: string | null | undefined) {
  return !!status && ACTIVE_STRIPE_SUBSCRIPTION_STATUSES.has(status);
}

export function selectSummaryModelForAccount(params: {
  lifetimeUsageMicros: number;
  hasActiveStripeSubscription: boolean;
  isBillingOverride?: boolean;
}) {
  if (params.isBillingOverride) return PRIMARY_SUMMARY_MODEL;
  if (params.hasActiveStripeSubscription) return PRIMARY_SUMMARY_MODEL;
  if (params.lifetimeUsageMicros >= TRIAL_MODEL_DOWNGRADE_THRESHOLD_MICROS) return DOWNGRADED_TRIAL_SUMMARY_MODEL;
  return PRIMARY_SUMMARY_MODEL;
}

export async function getSummaryModelForRecording(prisma: PrismaClient, params: { billingUserId?: string | null }) {
  const billingUserId = params.billingUserId ?? null;
  if (!billingUserId) return DOWNGRADED_TRIAL_SUMMARY_MODEL;
  if (isBillingOverrideUser(billingUserId)) return PRIMARY_SUMMARY_MODEL;

  const [lifetimeUsageMicros, user] = await Promise.all([
    getLifetimeAccountUsageMicros(prisma, billingUserId),
    prisma.user.findUnique({
      where: { id: billingUserId },
      select: {
        stripeSubscriptionStatus: true,
        stripeCancelAtPeriodEnd: true
      }
    })
  ]);

  return selectSummaryModelForAccount({
    lifetimeUsageMicros,
    hasActiveStripeSubscription: !!user && !user.stripeCancelAtPeriodEnd && isStripeSubscriptionActive(user.stripeSubscriptionStatus)
  });
}

export function usdToMicros(value: number) {
  return Math.max(0, Math.round(value * 1_000_000));
}

function readNumber(envValue: string | undefined, configuredValue: number | undefined, fallback: number) {
  const firstValid = [envValue, configuredValue, fallback].find((candidate) => {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) && parsed >= 0;
  });
  return Number(firstValid);
}
