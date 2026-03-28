import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACCOUNT_TRIAL_TOTAL_MICROS,
  DOWNGRADED_TRIAL_SUMMARY_MODEL,
  PRIMARY_SUMMARY_MODEL,
  TRIAL_MODEL_DOWNGRADE_THRESHOLD_MICROS,
  estimateSummaryCostMicrosFromUsage,
  estimateTranscriptCostMicrosFromUsageSeconds,
  getMonthWindow,
  selectSummaryModelForAccount,
  usdToMicros
} from './index';

test('getMonthWindow returns UTC month boundaries', () => {
  const { start, end } = getMonthWindow(new Date('2026-03-26T14:00:00.000Z'));
  assert.equal(start.toISOString(), '2026-03-01T00:00:00.000Z');
  assert.equal(end.toISOString(), '2026-04-01T00:00:00.000Z');
});

test('estimateTranscriptCostMicrosFromUsageSeconds scales with provider duration usage', () => {
  assert.equal(estimateTranscriptCostMicrosFromUsageSeconds(0), 0);
  assert.equal(estimateTranscriptCostMicrosFromUsageSeconds(60), usdToMicros(0.006));
  assert.equal(estimateTranscriptCostMicrosFromUsageSeconds(600), usdToMicros(0.06));
});

test('estimateSummaryCostMicrosFromUsage uses uncached input, cached input, and output token pricing', () => {
  const cost = estimateSummaryCostMicrosFromUsage({
    input_tokens: 1000,
    output_tokens: 2000,
    input_tokens_details: {
      cached_tokens: 100
    }
  });

  const expectedUsd = (900 / 1_000_000) * 0.75 + (100 / 1_000_000) * 0.075 + (2000 / 1_000_000) * 4.5;
  assert.equal(cost, usdToMicros(expectedUsd));
});

test('account trial total is fixed at five dollars', () => {
  assert.equal(ACCOUNT_TRIAL_TOTAL_MICROS, usdToMicros(5));
});

test('selectSummaryModelForAccount uses gpt-5.4 below the four-dollar trial threshold', () => {
  assert.equal(
    selectSummaryModelForAccount({
      lifetimeUsageMicros: TRIAL_MODEL_DOWNGRADE_THRESHOLD_MICROS - 1,
      hasActiveStripeSubscription: false
    }),
    PRIMARY_SUMMARY_MODEL
  );
});

test('selectSummaryModelForAccount downgrades to gpt-5.4-mini at or above the four-dollar trial threshold', () => {
  assert.equal(
    selectSummaryModelForAccount({
      lifetimeUsageMicros: TRIAL_MODEL_DOWNGRADE_THRESHOLD_MICROS,
      hasActiveStripeSubscription: false
    }),
    DOWNGRADED_TRIAL_SUMMARY_MODEL
  );
});

test('selectSummaryModelForAccount keeps gpt-5.4 for active Stripe subscribers', () => {
  assert.equal(
    selectSummaryModelForAccount({
      lifetimeUsageMicros: ACCOUNT_TRIAL_TOTAL_MICROS,
      hasActiveStripeSubscription: true
    }),
    PRIMARY_SUMMARY_MODEL
  );
});
