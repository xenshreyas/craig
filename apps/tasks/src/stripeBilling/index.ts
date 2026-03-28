import { RecordingBillingMode, StripeBillingUsageReportStatus, SummaryStatus, TranscriptStatus } from '@prisma/client';
import Stripe from 'stripe';

import { prisma } from '../prisma';
import { providerCostMicrosToBilledCents } from '../budget';
import { createLogger } from '../logger';

const logger = createLogger('stripeBilling');
const MAX_REPORT_ATTEMPTS = 8;

let stripeClient: Stripe | null = null;
let meteredEventNamePromise: Promise<string> | null = null;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia'
    });
  }

  return stripeClient;
}

function isTerminalTranscriptStatus(status: TranscriptStatus | null | undefined) {
  return status === TranscriptStatus.COMPLETE || status === TranscriptStatus.ERROR || status === TranscriptStatus.SKIPPED;
}

function isTerminalSummaryStatus(status: SummaryStatus | null | undefined) {
  return status === SummaryStatus.COMPLETE || status === SummaryStatus.ERROR || status === SummaryStatus.SKIPPED;
}

async function getMeteredEventName() {
  const priceId = process.env.STRIPE_METERED_PRICE_ID;
  if (!priceId) {
    throw new Error('STRIPE_METERED_PRICE_ID is not configured.');
  }

  if (!meteredEventNamePromise) {
    meteredEventNamePromise = (async () => {
      const stripe = getStripe();
      const price = await stripe.prices.retrieve(priceId);
      const meterId = price.recurring?.meter;
      if (!meterId) {
        throw new Error(`Stripe price ${priceId} does not expose a meter.`);
      }

      const meter = await stripe.billing.meters.retrieve(meterId);
      return meter.event_name;
    })();
  }

  return meteredEventNamePromise;
}

async function getTerminalPaidRecordingState(recordingId: string) {
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
    include: {
      transcript: { select: { status: true } },
      summary: { select: { status: true } },
      stripeBillingUsageReport: true
    }
  });

  if (!recording || !recording.billingUserId || recording.billingMode !== RecordingBillingMode.PAID) {
    return null;
  }

  const transcriptStatus = recording.transcript?.status;
  const summaryStatus = recording.summary?.status;

  if (!isTerminalTranscriptStatus(transcriptStatus)) return null;
  if (transcriptStatus === TranscriptStatus.COMPLETE && !isTerminalSummaryStatus(summaryStatus)) return null;

  return recording;
}

async function getRecordingProviderCostMicros(recordingId: string) {
  const result = await prisma.guildAiUsageEvent.aggregate({
    where: { recordingId },
    _sum: {
      costUsdMicros: true
    }
  });

  return result._sum.costUsdMicros ?? 0;
}

async function reportUsage(reportId: string) {
  const report = await prisma.stripeBillingUsageReport.findUnique({
    where: { id: reportId }
  });
  if (!report) return;
  if (report.status === StripeBillingUsageReportStatus.REPORTED) return;
  if (report.amountCents <= 0) return;

  try {
    const stripe = getStripe();
    const user = await prisma.user.findUnique({
      where: { id: report.billingUserId },
      select: { stripeCustomerId: true }
    });
    if (!user?.stripeCustomerId) {
      throw new Error(`No Stripe customer ID stored for billing user ${report.billingUserId}.`);
    }

    await stripe.billing.meterEvents.create({
      event_name: await getMeteredEventName(),
      identifier: `recording-${report.recordingId}`,
      payload: {
        stripe_customer_id: user.stripeCustomerId,
        value: String(report.amountCents)
      },
      timestamp: Math.floor(Date.now() / 1000),
    });

    await prisma.stripeBillingUsageReport.update({
      where: { id: report.id },
      data: {
        status: StripeBillingUsageReportStatus.REPORTED,
        reportedAt: new Date(),
        attempts: { increment: 1 },
        lastError: null
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 1000) : String(err).slice(0, 1000);
    await prisma.stripeBillingUsageReport.update({
      where: { id: report.id },
      data: {
        status: StripeBillingUsageReportStatus.FAILED,
        attempts: { increment: 1 },
        lastError: message
      }
    });
    logger.error(`Stripe usage reporting failed for recording ${report.recordingId}`, err);
  }
}

export async function finalizeStripeBillingForRecording(recordingId: string) {
  const recording = await getTerminalPaidRecordingState(recordingId);
  if (!recording) return;
  if (recording.stripeBillingUsageReport?.status === StripeBillingUsageReportStatus.REPORTED) return;

  const user = await prisma.user.findUnique({
    where: { id: recording.billingUserId! },
    select: {
      stripeSubscriptionItemId: true
    }
  });

  if (!user?.stripeSubscriptionItemId) {
    logger.warn('Skipping Stripe billing finalization for %s because no subscription item is stored.', recordingId);
    return;
  }

  const providerCostUsdMicros = await getRecordingProviderCostMicros(recordingId);
  const amountCents = providerCostMicrosToBilledCents(providerCostUsdMicros);
  if (amountCents <= 0) return;

  const saved = await prisma.stripeBillingUsageReport.upsert({
    where: { recordingId },
    update: {
      billingUserId: recording.billingUserId!,
      amountCents,
      providerCostUsdMicros,
      stripeSubscriptionItemId: user.stripeSubscriptionItemId,
      status: StripeBillingUsageReportStatus.PENDING
    },
    create: {
      recordingId,
      billingUserId: recording.billingUserId!,
      amountCents,
      providerCostUsdMicros,
      stripeSubscriptionItemId: user.stripeSubscriptionItemId,
      status: StripeBillingUsageReportStatus.PENDING
    }
  });

  if (saved.status !== StripeBillingUsageReportStatus.REPORTED) {
    await reportUsage(saved.id);
  }
}

export async function retryFailedStripeBillingReports(limit = 50) {
  const failedReports = await prisma.stripeBillingUsageReport.findMany({
    where: {
      status: StripeBillingUsageReportStatus.FAILED,
      attempts: {
        lt: MAX_REPORT_ATTEMPTS
      }
    },
    orderBy: {
      updatedAt: 'asc'
    },
    take: limit
  });

  for (const report of failedReports) {
    await reportUsage(report.id);
  }

  return failedReports.length;
}
