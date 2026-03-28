interface BillingBannerProps {
  href?: string;
}

export default function BillingBanner({ href = '/billing' }: BillingBannerProps) {
  return (
    <div className="w-full rounded-md border border-red-400/40 bg-red-950/40 px-4 py-3 text-red-100 shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-display text-lg">AI trial exhausted</div>
          <div className="text-sm text-red-100/90">
            Your included credits are gone. Configure billing in the dashboard to keep using Silhouette AI features.
          </div>
        </div>
        <a
          href={href}
          className="inline-flex items-center justify-center rounded-md bg-red-500 px-4 py-2 font-medium text-white transition-colors hover:bg-red-400"
        >
          Open Billing
        </a>
      </div>
    </div>
  );
}
