import Link from 'next/link'
import { BahaLogo } from '@/components/ui'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 text-gray-500">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-3">
              <BahaLogo href="/" size="lg" />
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-4 max-w-sm">
              Your AI-powered Bahamas travel companion. Plan trips, find deals, and explore 700+
              islands — all from one app.
            </p>
            <div className="flex gap-3">
              <a
                href="https://apps.apple.com/app/baha-buddy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg px-3 py-2 transition-colors"
              >
                App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.noviogroup.bahabuddy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg px-3 py-2 transition-colors"
              >
                Google Play
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-3">Explore</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href: '/', label: 'Home' },
                { href: '/destinations', label: 'Destinations' },
                { href: '/deals', label: 'Deals & Packages' },
                { href: '/login', label: 'Sign In' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-3">Company</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href: 'https://noviogroup.com', label: 'Novio Group', external: true },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p>© {new Date().getFullYear()} Novio Group. All rights reserved.</p>
          <p>Built with ❤️ for Bahamas travelers everywhere</p>
        </div>
      </div>
    </footer>
  )
}
