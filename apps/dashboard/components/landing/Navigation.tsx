import { useState } from 'react';

export function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
            <span className="text-base font-semibold text-white">Silhouette</span>
          </a>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-zinc-400 hover:text-white transition-colors">FAQ</a>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <a
              href="/login?next=/dashboard"
              className="hidden sm:inline-flex text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5"
            >
              Login
            </a>
            <a
              href="/dashboard"
              className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors"
            >
              Dashboard →
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
