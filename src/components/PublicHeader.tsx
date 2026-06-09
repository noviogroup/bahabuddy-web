import Link from 'next/link'
import { BahaLogo } from '@/components/ui'

type PublicHeaderProps = {
  variant?: 'light' | 'dark'
}

const navLinks = [
  { href: '/destinations', label: 'Destinations' },
  { href: '/stays', label: 'Stays' },
  { href: '/guides', label: 'Guides' },
  { href: '/deals', label: 'Deals' },
  { href: '/concierge-trip-plan', label: 'Concierge' },
]

export default function PublicHeader({ variant = 'light' }: PublicHeaderProps) {
  const isDark = variant === 'dark'

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

        <nav className="flex items-center gap-4 sm:gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hidden sm:block text-sm font-bold transition-colors ${
                isDark ? 'text-white/90 hover:text-white' : 'text-charcoal hover:text-brand-700'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className={`text-sm font-bold transition-colors ${
              isDark ? 'text-white/90 hover:text-white' : 'text-charcoal hover:text-brand-700'
            }`}
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  )
}
