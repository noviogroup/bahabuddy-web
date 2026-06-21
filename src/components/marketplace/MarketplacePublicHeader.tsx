import Link from 'next/link'
import { BahaLogo } from '@/components/ui'

type MarketplacePublicHeaderProps = {
  userEmail?: string | null
  authLoading?: boolean
  activePath?: string
}

const productLinks = [
  { href: '/stays', label: 'Stays', icon: BedIcon },
  { href: '/flights', label: 'Flights', icon: PlaneIcon },
  { href: '/explore', label: 'Explore', icon: CompassIcon },
  { href: '/destinations', label: 'Destinations', icon: PinIcon },
  { href: '/deals', label: 'Deals', icon: TagIcon },
  { href: '/concierge-trip-plan', label: 'Concierge', icon: SparkIcon },
]

export default function MarketplacePublicHeader({
  userEmail,
  authLoading = false,
  activePath,
}: MarketplacePublicHeaderProps) {
  const initial = userEmail?.trim()?.[0]?.toUpperCase() ?? 'B'

  return (
    <header className="sticky top-0 z-40 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 bg-white px-4 py-3 text-night">
        <BahaLogo href="/" size="md" layout="pillWordmark" priority />
        <div className="flex items-center gap-2">
          {userEmail ? (
            <>
              <Link
                href="/dashboard"
                className="hidden rounded-md bg-brand-600 px-4 py-2 text-sm font-extrabold text-white transition-colors hover:bg-brand-700 sm:inline-flex"
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                aria-label={`Profile for ${userEmail}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-sm font-extrabold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100"
              >
                {initial}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="hidden rounded-md bg-brand-600 px-4 py-2 text-sm font-extrabold text-white transition-colors hover:bg-brand-700 sm:inline-flex"
              >
                Start planning
              </Link>
              <Link
                href="/login"
                aria-disabled={authLoading ? true : undefined}
                className={`rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-extrabold text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50 ${
                  authLoading ? 'opacity-70' : ''
                }`}
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>

      <nav aria-label="Travel products" className="bg-brand-600 text-white">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {productLinks.map(({ href, label, icon: Icon }) => {
            const active = activePath === href || Boolean(activePath?.startsWith(`${href}/`))

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-extrabold transition-colors ${
                  active
                    ? 'bg-white/12 text-white ring-1 ring-white/20 after:absolute after:inset-x-4 after:-bottom-2 after:h-0.5 after:rounded-full after:bg-gold-400'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-gold-400" aria-hidden="true">
                  <Icon />
                </span>
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </header>
  )
}

function BedIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 11V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 11h16a2 2 0 0 1 2 2v6M2 19h20M4 19v-3m16 3v-3" />
    </svg>
  )
}

function PlaneIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16l7-3V7a2 2 0 0 1 4 0v6l7 3v2l-7-2v3l2 1.5V22l-4-1-4 1v-1.5L10 19v-3l-7 2v-2Z" />
    </svg>
  )
}

function CompassIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13 13 20 4 11V4h7l9 9Z" />
      <circle cx="8.5" cy="8.5" r="1.5" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  )
}
