import { GetServerSideProps } from 'next';
import Head from 'next/head';

import { parseUser } from '../utils';

export default function Login() {
  return (
    <>
      <Head>
        <title>Login • Silhouette</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <meta name="theme-color" content="#2dd4bf" />
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-neutral-900 text-white font-body flex items-center justify-center px-4">
        <div className="w-full max-w-sm flex flex-col gap-5">

          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <img src="/icon-512x512.png" className="w-14 h-14 rounded-full ring-2 ring-teal-500/40" />
            <div>
              <h1 className="text-2xl font-bold text-white">Silhouette</h1>
              <p className="text-sm text-zinc-500 mt-0.5">AI meeting notes for Discord</p>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 px-6 py-6 shadow-lg flex flex-col gap-5">
            <div className="text-sm text-zinc-400 text-center leading-relaxed">
              Log in with Discord to access your dashboard, manage linked servers, and review your recordings and meeting summaries.
            </div>

            <button
              onClick={() => {
                const next = new URLSearchParams(window.location.search).get('next');
                location.href = next ? `/api/login?next=${encodeURIComponent(next)}` : '/api/login';
              }}
              className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-500 transition-colors shadow-md shadow-teal-900/30"
            >
              Login with Discord
            </button>

            <p className="text-xs text-zinc-600 text-center">
              By logging in, you agree to our{' '}
              <a href="/privacy" className="text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2">
                Privacy Policy
              </a>
              . We use cookies to keep you logged in.
            </p>
          </div>

          {/* Footer links */}
          <div className="flex items-center justify-center gap-5 text-sm">
            <a href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              Home
            </a>
            <span className="text-zinc-700">·</span>
            <a href="/privacy" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              Privacy Policy
            </a>
          </div>

        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async function (ctx) {
  const user = parseUser(ctx.req);
  const next = typeof ctx.query.next === 'string' ? ctx.query.next : '/dashboard';

  if (user)
    return {
      redirect: {
        destination: next.startsWith('/') ? next : '/dashboard',
        permanent: false
      }
    };

  return { props: {} };
};
