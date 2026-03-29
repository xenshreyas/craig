import Head from 'next/head';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy • Silhouette</title>
      </Head>
      <div className="min-h-screen bg-zinc-900 text-white font-body px-4 py-16 sm:px-8">
        <div className="max-w-2xl mx-auto">
          <a href="/" className="text-sm text-teal-400 hover:text-teal-300 transition-colors mb-10 inline-block">
            ← Back to home
          </a>

          <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-zinc-500 mb-12">Last updated: March 2026</p>

          <div className="space-y-10 text-zinc-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-white mb-3">What is Silhouette?</h2>
              <p>
                Silhouette is a Discord bot that records voice channel audio and uses AI to generate transcriptions
                and meeting summaries. This policy explains what data we collect and how we use it.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">Data we collect</h2>
              <ul className="space-y-2 list-none">
                {[
                  'Your Discord user ID, username, and avatar — used to identify your account.',
                  'The Discord servers (guilds) you link to Silhouette.',
                  'Audio recorded during sessions you initiate with the /join command.',
                  'Transcripts and AI-generated summaries produced from your recordings.',
                  'Usage data (AI processing costs) for billing purposes.',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="text-teal-500 flex-shrink-0 mt-1">–</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">How we use your data</h2>
              <ul className="space-y-2 list-none">
                {[
                  'Audio is sent to OpenAI Whisper for transcription, then deleted from our servers.',
                  'Transcripts are sent to OpenAI GPT-4 to generate meeting summaries.',
                  'Transcripts and summaries are stored and associated with your account so you can review them in the dashboard.',
                  'Usage data is used to calculate billing and enforce your configured monthly cap.',
                  'We do not sell your data to third parties.',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="text-teal-500 flex-shrink-0 mt-1">–</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">Third-party services</h2>
              <p className="mb-3">Silhouette uses the following third-party services to operate:</p>
              <ul className="space-y-2 list-none">
                {[
                  'OpenAI — for transcription (Whisper) and summarization (GPT-4). Audio and transcript text is sent to OpenAI under their API terms.',
                  'Stripe — for payment processing. Your payment information is handled directly by Stripe and never stored on our servers.',
                  'Discord — for authentication and bot functionality.',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="text-teal-500 flex-shrink-0 mt-1">–</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">Data retention</h2>
              <p>
                Raw audio files are deleted after transcription is complete. Transcripts and summaries are retained
                as long as your account is active. You can request deletion of your data by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">Recording consent</h2>
              <p>
                You are responsible for ensuring all participants in a voice channel are aware that recording is
                taking place before using the /join command. Silhouette does not notify participants automatically.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">Your rights</h2>
              <p>
                You can delete your linked servers and stop using Silhouette at any time from the dashboard.
                To request full account data deletion, contact us at the email below.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
              <p>
                If you have any questions about this policy, reach out at{' '}
                <a href="mailto:xenshreyas@gmail.com" className="text-teal-400 hover:text-teal-300 transition-colors">
                  xenshreyas@gmail.com
                </a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
