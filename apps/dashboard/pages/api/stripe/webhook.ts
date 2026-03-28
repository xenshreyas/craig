import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

import { config } from '../../../utils/config';
import { getStripe } from '../../../utils/stripe';
import { applyCheckoutSessionCompleted, applySubscriptionDeleted, applySubscriptionUpdated } from '../../../utils/stripeBilling';

export const configApi = {
  api: {
    bodyParser: false
  }
};

export { configApi as config };

async function getRawBody(req: NextApiRequest) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks as unknown as readonly Uint8Array[]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  if (!config.stripeWebhookSecret) return res.status(500).send('Stripe webhook secret is not configured.');

  const signature = req.headers['stripe-signature'];
  if (!signature || Array.isArray(signature)) return res.status(400).send('Missing Stripe signature.');

  const stripe = getStripe();
  const rawBody = await getRawBody(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await applyCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, stripe);
      break;
    case 'customer.subscription.updated':
      await applySubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await applySubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'checkout.session.expired':
      break;
    default:
      break;
  }

  return res.status(200).json({ received: true });
}
