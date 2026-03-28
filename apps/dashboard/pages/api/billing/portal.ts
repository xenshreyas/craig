import { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../lib/prisma';
import { parseUser } from '../../../utils';
import { config } from '../../../utils/config';
import { getBillingReturnUrl, getStripe } from '../../../utils/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const user = parseUser(req);
  if (!user) return res.redirect('/login?next=/billing');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true }
  });

  if (!dbUser?.stripeCustomerId) {
    return res.redirect('/billing?error=stripe_customer_missing');
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: dbUser.stripeCustomerId,
    return_url: getBillingReturnUrl(),
    ...(config.stripeCustomerPortalConfigurationId ? { configuration: config.stripeCustomerPortalConfigurationId } : {})
  });

  return res.redirect(303, session.url);
}
