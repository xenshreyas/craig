export function LandingFooter() {
  return (
    <footer className="bg-zinc-900 border-t border-zinc-700/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Logo + description */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </div>
              <span className="text-base font-semibold text-white">Silhouette</span>
            </a>
            <p className="text-xs text-zinc-500 leading-relaxed mb-4">
              AI-powered meeting notes for Discord. Record, transcribe, and summarize — automatically.
            </p>
            <p className="text-xs text-zinc-600">
              © {new Date().getFullYear()} Silhouette. All rights reserved.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Billing', href: '/billing' },
                { label: 'Features', href: '#features' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'FAQ', href: '#faq' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Account</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Login', href: '/login?next=/dashboard' },
                { label: 'Add to Server', href: '/api/install/start' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Links</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Support Server', href: 'https://discord.gg/h8ksR9uqg3' },
                { label: 'Privacy Policy', href: '/privacy' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                    {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
