import type Stripe from 'stripe';

import prisma from '../lib/prisma';
import { config } from './config';

function getMeteredSubscriptionItemId(subscription: Stripe.Subscription) {
  return (
    subscription.items.data.find((item) => item.price.id === config.stripeMeteredPriceId)?.id ??
    subscription.items.data[0]?.id ??
    null
  );
}

export async function syncUserSubscriptionFromStripe(params: {
  userId?: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  stripeCancelAtPeriodEnd: boolean;
  stripeSubscriptionItemId: string | null;
}) {
  const { userId, stripeCustomerId, stripeSubscriptionId, stripeSubscriptionStatus, stripeCancelAtPeriodEnd, stripeSubscriptionItemId } = params;

  if (!userId) {
    return prisma.user.updateMany({
      where: { stripeCustomerId },
      data: {
        stripeSubscriptionId,
        stripeSubscriptionStatus,
        stripeCancelAtPeriodEnd,
        stripeSubscriptionItemId
      }
    });
  }

  return prisma.user.upsert({
    where: { id: userId },
    update: {
      stripeCustomerId,
      stripeSubscriptionId,
      stripeSubscriptionStatus,
      stripeCancelAtPeriodEnd,
      stripeSubscriptionItemId
    },
    create: {
      id: userId,
      stripeCustomerId,
      stripeSubscriptionId,
      stripeSubscriptionStatus,
      stripeCancelAtPeriodEnd,
      stripeSubscriptionItemId
    }
  });
}

export async function applyCheckoutSessionCompleted(session: Stripe.Checkout.Session, stripe: Stripe) {
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;
  const userId = session.client_reference_id ?? session.metadata?.userId ?? null;

  if (!customerId || !subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price']
  });

  await syncUserSubscriptionFromStripe({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: subscription.status,
    stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
    stripeSubscriptionItemId: getMeteredSubscriptionItemId(subscription)
  });
}

export async function applySubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  if (!customerId) return;

  await syncUserSubscriptionFromStripe({
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: subscription.status,
    stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
    stripeSubscriptionItemId: getMeteredSubscriptionItemId(subscription)
  });
}

export async function applySubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  if (!customerId) return;

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: 'canceled',
      stripeCancelAtPeriodEnd: true,
      stripeSubscriptionItemId: null
    }
  });
}
