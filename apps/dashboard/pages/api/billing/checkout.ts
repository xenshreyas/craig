import { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../lib/prisma';
import { parseUser } from '../../../utils';
import { getBillingReturnUrl, getStripe, getStripePriceId } from '../../../utils/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const user = parseUser(req);
  if (!user) return res.redirect('/login?next=/billing');

  const stripe = getStripe();
  const dbUser = await prisma.user.upsert({
    where: { id: user.id },
    update: {},
    create: { id: user.id }
  });

  let customerId = dbUser.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: user.username,
      metadata: {
        userId: user.id,
        discordUserId: user.id
      }
    });

    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId }
    });
  }

  const returnUrl = getBillingReturnUrl();
  const rawPromotionCode = typeof req.body?.promotionCode === 'string' ? req.body.promotionCode.trim() : '';
  let promotionCodeId: string | null = null;

  if (rawPromotionCode) {
    const promotionCodes = await stripe.promotionCodes.list({
      code: rawPromotionCode,
      active: true,
      limit: 10
    });

    const matchedCode = promotionCodes.data.find((code) => code.code.toLowerCase() === rawPromotionCode.toLowerCase());
    if (!matchedCode) {
      return res.redirect('/billing?error=invalid_promotion_code');
    }

    promotionCodeId = matchedCode.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    payment_method_collection: promotionCodeId ? 'if_required' : 'always',
    success_url: `${returnUrl}?r=billing_setup_started`,
    cancel_url: `${returnUrl}?r=billing_setup_cancelled`,
    line_items: [
      {
        price: getStripePriceId()
      }
    ],
    ...(promotionCodeId
      ? {
          discounts: [
            {
              promotion_code: promotionCodeId
            }
          ]
        }
      : {}),
    metadata: {
      userId: user.id
    },
    subscription_data: {
      metadata: {
        userId: user.id
      }
    }
  });

  if (!session.url) return res.status(500).send('Stripe checkout session did not provide a redirect URL.');
  return res.redirect(303, session.url);
}
