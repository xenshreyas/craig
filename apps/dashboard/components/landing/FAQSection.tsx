import { useState } from 'react';

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'What is Silhouette?',
    a: 'Silhouette is a Discord bot that records multi-track audio from voice channels and automatically generates AI-powered transcriptions and meeting summaries using OpenAI Whisper and GPT-5.4.'
  },
  {
    q: 'How do I add Silhouette to my server?',
    a: 'Click "Open Dashboard", log in with Discord, and use the "+ Add Server" button. You\'ll be taken through Discord\'s OAuth flow to add the bot. Once installed, claim ownership in the dashboard and you\'re ready to record.'
  },
  {
    q: 'How does recording work?',
    a: 'Once the bot is in a voice channel, use the /join slash command to start recording. Each participant is recorded on a separate audio track. When you\'re done, use /leave or disconnect the bot — the transcription and summary start automatically.'
  },
  {
    q: 'What does it cost?',
    a: 'Every account gets $5 in free AI credits to start — no credit card required. After your trial is exhausted, you can set up pay-per-use Stripe billing with a configurable monthly hard cap between $10 and $50.'
  },
  {
    q: 'How accurate is the transcription?',
    a: 'Very accurate. Silhouette uses OpenAI Whisper, one of the leading speech-to-text models. It handles multiple speakers, accents, and technical vocabulary well. Quality improves when participants use decent microphones.'
  },
  {
    q: 'Where do summaries get published?',
    a: 'Summaries are automatically posted to a #silhouette text channel in your Discord server. You can also view all recordings and summaries anytime from the Silhouette web dashboard.'
  },
  {
    q: 'Is my audio kept private?',
    a: 'Audio is processed to produce transcripts and summaries, then deleted. Transcript and summary text is stored and linked to your account. You control who has access through Discord server roles and the dashboard.'
  },
  {
    q: 'Can I use Silhouette on multiple servers?',
    a: 'Yes. You can link as many Discord servers as you like to a single Silhouette account. All usage is pooled under your account\'s trial credits and billing cap.'
  }
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-zinc-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-medium text-white hover:bg-zinc-800/40 transition-colors"
      >
        <span>{q}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`flex-shrink-0 ml-4 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-6 pb-4 text-sm text-zinc-400 border-t border-zinc-700/50 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

export function FAQSection() {
  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-zinc-400">
            Everything you need to know about Silhouette.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <FAQItem key={q} q={q} a={a} />
          ))}
        </div>
      </div>
    </section>
  );
}
