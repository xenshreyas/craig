export const ACCOUNT_TRIAL_TOTAL_MICROS = 5_000_000;
export const BILLING_MARKUP_MULTIPLIER = 5;
export const ACTIVE_STRIPE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

export function getAccountTrialTotalMicros() {
  return ACCOUNT_TRIAL_TOTAL_MICROS;
}

export function providerCostMicrosToBilledCents(costUsdMicros: number) {
  return Math.ceil((Math.max(0, costUsdMicros) * BILLING_MARKUP_MULTIPLIER) / 10_000);
}

export function isStripeSubscriptionActive(status: string | null | undefined) {
  return !!status && ACTIVE_STRIPE_SUBSCRIPTION_STATUSES.has(status);
}

export function clampBillingCapUsd(value: number) {
  if (!Number.isInteger(value) || value < 10 || value > 50) {
    throw new Error('Billing monthly cap must be an integer between 10 and 50 USD.');
  }
  return value;
}

export function getMonthWindow(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}
