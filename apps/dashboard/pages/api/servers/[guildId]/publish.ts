import { SummaryPublishStatus, SummaryStatus } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../../../lib/prisma';
import { enqueueSummaryPublish } from '../../../../lib/summaryPublish';
import { parseUser } from '../../../../utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }

  const user = parseUser(req);
  if (!user) return res.redirect('/login');

  const guildId = typeof req.query.guildId === 'string' ? req.query.guildId : null;
  const recordingId = typeof req.body?.recordingId === 'string' ? req.body.recordingId : null;
  const returnTo =
    typeof req.body?.returnTo === 'string' && req.body.returnTo.startsWith('/') ? req.body.returnTo : `/servers/${guildId ?? ''}`;
  if (!guildId || !recordingId) return res.redirect(appendQuery(returnTo, 'error=invalid_publish_request'));

  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild || guild.ownerUserId !== user.id) return res.status(404).send('Not found');

  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
    include: { summary: true }
  });
  if (!recording || recording.guildId !== guildId || !recording.summary) return res.status(404).send('Not found');
  if (recording.summary.status !== SummaryStatus.COMPLETE) return res.redirect(appendQuery(returnTo, 'error=summary_not_ready'));
  if (recording.summary.publishStatus === SummaryPublishStatus.PUBLISHED || recording.summary.publishStatus === SummaryPublishStatus.PUBLISHING) {
    return res.redirect(returnTo);
  }

  await prisma.recordingSummary.update({
    where: { recordingId },
    data: {
      publishStatus: SummaryPublishStatus.PUBLISHING,
      publishError: null
    }
  });

  try {
    await enqueueSummaryPublish({ recordingId, guildId });
  } catch (err) {
    await prisma.recordingSummary.update({
      where: { recordingId },
      data: {
        publishStatus: SummaryPublishStatus.FAILED,
        publishError: 'Failed to enqueue publish job.'
      }
    });
    return res.redirect(appendQuery(returnTo, 'error=publish_enqueue_failed'));
  }

  return res.redirect(appendQuery(returnTo, 'r=publish_started'));
}

function appendQuery(path: string, query: string) {
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
}
