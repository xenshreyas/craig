import test from 'node:test';
import assert from 'node:assert/strict';

import { ACCOUNT_TRIAL_TOTAL_MICROS, clampBillingCapUsd, getMonthWindow } from './budget';

test('account trial total is fixed at five dollars', () => {
  assert.equal(ACCOUNT_TRIAL_TOTAL_MICROS, 5_000_000);
});

test('getMonthWindow returns UTC month boundaries', () => {
  const { start, end } = getMonthWindow(new Date('2026-03-26T14:00:00.000Z'));
  assert.equal(start.toISOString(), '2026-03-01T00:00:00.000Z');
  assert.equal(end.toISOString(), '2026-04-01T00:00:00.000Z');
});

test('clampBillingCapUsd accepts valid integer caps', () => {
  assert.equal(clampBillingCapUsd(10), 10);
  assert.equal(clampBillingCapUsd(50), 50);
});

test('clampBillingCapUsd rejects invalid caps', () => {
  assert.throws(() => clampBillingCapUsd(9));
  assert.throws(() => clampBillingCapUsd(51));
  assert.throws(() => clampBillingCapUsd(10.5));
});
