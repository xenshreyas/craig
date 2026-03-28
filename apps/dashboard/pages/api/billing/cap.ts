import { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../lib/prisma';
import { parseUser } from '../../../utils';
import { clampBillingCapUsd } from '../../../utils/budget';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const user = parseUser(req);
  if (!user) return res.redirect('/login?next=/billing');

  try {
    const monthlyCapUsd = clampBillingCapUsd(Number(req.body?.monthlyCapUsd));
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        aiBillingMonthlyCapUsd: monthlyCapUsd
      },
      create: {
        id: user.id,
        aiBillingMonthlyCapUsd: monthlyCapUsd
      }
    });
    return res.redirect('/billing?r=billing_cap_saved');
  } catch (err) {
    return res.redirect('/billing?error=invalid_billing_cap');
  }
}
