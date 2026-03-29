export function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-800/30 border-y border-zinc-700/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Everything your team needs from meeting notes
          </h2>
          <p className="text-lg text-zinc-400">
            From raw audio to polished summaries — fully automated.
          </p>
        </div>

        {/* Top cards row */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Discord recording */}
          <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-6 hover:border-zinc-600/70 transition-colors">
            <h3 className="text-xl font-semibold text-white mb-2">Multi-track Discord recording</h3>
            <p className="text-zinc-400 mb-6 text-sm">
              Each participant gets their own audio track. No blended mess — clean, separate stems ready for transcription.
            </p>
            {/* Mock command */}
            <div className="rounded-lg bg-zinc-900/60 border border-zinc-700/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-xs text-zinc-400">Recording active · #voice-general</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/20 flex-shrink-0" />
                  <div className="flex-1 h-1.5 bg-zinc-700 rounded-full">
                    <div className="h-1.5 w-4/5 bg-teal-500/60 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-600 flex-shrink-0" />
                  <div className="flex-1 h-1.5 bg-zinc-700 rounded-full">
                    <div className="h-1.5 w-1/3 bg-zinc-500/60 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-600 flex-shrink-0" />
                  <div className="flex-1 h-1.5 bg-zinc-700 rounded-full">
                    <div className="h-1.5 w-2/3 bg-zinc-500/60 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transcription */}
          <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-6 hover:border-zinc-600/70 transition-colors">
            <h3 className="text-xl font-semibold text-white mb-2">Accurate AI transcription</h3>
            <p className="text-zinc-400 mb-6 text-sm">
              Powered by OpenAI Whisper. Speaker-attributed, timestamped transcripts with high accuracy across accents and languages.
            </p>
            <div className="rounded-lg bg-zinc-900/60 border border-zinc-700/50 p-4 space-y-3 text-xs">
              <div className="flex gap-2">
                <span className="text-teal-400 font-medium flex-shrink-0">Alex</span>
                <span className="text-zinc-400">Let's start with the Q3 roadmap. We need to prioritize the API rollout...</span>
              </div>
              <div className="flex gap-2">
                <span className="text-zinc-300 font-medium flex-shrink-0">Sam</span>
                <span className="text-zinc-400">Agreed. I think we should also address the latency issues before launch.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-teal-400 font-medium flex-shrink-0">Alex</span>
                <span className="text-zinc-400">Good point. Can you own that? Action item...</span>
              </div>
            </div>
          </div>

          {/* Summaries */}
          <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-6 hover:border-zinc-600/70 transition-colors">
            <h3 className="text-xl font-semibold text-white mb-2">AI-generated meeting summaries</h3>
            <p className="text-zinc-400 mb-6 text-sm">
              GPT-4 distills your transcript into key decisions, action items, and takeaways — published automatically to your server.
            </p>
            <div className="rounded-lg bg-zinc-900/60 border border-zinc-700/50 p-4 text-xs space-y-2.5">
              <div className="text-zinc-300 font-medium">📋 Meeting Summary</div>
              <div>
                <span className="text-teal-400">Decisions: </span>
                <span className="text-zinc-400">API rollout prioritized for Q3</span>
              </div>
              <div>
                <span className="text-amber-400">Action items: </span>
                <span className="text-zinc-400">Sam to investigate latency</span>
              </div>
              <div>
                <span className="text-zinc-500">Next steps: </span>
                <span className="text-zinc-400">Follow-up in 2 weeks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom card */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-6 hover:border-zinc-600/70 transition-colors">
            <h3 className="text-xl font-semibold text-white mb-2">Publish directly to your server</h3>
            <p className="text-zinc-400 mb-6 text-sm">
              Summaries are posted to a dedicated <code className="text-teal-400 bg-teal-500/10 px-1 rounded">#silhouette</code> channel. No extra tools, no copy-paste.
            </p>
            <div className="rounded-lg bg-zinc-900/60 border border-zinc-700/50 p-4">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-700/50">
                <div className="w-5 h-5 rounded bg-teal-500/20 border border-teal-500/20 flex items-center justify-center">
                  <span className="text-teal-400 text-xs">#</span>
                </div>
                <span className="text-xs text-zinc-300 font-medium">silhouette</span>
                <span className="ml-auto text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Published</span>
              </div>
              <div className="space-y-1.5">
                <div className="w-full h-2 bg-zinc-700 rounded-full" />
                <div className="w-4/5 h-2 bg-zinc-700 rounded-full" />
                <div className="w-2/3 h-2 bg-zinc-700 rounded-full" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-6 hover:border-zinc-600/70 transition-colors">
            <h3 className="text-xl font-semibold text-white mb-2">Review everything from the web</h3>
            <p className="text-zinc-400 mb-6 text-sm">
              Browse all past recordings, transcripts, and summaries from your Silhouette dashboard — organized by server.
            </p>
            <div className="rounded-lg bg-zinc-900/60 border border-zinc-700/50 overflow-hidden">
              <div className="bg-black/20 px-4 py-2 grid grid-cols-3 gap-2">
                {['Recording', 'Transcript', 'Summary'].map((h) => (
                  <div key={h} className="text-xs text-zinc-500 uppercase tracking-wider">{h}</div>
                ))}
              </div>
              {[true, true, false].map((ok, i) => (
                <div key={i} className="px-4 py-2.5 grid grid-cols-3 gap-2 border-t border-zinc-700/50">
                  <div className="w-16 h-2 bg-zinc-700 rounded-full mt-0.5" />
                  <span className={`text-xs font-medium ${ok ? 'text-emerald-400' : 'text-red-400'}`}>{ok ? 'Complete' : 'Error'}</span>
                  <span className={`text-xs font-medium ${ok ? 'text-emerald-400' : 'text-zinc-500'}`}>{ok ? 'Complete' : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Icon row */}
        <div className="grid md:grid-cols-3 gap-6 pt-4">
          {[
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              ),
              title: 'High-fidelity recording',
              body: 'Individual tracks per speaker, exported as lossless audio. Perfect for podcast editing or compliance archiving.'
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              ),
              title: 'Fast turnaround',
              body: 'Transcription and summary ready within minutes of ending the session. No waiting, no manual steps.'
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
                </svg>
              ),
              title: 'Works on any server',
              body: 'No special permissions required beyond standard bot access. Add Silhouette to any Discord server in seconds.'
            }
          ].map(({ icon, title, body }) => (
            <div key={title} className="text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-4 text-teal-400">
                {icon}
              </div>
              <h4 className="font-semibold text-white mb-2">{title}</h4>
              <p className="text-sm text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
