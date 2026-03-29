export function PricingSection() {
  const checkIcon = (
    <svg className="w-4 h-4 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-800/30 border-y border-zinc-700/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Simple, usage-based pricing
          </h2>
          <p className="text-lg text-zinc-400">
            Start for free. Pay only for AI processing. No subscriptions.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Trial */}
          <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-8 hover:border-zinc-600/70 transition-colors">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-1">Free Trial</h3>
              <p className="text-sm text-zinc-400 mb-5">Try Silhouette with no commitment</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">$5</span>
                <span className="text-zinc-400 text-sm">in AI credits</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">No credit card required</p>
            </div>

            <a
              href="/dashboard"
              className="block w-full text-center rounded-lg border border-zinc-600 bg-transparent px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700/50 transition-colors mb-6"
            >
              Get Started Free
            </a>

            <ul className="space-y-3">
              {[
                'All linked servers',
                'AI transcription (Whisper)',
                'Meeting summaries (GPT-4)',
                'Publish to #silhouette',
                'Web dashboard access',
                'Download recordings',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                  {checkIcon}
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pay-per-use — highlighted */}
          <div className="rounded-xl bg-zinc-800/60 border-2 border-teal-500/50 p-8 relative shadow-lg shadow-teal-900/20">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-teal-600 text-white px-4 py-1 rounded-full text-xs font-semibold tracking-wide">
                Most popular
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-1">Pay-per-Use</h3>
              <p className="text-sm text-zinc-400 mb-5">After trial credits are exhausted</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">$10</span>
                <span className="text-zinc-400 text-sm">– $50 / month cap</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">You set the cap. No surprise overage.</p>
            </div>

            <a
              href="/billing"
              className="block w-full text-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors mb-6"
            >
              Set Up Billing
            </a>

            <ul className="space-y-3">
              {[
                'Everything in Free Trial',
                'Stripe subscription billing',
                'Configurable hard cap ($10–$50)',
                'Real-time usage dashboard',
                'No interruptions under cap',
                'Cancel anytime',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                  {checkIcon}
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Self-host / Enterprise */}
          <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-8 hover:border-zinc-600/70 transition-colors">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-1">Self-Host</h3>
              <p className="text-sm text-zinc-400 mb-5">Deploy on your own infrastructure</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">Free</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Open-source, bring your own API keys</p>
            </div>

            <a
              href="https://github.com/CraigChat/craig"
              target="_blank"
              rel="noreferrer noopener"
              className="block w-full text-center rounded-lg border border-zinc-600 bg-transparent px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700/50 transition-colors mb-6"
            >
              View on GitHub
            </a>

            <ul className="space-y-3">
              {[
                'Full source code access',
                'Use your own OpenAI keys',
                'Custom deployment options',
                'No usage limits',
                'Community support',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                  {checkIcon}
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
