export function HeroSection() {
  return (
    <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-teal-600/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Badge */}
        <div className="flex justify-start mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-sm text-teal-400">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            Powered by OpenAI Whisper &amp; GPT-5.4
          </span>
        </div>

        {/* Heading */}
        <div className="max-w-4xl">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
            Record your Discord meetings.{' '}
            <span className="text-teal-400">AI notes, automatically.</span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl">
            Silhouette captures multi-track audio from any Discord voice channel and delivers accurate transcriptions
            and AI-generated meeting summaries — right in your server.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 mb-20">
            <a
              href="/dashboard"
              className="inline-flex items-center rounded-lg bg-teal-600 px-6 py-3 text-base font-medium text-white hover:bg-teal-500 transition-colors shadow-lg shadow-teal-900/30"
            >
              Open Dashboard →
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center rounded-lg border border-zinc-600/60 bg-zinc-800/40 px-6 py-3 text-base font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              How it works
            </a>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="relative">
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl -z-10" />

          <div className="rounded-xl overflow-hidden border border-zinc-700/50 bg-zinc-800/60 shadow-2xl shadow-black/40">
            {/* Browser chrome */}
            <div className="bg-zinc-900/80 border-b border-zinc-700/50 px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-zinc-800 border border-zinc-700/50 rounded-md px-3 py-1 text-xs text-zinc-500 max-w-xs">
                  silhouettenotes.com/dashboard
                </div>
              </div>
            </div>

            {/* Mock dashboard content */}
            <div className="p-6 bg-gradient-to-b from-zinc-800/60 to-zinc-900/80">
              {/* Header row */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/20" />
                  <div>
                    <div className="w-24 h-2.5 bg-zinc-600 rounded-full mb-1.5" />
                    <div className="w-16 h-2 bg-zinc-700 rounded-full" />
                  </div>
                </div>
                <div className="w-20 h-7 bg-zinc-700/60 rounded-lg" />
              </div>

              {/* Usage bar */}
              <div className="rounded-lg bg-zinc-900/40 border border-zinc-700/50 p-4 mb-4">
                <div className="flex justify-between mb-2">
                  <div className="w-32 h-2.5 bg-zinc-600 rounded-full" />
                  <div className="w-20 h-2.5 bg-zinc-600 rounded-full" />
                </div>
                <div className="h-1.5 bg-zinc-700 rounded-full mb-1">
                  <div className="h-1.5 w-1/12 bg-teal-500 rounded-full" />
                </div>
              </div>

              {/* Recordings table */}
              <div className="rounded-lg bg-zinc-900/40 border border-zinc-700/50 overflow-hidden">
                <div className="bg-black/20 px-4 py-2.5 grid grid-cols-4 gap-4">
                  {['Created', 'Recording ID', 'Transcript', 'Summary'].map((h) => (
                    <div key={h} className="text-xs text-zinc-500 uppercase tracking-wider">{h}</div>
                  ))}
                </div>
                {[
                  { t: 'COMPLETE', s: 'COMPLETE', pub: true },
                  { t: 'COMPLETE', s: 'COMPLETE', pub: true },
                  { t: 'ERROR', s: 'NONE', pub: false },
                ].map((row, i) => (
                  <div key={i} className="px-4 py-3 grid grid-cols-4 gap-4 border-t border-zinc-700/50">
                    <div className="text-xs text-zinc-400">Today at {3 - i}:00 pm</div>
                    <div className="w-20 h-2.5 bg-zinc-700 rounded-full mt-0.5" />
                    <div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.t === 'COMPLETE' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                        {row.t === 'COMPLETE' ? 'Complete' : 'Error'}
                      </span>
                    </div>
                    <div>
                      {row.s === 'COMPLETE' ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10">Complete</span>
                      ) : (
                        <span className="text-xs text-zinc-500">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
