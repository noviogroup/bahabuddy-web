import Link from 'next/link'
import { BahaLogo } from '@/components/ui'

type MarketplacePublicHeaderProps = {
  userEmail?: string | null
  displayName?: string | null
  authLoading?: boolean
  activePath?: string
}

type DropdownLink = {
  href: string
  label: string
  description: string
  section: string
}

type ProductLink = {
  href: string
  label: string
  icon: () => JSX.Element
  dropdown?: DropdownLink[]
  activePrefixes?: string[]
  excludeActivePrefixes?: string[]
}

const exploreLinks = [
  { section: 'Start here', href: '/explore', label: 'Explore home', description: 'Mobile-style discovery, community, and trip ideas.' },
  { section: 'Start here', href: '/explore/places?category=Activity', label: 'Things to do', description: 'Tours, water days, wildlife, beaches, and island experiences.' },
  { section: 'Start here', href: '/explore/places?search=landmark+historic+site', label: 'Landmarks', description: 'Historic sites, natural landmarks, and must-see stops.' },
  { section: 'Browse by interest', href: '/explore/places?category=Dining', label: 'Restaurants and food', description: 'Local dining, fish fry stops, cafes, and food culture.' },
  { section: 'Browse by interest', href: '/explore/places?category=Beach', label: 'Beaches', description: 'Pink sand, quiet coves, family beaches, and swim spots.' },
  { section: 'Browse by interest', href: '/explore/places?category=Activity&search=tour', label: 'Tours and activities', description: 'Guided days, boat trips, snorkeling, and curated activities.' },
  { section: 'Browse by interest', href: '/explore/places?search=culture+history+museum', label: 'Culture and history', description: 'Museums, markets, art, Junkanoo, and local history.' },
  { section: 'Plan the trip', href: '/stays?sort=stars', label: 'Hotels and stays', description: 'Compare hotels, resorts, villas, apartments, homes, and condos.' },
  { section: 'Plan the trip', href: '/flights', label: 'Island access', description: 'Flights, ferries, airports, and route planning across the Bahamas.' },
] satisfies DropdownLink[]

const destinationLinks = [
  { section: 'Island finder', href: '/destinations', label: 'All destinations', description: 'Browse the full Bahamas island finder.' },
  { section: 'Most planned', href: '/explore/island/nassau-paradise-island', label: 'Nassau', description: 'Dining, culture, easy arrival, and resort access.' },
  { section: 'Most planned', href: '/explore/island/paradise-island', label: 'Paradise Island', description: 'Resorts, beaches, Atlantis, and family trips.' },
  { section: 'Most planned', href: '/explore/island/the-exumas', label: 'The Exumas', description: 'Cays, sandbars, boat days, and blue-water escapes.' },
  { section: 'Most planned', href: '/explore/island/eleuthera-harbour-island', label: 'Eleuthera', description: 'Pink sand, coves, slower roads, and quiet stays.' },
  { section: 'Most planned', href: '/explore/island/harbour-island', label: 'Harbour Island', description: 'Boutique stays, pink sand, and golf-cart pace.' },
  { section: 'Island hopping', href: '/explore/island/grand-bahama', label: 'Grand Bahama', description: 'Freeport, diving, beaches, and nature parks.' },
  { section: 'Island hopping', href: '/explore/island/bimini', label: 'Bimini', description: 'Short hops, fishing, diving, and beach clubs.' },
  { section: 'Island hopping', href: '/explore/island/abacos', label: 'The Abacos', description: 'Sailing, marinas, cays, and island hopping.' },
  { section: 'Island hopping', href: '/explore/island/andros', label: 'Andros', description: 'Diving, blue holes, bonefishing, and nature.' },
  { section: 'Island hopping', href: '/explore/island/long-island', label: 'Long Island', description: "Dean's Blue Hole, cliffs, and quiet beaches." },
  { section: 'Out islands', href: '/destinations?island=Cat+Island', label: 'Cat Island', description: 'Quiet beaches, rake-and-scrape, and Mount Alvernia.' },
  { section: 'Out islands', href: '/destinations?island=San+Salvador', label: 'San Salvador', description: 'Diving, history, and uncrowded island days.' },
  { section: 'Out islands', href: '/destinations?island=Berry+Islands', label: 'Berry Islands', description: 'Cays, boating, fishing, and private-island energy.' },
  { section: 'Out islands', href: '/destinations?island=Inagua', label: 'Inagua', description: 'Flamingos, national parks, and remote nature.' },
  { section: 'Out islands', href: '/destinations?island=Acklins+and+Crooked+Island', label: 'Acklins and Crooked Island', description: 'Bonefishing, solitude, and long quiet shorelines.' },
  { section: 'Out islands', href: '/destinations?island=Rum+Cay', label: 'Rum Cay', description: 'Small-island diving, beaches, and low-key stays.' },
  { section: 'Out islands', href: '/destinations?island=Mayaguana', label: 'Mayaguana', description: 'Remote beaches and true out-island pace.' },
  { section: 'Out islands', href: '/destinations?island=Ragged+Island', label: 'Ragged Island', description: 'Far-south cays, fishing, and off-grid exploration.' },
] satisfies DropdownLink[]

