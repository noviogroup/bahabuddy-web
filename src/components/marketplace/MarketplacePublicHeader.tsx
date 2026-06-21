import Link from 'next/link'
import { BahaLogo } from '@/components/ui'

type MarketplacePublicHeaderProps = {
  userEmail?: string | null
  authLoading?: boolean
  activePath?: string
}

type DropdownLink = {
  href: string
  label: string
  description: string
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
  { href: '/explore', label: 'Explore home', description: 'Mobile-style discovery, community, and trip ideas.' },
  { href: '/explore/places?category=Activity', label: 'Things to do', description: 'Tours, water days, wildlife, beaches, and island experiences.' },
  { href: '/explore/places?search=landmark+historic+site', label: 'Landmarks', description: 'Historic sites, natural landmarks, and must-see stops.' },
  { href: '/explore/places?category=Dining', label: 'Food and restaurants', description: 'Local dining, fish fry stops, cafés, and food culture.' },
  { href: '/explore/places?category=Beach', label: 'Beaches', description: 'Pink sand, quiet coves, family beaches, and swim spots.' },
  { href: '/explore/places?category=Activity&search=tour', label: 'Tours', description: 'Guided days, boat trips, snorkeling, and curated activities.' },
  { href: '/explore/places?search=culture+history+museum', label: 'Culture', description: 'Museums, markets, art, Junkanoo, and local history.' },
  { href: '/stays?sort=stars', label: 'Hotels and stays', description: 'Use Explore context, then compare hotels, resorts, villas, and homes.' },
  { href: '/flights', label: 'Island access', description: 'Flights, ferries, airports, and route planning across the Bahamas.' },
] satisfies DropdownLink[]

const destinationLinks = [
  { href: '/destinations', label: 'All destinations', description: 'Browse the Bahamas island finder.' },
  { href: '/explore/island/nassau-paradise-island', label: 'Nassau', description: 'Dining, culture, easy arrival, and resort access.' },
  { href: '/explore/island/paradise-island', label: 'Paradise Island', description: 'Resorts, beaches, Atlantis, and family trips.' },
  { href: '/explore/island/the-exumas', label: 'The Exumas', description: 'Cays, sandbars, boat days, and blue-water escapes.' },
  { href: '/explore/island/eleuthera-harbour-island', label: 'Eleuthera', description: 'Pink sand, coves, slower roads, and quiet stays.' },
  { href: '/explore/island/harbour-island', label: 'Harbour Island', description: 'Boutique stays, pink sand, and golf-cart pace.' },
  { href: '/explore/island/grand-bahama', label: 'Grand Bahama', description: 'Freeport, diving, beaches, and nature parks.' },
  { href: '/explore/island/bimini', label: 'Bimini', description: 'Short hops, fishing, diving, and beach clubs.' },
  { href: '/explore/island/abacos', label: 'The Abacos', description: 'Sailing, marinas, cays, and island hopping.' },
  { href: '/explore/island/andros', label: 'Andros', description: 'Diving, blue holes, bonefishing, and nature.' },
  { href: '/explore/island/long-island', label: 'Long Island', description: "Dean's Blue Hole, cliffs, and quiet beaches." },
  { href: '/destinations?island=Cat+Island', label: 'Cat Island', description: 'Quiet beaches, rake-and-scrape, and Mount Alvernia.' },
  { href: '/destinations?island=San+Salvador', label: 'San Salvador', description: 'Diving, history, and uncrowded island days.' },
  { href: '/destinations?island=Berry+Islands', label: 'Berry Islands', description: 'Cays, boating, fishing, and private-island energy.' },
  { href: '/destinations?island=Inagua', label: 'Inagua', description: 'Flamingos, national parks, and remote nature.' },
  { href: '/destinations?island=Acklins+and+Crooked+Island', label: 'Acklins and Crooked Island', description: 'Bonefishing, solitude, and long quiet shorelines.' },
  { href: '/destinations?island=Rum+Cay', label: 'Rum Cay', description: 'Small-island diving, beaches, and low-key stays.' },
  { href: '/destinations?island=Mayaguana', label: 'Mayaguana', description: 'Remote beaches and true out-island pace.' },
  { href: '/destinations?island=Ragged+Island', label: 'Ragged Island', description: 'Far-south cays, fishing, and off-grid exploration.' },
] satisfies DropdownLink[]

const productLinks = [
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
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] md:overflow-visible [&::-webkit-scrollbar]:hidden">
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
                  className={`relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-extrabold transition-colors ${
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
                    className={`pointer-events-none absolute top-full z-50 mt-2 hidden rounded-3xl border border-gray-200 bg-white p-3 text-night opacity-0 shadow-2xl shadow-night/20 transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 md:block ${
                      label === 'Destinations'
                        ? 'left-1/2 max-h-[70vh] w-[56rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-y-auto'
                        : 'left-0 w-[24rem] translate-y-1'
                    }`}
                    role="menu"
                  >
                    <div className={`${label === 'Destinations' ? 'grid gap-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid gap-1'}`}>
                      {dropdown.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          data-nav-level="dropdown"
                          className="rounded-2xl px-3 py-2.5 transition-colors hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none"
                        >
                          <span className="flex items-center gap-2 text-sm font-extrabold text-night">
                            <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                            {item.label}
                          </span>
                          <span className="mt-1 block text-xs font-semibold leading-5 text-charcoal">
                            {item.description}
                          </span>
                        </Link>
                      ))}
                    </div>
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
