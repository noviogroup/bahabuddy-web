import Link from 'next/link'
import { BahaLogo } from '@/components/ui'

type PublicHeaderProps = {
  variant?: 'light' | 'dark'
  userEmail?: string | null
  authLoading?: boolean
}

const navLinks = [
  { href: '/destinations', label: 'Destinations' },
  { href: '/stays', label: 'Stays' },
  { href: '/flights', label: 'Flights' },
  { href: '/guides', label: 'Guides' },
  { href: '/deals', label: 'Deals' },
  { href: '/concierge-trip-plan', label: 'Concierge' },
]

export default function PublicHeader({ variant = 'light', userEmail, authLoading = false }: PublicHeaderProps) {
  const isDark = variant === 'dark'
  const initial = userEmail?.trim()?.[0]?.toUpperCase() ?? 'B'

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-xl ${
        isDark
          ? 'bg-night/85 border-white/10 text-white'
          : 'bg-white/90 border-sand-200 text-night'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <BahaLogo href="/" size="md" layout="pillWordmark" priority />

        <nav className="flex items-center gap-3 sm:gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hidden lg:block text-sm font-bold transition-colors ${
                isDark ? 'text-white/90 hover:text-white' : 'text-charcoal hover:text-brand-700'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {userEmail ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className={`hidden sm:inline-flex items-center rounded-full px-4 py-2 text-sm font-extrabold transition-colors ${
                  isDark
                    ? 'bg-white text-brand-700 hover:bg-white/90'
                    : 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                aria-label={`Profile for ${userEmail}`}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold transition-colors ${
                  isDark
                    ? 'bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25'
                    : 'bg-brand-50 text-brand-700 ring-1 ring-brand-100 hover:bg-brand-100'
                }`}
              >
                {initial}
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className={`hidden sm:inline-flex rounded-full px-4 py-2 text-sm font-extrabold transition-colors ${
                  isDark
                    ? 'bg-white text-brand-700 hover:bg-white/90'
                    : 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                }`}
              >
                Start planning
              </Link>
              <Link
                href="/login"
                aria-disabled={authLoading ? true : undefined}
                className={`text-sm font-bold transition-colors ${
                  isDark ? 'text-white/90 hover:text-white' : 'text-charcoal hover:text-brand-700'
                } ${authLoading ? 'opacity-60' : ''}`}
              >
                Sign in
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
