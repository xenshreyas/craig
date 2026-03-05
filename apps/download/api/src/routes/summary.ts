import { SummaryStatus } from '@prisma/client';
import { RouteOptions } from 'fastify';

import { prisma } from '../prisma';
import { ErrorCode } from '../util';
import { getRecordingAccess, recordingAccessKeyMatches } from '../util/recording';

export const statusRoute: RouteOptions = {
  method: 'GET',
  url: '/api/recording/:id/summary',
  handler: async (request, reply) => {
    const { id } = request.params as Record<string, string>;
    if (!id) return reply.status(400).send({ ok: false, error: 'Invalid ID', code: ErrorCode.INVALID_ID });
    const { key } = request.query as Record<string, string>;
    if (!key) return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });

    const recording = await getRecordingAccess(id);
    if (!recording) return reply.status(404).send({ ok: false, error: 'Recording not found', code: ErrorCode.RECORDING_NOT_FOUND });
    if (!recordingAccessKeyMatches(recording, key)) return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });
    if (process.env.SUMMARY_ENABLED === 'false')
      return reply.status(200).send({
        ok: true,
        summary: { status: SummaryStatus.SKIPPED, errorCode: 'SUMMARY_DISABLED', errorMessage: 'Summary generation is disabled.' }
      });

    const summary = await prisma.recordingSummary.findUnique({ where: { recordingId: id } });
    if (!summary) return reply.status(200).send({ ok: true, summary: { status: SummaryStatus.PENDING } });

    return reply.status(200).send({
      ok: true,
      summary: {
        status: summary.status,
        preview: summary.preview,
        errorCode: summary.errorCode,
        errorMessage: summary.errorMessage,
        startedAt: summary.startedAt,
        completedAt: summary.completedAt
      }
    });
  }
};

export const markdownRoute: RouteOptions = {
  method: 'GET',
  url: '/api/recording/:id/summary.md',
  handler: async (request, reply) => {
    const { id } = request.params as Record<string, string>;
    if (!id) return reply.status(400).send({ ok: false, error: 'Invalid ID', code: ErrorCode.INVALID_ID });
    const { key } = request.query as Record<string, string>;
    if (!key) return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });

    const recording = await getRecordingAccess(id);
    if (!recording) return reply.status(404).send({ ok: false, error: 'Recording not found', code: ErrorCode.RECORDING_NOT_FOUND });
    if (!recordingAccessKeyMatches(recording, key)) return reply.status(403).send({ ok: false, error: 'Invalid key', code: ErrorCode.INVALID_KEY });

    const summary = await prisma.recordingSummary.findUnique({ where: { recordingId: id } });
    if (!summary) return reply.status(404).send({ ok: false, error: 'Summary not found', code: ErrorCode.SUMMARY_NOT_FOUND });
    if (summary.status !== SummaryStatus.COMPLETE || !summary.markdown)
      return reply.status(409).send({ ok: false, error: 'Summary is not ready', code: ErrorCode.SUMMARY_NOT_READY });

    return reply
      .status(200)
      .headers({
        'content-disposition': `attachment; filename=${id}-summary.md`,
        'content-type': 'text/markdown; charset=utf-8'
      })
      .send(summary.markdown);
  }
};