const productLinks = [
  { href: '/search', label: 'Search', icon: SearchIcon },
  { href: '/stays', label: 'Stays', icon: BedIcon },
  { href: '/flights', label: 'Flights', icon: PlaneIcon },
  {
    href: '/explore',
    label: 'Explore',
    icon: CompassIcon,
    dropdown: exploreLinks,
    activePrefixes: ['/explore', '/restaurants'],
    excludeActivePrefixes: ['/explore/island'],
  },
  {
    href: '/destinations',
    label: 'Destinations',
    icon: PinIcon,
    dropdown: destinationLinks,
    activePrefixes: ['/destinations', '/explore/island'],
  },
  { href: '/guides', label: 'Guides', icon: GuideIcon },
  { href: '/deals', label: 'Deals', icon: TagIcon },
  { href: '/concierge-trip-plan', label: 'Concierge', icon: SparkIcon },
] satisfies ProductLink[]

export default function MarketplacePublicHeader({
  userEmail,
  displayName,
  authLoading = false,
  activePath,
}: MarketplacePublicHeaderProps) {
  const profileName = getProfileName(displayName, userEmail)
  const profileLabel = profileName ?? 'Profile'

  return (
    <header className="sticky top-0 z-40 overflow-x-clip bg-white">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 bg-white px-4 py-3 text-night sm:gap-4 sm:py-4">
        <BahaLogo href="/" size="lg" layout="pillWordmark" priority />
        <div className="flex items-center gap-2">
          {userEmail ? (
            <>
              <Link
                href="/dashboard"
                aria-label="My trips dashboard"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-100 sm:hidden"
              >
                <DashboardIcon />
                <span className="hidden min-[360px]:inline">My trips</span>
              </Link>
              <Link
                href="/dashboard"
                className="hidden min-h-11 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 sm:inline-flex"
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                aria-label={`Profile for ${profileLabel}`}
                className="hidden max-w-[10rem] truncate text-sm font-semibold text-gray-600 transition-colors hover:text-brand-700 md:inline-block lg:max-w-[12rem]"
              >
                Hi, {profileLabel}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="hidden min-h-11 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 sm:inline-flex"
              >
                Start planning
              </Link>
              <Link
                href="/login"
                aria-disabled={authLoading ? true : undefined}
                className={`inline-flex min-h-11 items-center rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50 sm:px-4 ${
                  authLoading ? 'opacity-70' : ''
                }`}
              >
                Sign in
              </Link>
            </>
          )}
          <details className="group relative lg:hidden">
            <summary
              aria-label="Open travel menu"
              className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-night transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
            >
              <MenuIcon />
              <span className="hidden min-[400px]:inline">Menu</span>
              <span className="text-gray-400 transition-transform group-open:rotate-180" aria-hidden="true">
                <ChevronIcon />
              </span>
            </summary>
            <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 max-h-[calc(100vh-5.5rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-gray-200 bg-white p-3 text-night shadow-2xl shadow-night/20 ring-1 ring-black/5">
              <div className="flex items-center justify-between border-b border-gray-100 px-2 pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-brand-700">Explore The Bahamas</p>
                  <p className="mt-1 text-sm font-semibold text-night">Plan, compare, and keep moving.</p>
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-gold-400" aria-hidden="true" />
              </div>
              <nav aria-label="Mobile travel products" className="mt-3 grid grid-cols-2 gap-2">
                {productLinks.map((link) => {
                  const Icon = link.icon
                  const active = isActiveProductLink(activePath, link)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition-colors ${
                        active
                          ? 'border-brand-200 bg-brand-50 text-brand-700'
                          : 'border-gray-200 bg-white text-charcoal hover:border-brand-200 hover:bg-brand-50 hover:text-night'
                      }`}
                    >
                      <span className="text-gold-600" aria-hidden="true"><Icon /></span>
                      {link.label}
                    </Link>
                  )
                })}
              </nav>
              {userEmail && (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                  <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700">
                    My trips
                  </Link>
                  <Link href="/profile" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-3 text-sm font-semibold text-night hover:border-brand-200 hover:bg-brand-50">
                    Profile
                  </Link>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>

      <nav aria-label="Travel products" className="hidden bg-brand-600 text-white lg:block">
        <div className="mx-auto flex max-w-6xl flex-nowrap gap-2 px-4 py-2.5 lg:gap-3">
          {productLinks.map((link) => {
            const { href, label, icon: Icon, dropdown } = link
            const active = isActiveProductLink(activePath, link)

            return (
              <div key={href} className="group relative shrink-0">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  aria-haspopup={dropdown ? 'menu' : undefined}
                  data-nav-level="primary"
                  className={`relative inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold transition-colors sm:gap-2.5 sm:px-3.5 ${
                    active
                      ? 'bg-white/12 text-white ring-1 ring-white/20 after:absolute after:inset-x-4 after:-bottom-2 after:h-0.5 after:rounded-full after:bg-gold-400'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-gold-400" aria-hidden="true">
                    <Icon />
                  </span>
                  {label}
                  {dropdown && (
                    <span className="text-white/70 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" aria-hidden="true">
                      <ChevronIcon />
                    </span>
                  )}
                </Link>

                {dropdown && (
                  <div
                    className={`pointer-events-none absolute top-full z-50 mt-2 hidden rounded-3xl border border-gray-200 bg-white p-4 text-night opacity-0 shadow-2xl shadow-night/20 transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 lg:block ${
                      label === 'Destinations'
                        ? 'left-1/2 max-h-[70vh] w-[60rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-y-auto'
                        : 'left-0 w-[42rem] max-w-[calc(100vw-2rem)] translate-y-1'
                    }`}
                    role="menu"
                  >
                    <DropdownMenuContent items={dropdown} isDestinations={label === 'Destinations'} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>
    </header>
  )
}

function MenuIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5h6.5V12H4zM13.5 5.5H20V9h-6.5zM13.5 12H20v6.5h-6.5zM4 15h6.5v3.5H4z" />
    </svg>
  )
}

function getProfileName(displayName?: string | null, userEmail?: string | null) {
  const cleanDisplayName = cleanName(displayName)
  if (cleanDisplayName) return cleanDisplayName

  const emailPrefix = userEmail?.split('@')[0]
  if (!emailPrefix) return null

  const readablePrefix = emailPrefix
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!readablePrefix) return null

  return readablePrefix
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function cleanName(value?: string | null) {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  return normalized || null
}

function DropdownMenuContent({
  items,
  isDestinations,
}: {
  items: DropdownLink[]
  isDestinations: boolean
}) {
  const groupedItems = groupDropdownLinks(items)

  return (
    <div className={isDestinations ? 'grid gap-4 lg:grid-cols-[0.8fr_1.15fr_1.15fr_1.15fr]' : 'grid gap-4 sm:grid-cols-3'}>
      {groupedItems.map(([section, links]) => (
        <section key={section} aria-label={section} className="min-w-0">
          <p className="mb-2 border-b border-gray-100 pb-2 text-xs font-semibold uppercase text-brand-700">
            {section}
          </p>
          <div className="grid gap-1">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                data-nav-level="dropdown"
                className="rounded-2xl px-3 py-2.5 transition-colors hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-night">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" aria-hidden="true" />
                  {item.label}
                </span>
                <span className="mt-1 block text-xs font-semibold leading-5 text-charcoal">
                  {item.description}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function groupDropdownLinks(items: DropdownLink[]): Array<[string, DropdownLink[]]> {
  const groups = new Map<string, DropdownLink[]>()
  for (const item of items) {
    groups.set(item.section, [...(groups.get(item.section) ?? []), item])
  }
  return Array.from(groups.entries())
}

function isActiveProductLink(activePath: string | undefined, link: ProductLink): boolean {
  if (!activePath) return false
  if (link.excludeActivePrefixes?.some((prefix) => activePath === prefix || activePath.startsWith(`${prefix}/`))) {
    return false
  }

  const prefixes = link.activePrefixes ?? [link.href]
  return prefixes.some((prefix) => activePath === prefix || activePath.startsWith(`${prefix}/`))
}

function BedIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 11V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 11h16a2 2 0 0 1 2 2v6M2 19h20M4 19v-3m16 3v-3" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m20 20-4-4" />
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

function GuideIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5v-16Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h7M9 11h7M9 15h4" />
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

function ChevronIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 7.5 5 5 5-5" />
    </svg>
  )
}
