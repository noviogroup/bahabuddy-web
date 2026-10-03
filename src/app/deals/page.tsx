import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import TrackView from '@/components/TrackView'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import { FilterChip, FilterGroup, ResultFilterPanel } from '@/components/marketplace/ResultFilterPanel'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import { buddyChatHref } from '@/lib/buddy-chat'
import { dealActionLinks, dealIslandLabel } from '@/lib/deal-actions'
import { getDeals, type Deal } from '@/lib/deals'

export const metadata: Metadata = {
  title: 'Bahamas Deals & Packages',
  description: 'Browse current Bahamas hotel deals, tour packages, and island experiences. Find the best prices with Baha Buddy.',
  // Filter/sort query strings all canonicalize to the unfiltered listing.
  alternates: { canonical: '/deals' },
  openGraph: {
    title: 'Bahamas Deals & Packages | Baha Buddy',
    description: 'Current deals on Bahamas hotels, tours, and island packages.',
  },
}

export const dynamic = 'force-dynamic'

const DEAL_TYPES = ['All', 'accommodation', 'tour', 'package', 'activity']

const DEAL_TYPE_CONFIG: Record<string, { label: string; badge: string }> = {
  accommodation: { label: 'Hotel', badge: 'bg-white/90 text-night' },
  tour: { label: 'Tour', badge: 'bg-white/90 text-night' },
  package: { label: 'Package', badge: 'bg-white/90 text-night' },
  activity: { label: 'Activity', badge: 'bg-white/90 text-night' },
}

function formatPrice(price: number | null, unit: string | null): string {
  if (!price) return 'Contact for price'
  const units: Record<string, string> = {
    per_night: '/night',
    per_person: '/person',
    per_day: '/day',
    per_charter: '/charter',
    total: ' total',
  }
  return `From $${price.toLocaleString()}${unit ? (units[unit] ?? '') : ''}`
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: { type?: string }
}) {
  const allDeals: Deal[] = await getDeals()

  const requestedType = searchParams.type ?? 'All'
  const activeType = DEAL_TYPES.includes(requestedType) ? requestedType : 'All'

  const filtered = activeType === 'All'
    ? allDeals
    : allDeals.filter(d => d.deal_type === activeType)

  function buildFilterUrl(type?: string) {
    return type && type !== 'All' ? `/deals?type=${encodeURIComponent(type)}` : '/deals'
  }

  const activeFilters = activeType !== 'All'
    ? [{
        label: 'Deal type',
        value: DEAL_TYPE_CONFIG[activeType]?.label ?? activeType,
        href: '/deals',
      }]
    : []

  const renderFilterControls = () => (
    <FilterGroup label="Deal type">
      {DEAL_TYPES.map(type => {
        const config = type !== 'All' ? DEAL_TYPE_CONFIG[type] : null
        return (
          <FilterChip
            key={type}
            href={buildFilterUrl(type)}
            active={activeType === type}
            tone={type === 'activity' ? 'gold' : 'brand'}
          >
            {config ? config.label : 'All deals'}
          </FilterChip>
        )
      })}
    </FilterGroup>
  )

  return (
    <div className="min-h-screen bg-white">
      <TrackView event="deal_viewed" props={{ deal_count: allDeals.length }} />
      <CompactPageHeader
        eyebrow="Current deals"
        title="Bahamas Deals & Packages"
        subtitle="Curated stays, tours, and island packages matched to your travel style."
        crumbs={[
          { href: '/', label: 'Home' },
          { label: 'Deals' },
        ]}
        actions={(
          <>
            <Link href="/stays" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">
              Browse stays
            </Link>
            <Link href={buddyChatHref('Find Bahamas deals for my trip')} className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night hover:border-gray-400 hover:bg-gray-50">
              Ask Buddy
            </Link>
          </>
        )}
      />

      <main className="max-w-6xl mx-auto px-4 py-10">
        <ResultFilterPanel
          ariaLabel="Filter deals"
          eyebrow="Filter deals"
          title={`${filtered.length} deal${filtered.length !== 1 ? 's' : ''} found`}
          activeFilters={activeFilters}
          clearHref="/deals"
          emptyLabel="Showing all deals"
          mobileSummary="Filter deals"
          desktopGridClassName="md:grid-cols-1"
        >
          {renderFilterControls()}
        </ResultFilterPanel>

        <div className="mb-6">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
            Results
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-500">
            {filtered.length} deal{filtered.length !== 1 ? 's' : ''}
            {activeType !== 'All' ? ` | ${DEAL_TYPE_CONFIG[activeType]?.label ?? activeType}` : ''}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600">No deals found</p>
            <Link href="/deals" className="inline-block mt-4 text-night hover:text-gray-700 text-sm font-medium">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(deal => {
              const typeConfig = DEAL_TYPE_CONFIG[deal.deal_type] ?? { label: deal.deal_type, badge: 'bg-white/90 text-night' }
              const action = dealActionLinks(deal)
              const islandLabel = dealIslandLabel(deal.island)

              return (
                <div
                  key={deal.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ImageWithSourcePolicy
                    src={deal.image_url}
                    alt={deal.title}
                    title={deal.title}
                    eyebrow={typeConfig.label}
                    className="h-48"
                    imageClassName="object-cover group-hover:scale-105 transition-transform duration-500"
                    tone="neutral"
                    priority={false}
                  >
                    <div className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${typeConfig.badge}`}>
                      {typeConfig.label}
                    </div>
                  </ImageWithSourcePolicy>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h2 className="text-base font-bold text-gray-900 leading-snug">{deal.title}</h2>
                    </div>

                    {deal.resort_name && (
                      <p className="text-xs text-gray-400 mb-2 font-medium">{deal.resort_name}</p>
                    )}

                    <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-white p-2.5">
                      <div>
                        <p className="text-xs font-bold uppercase text-gray-400">From</p>
                        <p className="mt-0.5 text-sm font-bold text-night">{formatPrice(deal.price_from_usd, deal.price_unit)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-gray-400">Fit</p>
                        <p className="mt-0.5 truncate text-sm font-bold text-night">{islandLabel || action.contextLabel}</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1 line-clamp-3">
                      {deal.description}
                    </p>

                    {deal.highlights && deal.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {deal.highlights.slice(0, 3).map(h => (
                          <span key={h} className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-charcoal">
                            {h}
                          </span>
                        ))}
                      </div>
                    )}

                    {deal.valid_through && (
                      <p className="text-xs text-gray-400 mb-3">
                        Expires {new Date(deal.valid_through).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}

                    <div className="mt-auto grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                      <Link
                        href={action.primaryHref}
                        className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                      >
                        {action.primaryLabel}
                      </Link>
                      <Link
                        href={action.secondaryHref}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
                      >
                        {action.secondaryLabel}
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-16 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h2 className="mb-2 text-2xl font-bold text-night">Get personalized deal recommendations</h2>
          <p className="mb-6 text-gray-600">Tell Baha Buddy your dates and budget. We&apos;ll find the best deals for you.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://apps.apple.com/app/baha-buddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Download on iOS
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.noviogroup.bahabuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Download on Android
            </a>
          </div>
        </div>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}
