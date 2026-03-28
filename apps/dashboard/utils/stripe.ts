import Stripe from 'stripe';

import { config } from './config';

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!config.stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(config.stripeSecretKey, {
      apiVersion: '2026-03-25.dahlia'
    });
  }

  return stripeClient;
}

export function getBillingReturnUrl() {
  return config.stripeBillingReturnUrl || `${config.appUri.replace(/\/$/, '')}/billing`;
}

export function getStripePriceId() {
  if (!config.stripeMeteredPriceId) {
    throw new Error('STRIPE_METERED_PRICE_ID is not configured.');
  }
  return config.stripeMeteredPriceId;
}
