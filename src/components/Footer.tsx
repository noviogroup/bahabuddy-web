import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-blue-950 text-blue-200">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🏝️</span>
              <span className="text-xl font-bold text-white">Baha Buddy</span>
            </div>
            <p className="text-sm text-blue-300 leading-relaxed mb-4 max-w-sm">
              Your AI-powered Bahamas travel companion. Plan trips, find deals, and explore 700+
              islands — all from one app.
            </p>
            <div className="flex gap-3">
              <a
                href="https://apps.apple.com/app/baha-buddy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2 transition-colors"
              >
                🍎 App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.noviogroup.bahabuddy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2 transition-colors"
              >
                🤖 Google Play
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-white font-semibold mb-3">Explore</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href: '/', label: 'Home' },
                { href: '/login', label: 'Sign In' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-blue-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-3">Company</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href: 'https://noviogroup.com', label: 'Novio Group', external: true },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-blue-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-blue-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-blue-400">
          <p>© {new Date().getFullYear()} Novio Group. All rights reserved.</p>
          <p>Built with ❤️ for Bahamas travelers everywhere</p>
        </div>
      </div>
    </footer>
  )
}
