export function DeploymentSection() {
  const steps = [
    {
      step: '01',
      title: 'Add to your Discord server',
      body: 'Click "Add to Server", authorize the bot, then claim ownership in the Silhouette dashboard. Takes under a minute.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      )
    },
    {
      step: '02',
      title: 'Record any voice channel',
      body: 'Use the /join command in any voice channel. Silhouette starts capturing multi-track audio immediately.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      )
    },
    {
      step: '03',
      title: 'Get your summary automatically',
      body: 'When the session ends, Silhouette transcribes and summarizes the meeting, then posts the notes to #silhouette.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    }
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Simple setup, powerful results
          </h2>
          <p className="text-lg text-zinc-400">
            From bot install to automated meeting notes in three steps.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-16 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-zinc-700/50" />

          {steps.map(({ step, title, body, icon }) => (
            <div key={step} className="text-center relative">
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    {icon}
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700/50 text-xs text-zinc-500 flex items-center justify-center font-mono font-bold">
                    {step.slice(1)}
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-zinc-400 max-w-xs mx-auto">{body}</p>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              color: 'teal',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ),
              title: 'Private & secure',
              body: 'Audio is processed server-side and never stored permanently. Transcripts and summaries are scoped to your server only.'
            },
            {
              color: 'amber',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              ),
              title: 'Works in any voice channel',
              body: 'No special setup per channel. Drop Silhouette into any voice session and it captures everything in real time.'
            },
            {
              color: 'blue',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              ),
              title: 'Usage-based billing',
              body: 'Start with $5 in free credits. Pay only for what you use, with a configurable monthly hard cap for peace of mind.'
            }
          ].map(({ color, icon, title, body }) => (
            <div key={title} className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-6">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                color === 'teal' ? 'bg-teal-500/10 border border-teal-500/20 text-teal-400' :
                color === 'amber' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' :
                'bg-blue-500/10 border border-blue-500/20 text-blue-400'
              }`}>
                {icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
