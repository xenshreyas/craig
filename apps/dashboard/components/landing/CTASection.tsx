export function CTASection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-800/30 border-t border-zinc-700/30 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-5">
          Start capturing your meetings today.
        </h2>
        <p className="text-lg text-zinc-400 mb-10 max-w-xl mx-auto">
          $5 in free AI credits included. No credit card required. Add Silhouette to your Discord server in under a minute.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="/dashboard"
            className="inline-flex items-center rounded-lg bg-teal-600 px-8 py-3.5 text-base font-medium text-white hover:bg-teal-500 transition-colors shadow-lg shadow-teal-900/30"
          >
            Open Dashboard →
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center rounded-lg border border-zinc-600/60 bg-zinc-800/40 px-8 py-3.5 text-base font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Learn more
          </a>
        </div>
      </div>
    </section>
  );
}
