import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import TrackView from '@/components/TrackView'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import { FilterChip, FilterGroup, ResultFilterPanel } from '@/components/marketplace/ResultFilterPanel'
import { buddyChatHref } from '@/lib/buddy-chat'
import type { TripAdvisorLocation } from '@/lib/tripadvisor/types'
import { ISLAND_SLUG_MAP } from '@/lib/tripadvisor/types'

export const metadata: Metadata = {
  title: 'Best Restaurants in the Bahamas | Baha Buddy',
  description:
    'Browse top-rated Bahamas restaurants across Nassau, Exuma, Eleuthera, and more. Cuisine, ratings, photos, and TripAdvisor reviews.',
  openGraph: {
    title: 'Best Restaurants in the Bahamas | Baha Buddy',
    description:
      'Find the best Bahamas dining by island, cuisine, and rating.',
  },
}

export const revalidate = 86400

async function getRestaurants(
  island?: string,
  cuisine?: string,
): Promise<TripAdvisorLocation[]> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('tripadvisor_locations')
      .select('*')
      .eq('category', 'restaurants')
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(100)

    if (island) {
      query = query.ilike('island_name', island)
    }
    if (cuisine) {
      query = query.contains('cuisine_types', [cuisine])
    }

    const { data, error } = await query
    if (error || !data) return []
    return data as TripAdvisorLocation[]
  } catch {
    return []
  }
}

async function getCuisineTypes(): Promise<string[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('tripadvisor_locations')
      .select('cuisine_types')
      .eq('category', 'restaurants')
      .not('cuisine_types', 'is', null)
      .limit(500)
    if (!data) return []
    const all = new Set<string>()
    for (const row of data) {
      const types = row.cuisine_types as string[] | null
      if (types) types.forEach((t) => all.add(t))
    }
    return Array.from(all).sort()
  } catch {
    return []
  }
}

function getIslandOptions(): { slug: string; name: string }[] {
  const seen = new Set<string>()
  return Object.entries(ISLAND_SLUG_MAP)
    .filter(([, name]) => {
      if (seen.has(name)) return false
      seen.add(name)
      return true
    })
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function PriceLevelDisplay({ level }: { level: string }) {
  const count =
    level === '$' ? 1 : level === '$$' ? 2 : level === '$$$' ? 3 : level === '$$$$' ? 4 : level.length
  return (
    <span
      className="font-bold text-night text-sm"
      aria-label={`Price level ${level}`}
    >
      {'$'.repeat(Math.min(count, 4))}
      <span className="text-gray-300">
        {'$'.repeat(Math.max(0, 4 - count))}
      </span>
    </span>
  )
}

function restaurantPreviewReason(rest: TripAdvisorLocation): string {
  if (rest.rating && rest.rating >= 4.5) {
    return `Strong traveler rating${rest.island_name ? ` on ${rest.island_name}` : ''}, useful for shortlisting dining plans.`
  }
  if (rest.cuisine_types && rest.cuisine_types.length > 0) {
    return `Cuisine fit: ${rest.cuisine_types.slice(0, 2).join(' and ')}.`
  }
  if (rest.num_reviews && rest.num_reviews > 0) {
    return `${rest.num_reviews.toLocaleString()} traveler reviews to compare before you reserve.`
  }
  return 'Real restaurant listing with detail page, island context, and booking-planning actions.'
}

function paramsFrom(values: Record<string, string | undefined | null>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value?.trim()) params.set(key, value.trim())
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function restaurantExploreFoodHref(island?: string | null, cuisine?: string | null): string {
  const search = cuisine || 'Food'
  return `/explore/places${paramsFrom({ island, category: 'Dining', search })}`
}

function restaurantAskBuddyHref(rest: TripAdvisorLocation): string {
  const prompt = [
    `Tell me about ${rest.name}`,
    rest.island_name ? `Island: ${rest.island_name}` : '',
    rest.cuisine_types?.[0] ? `Cuisine: ${rest.cuisine_types[0]}` : '',
  ].filter(Boolean).join('. ')
  return buddyChatHref(prompt)
}

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: { island?: string; cuisine?: string }
}) {
  const activeIsland = searchParams.island ?? ''
  const activeCuisine = searchParams.cuisine ?? ''

  const [restaurants, cuisineTypes] = await Promise.all([
    getRestaurants(activeIsland || undefined, activeCuisine || undefined),
    getCuisineTypes(),
  ])

  const islandOptions = getIslandOptions()

  function buildFilterUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = {
      island: activeIsland,
      cuisine: activeCuisine,
      ...overrides,
    }
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value)
    }
    const qs = params.toString()
    return qs ? `/restaurants?${qs}` : '/restaurants'
  }

  const activeFilters = [
    activeIsland ? { label: 'Island', value: activeIsland, href: buildFilterUrl({ island: undefined }) } : null,
    activeCuisine ? { label: 'Cuisine', value: activeCuisine, href: buildFilterUrl({ cuisine: undefined }) } : null,
  ].filter((item): item is { label: string; value: string; href: string } => Boolean(item))
  const startFoodTripHref = `/dashboard/trips/new${paramsFrom({ returnTo: '/restaurants', source: 'restaurant' })}`
  const exploreFoodCultureHref = restaurantExploreFoodHref(activeIsland || undefined, activeCuisine || 'Food')
  const askFoodBuddyHref = buddyChatHref(activeIsland ? `Recommend restaurants in ${activeIsland}` : 'Recommend restaurants for my Bahamas trip')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: activeIsland
      ? `Best Restaurants in ${activeIsland}, Bahamas`
      : 'Best Restaurants in the Bahamas',
    numberOfItems: restaurants.length,
    itemListElement: restaurants.slice(0, 20).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Restaurant',
        name: r.name,
        ...(r.cuisine_types && r.cuisine_types.length > 0 && {
          servesCuisine: r.cuisine_types.join(', '),
        }),
        ...(r.rating && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: r.rating,
            reviewCount: r.num_reviews ?? 0,
          },
        }),
      },
    })),
  }

  const renderFilterControls = () => (
    <>
      <FilterGroup label="Island" description="Choose the island or settlement.">
        <FilterChip href={buildFilterUrl({ island: undefined })} active={!activeIsland}>
          All islands
        </FilterChip>
        {islandOptions.map(({ slug, name }) => (
          <FilterChip
            key={slug}
            href={buildFilterUrl({ island: name })}
            active={activeIsland === name}
          >
            {name}
          </FilterChip>
        ))}
      </FilterGroup>

      {cuisineTypes.length > 0 && (
        <FilterGroup label="Cuisine" description="Seafood, Bahamian, fine dining, cafes, and more.">
          <FilterChip href={buildFilterUrl({ cuisine: undefined })} active={!activeCuisine} tone="gold">
            All cuisines
          </FilterChip>
          {cuisineTypes.slice(0, 18).map((cuisine) => (
            <FilterChip
              key={cuisine}
              href={buildFilterUrl({ cuisine })}
              active={activeCuisine === cuisine}
              tone="gold"
            >
              {cuisine}
            </FilterChip>
          ))}
        </FilterGroup>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-white">
      <TrackView
        event="restaurants_directory_viewed"
        props={{
          island_filter: activeIsland || 'all',
          cuisine_filter: activeCuisine || 'all',
          restaurant_count: restaurants.length,
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <CompactPageHeader
        eyebrow="Bahamas dining"
        title={activeIsland ? `Where to eat in ${activeIsland}` : 'Bahamas dining guide'}
        subtitle="Find island restaurants, local seafood, waterfront spots, and refined dining with real photos, ratings, and Buddy context."
        crumbs={[
          { href: '/', label: 'Home' },
          { label: 'Restaurants' },
        ]}
        actions={(
          <>
            <Link
              href={startFoodTripHref}
              className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Start food trip
            </Link>
            <Link
              href={exploreFoodCultureHref}
              className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Explore food culture
            </Link>
            <Link
              href={askFoodBuddyHref}
              className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-extrabold text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-night"
            >
              Ask Buddy
            </Link>
          </>
        )}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <ResultFilterPanel
          ariaLabel="Filter restaurants"
          eyebrow="Filter restaurants"
          title={`${restaurants.length} restaurant${restaurants.length !== 1 ? 's' : ''} found`}
          description="Narrow dining by island and cuisine without turning the page into a chat handoff."
          activeFilters={activeFilters}
          clearHref="/restaurants"
          emptyLabel="Showing all restaurants"
          desktopGridClassName="md:grid-cols-2"
        >
          {renderFilterControls()}
        </ResultFilterPanel>

        {/* Results count */}
        <div className="mb-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
            Results
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-500">
            {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''}
            {activeIsland ? ` in ${activeIsland}` : ''}
            {activeCuisine ? ` | ${activeCuisine}` : ''}
          </p>
        </div>

        {/* Grid */}
        {restaurants.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600">
              No restaurants found
            </p>
            <p className="text-sm mt-2">
              Restaurant data is being loaded. Check back soon.
            </p>
            <Link
              href="/restaurants"
              className="inline-block mt-4 text-night hover:text-gray-700 text-sm font-medium"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((rest) => {
              const heroPhoto = rest.photos?.[0]?.url ?? null
              const previewReason = restaurantPreviewReason(rest)
              const detailHref = `/restaurants/${rest.location_id}`
              const addToTripHref = `${detailHref}#trip-actions`
              const exploreNearbyHref = restaurantExploreFoodHref(rest.island_name, rest.cuisine_types?.[0])
              const askBuddyHref = restaurantAskBuddyHref(rest)

              return (
                <article
                  key={rest.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    <ImageWithSourcePolicy
                      src={heroPhoto}
                      alt={rest.name}
                      title={rest.name}
                      eyebrow="Bahamas dining"
                      description="Real listing available. Restaurant photo is not available yet."
                      className="h-48"
                      tone="neutral"
                    />
                    {rest.rating && (
                      <div className="absolute top-3 right-3 inline-flex items-center bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
                        <span className="text-xs font-bold text-gray-700">
                          Rating {rest.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="text-base font-bold text-gray-900 leading-snug line-clamp-1">
                      {rest.name}
                    </h2>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {rest.cuisine_types && rest.cuisine_types.length > 0 && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-charcoal">
                          {rest.cuisine_types[0]}
                        </span>
                      )}
                      {rest.island_name && (
                        <span className="text-xs text-gray-400">
                          {rest.island_name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      {rest.price_level && (
                        <PriceLevelDisplay level={rest.price_level} />
                      )}
                      {rest.num_reviews != null && rest.num_reviews > 0 && (
                        <span className="text-xs text-gray-400">
                          {rest.num_reviews.toLocaleString()} reviews
                        </span>
                      )}
                    </div>

                    {rest.cuisine_types && rest.cuisine_types.length > 1 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {rest.cuisine_types.slice(1, 4).map((c) => (
                          <span
                            key={c}
                            className="rounded-full border border-gray-200 bg-white px-3 py-0.5 text-xs font-medium text-gray-600"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {rest.reviews && rest.reviews.length > 0 && (
                      <p className="text-xs text-gray-500 mt-3 line-clamp-2 italic leading-relaxed flex-1">
                        &ldquo;{rest.reviews[0].text}&rdquo;
                      </p>
                    )}

                    <div className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-500">
                        Why Buddy picked this
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-charcoal">
                        {previewReason}
                      </p>
                    </div>

                    <div className="mt-auto pt-4">
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={detailHref}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-center text-xs font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
                        >
                          View details
                        </Link>
                        <Link
                          href={addToTripHref}
                          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-3 py-2.5 text-center text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                        >
                          Add to trip
                        </Link>
                        <Link
                          href={exploreNearbyHref}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-center text-xs font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
                        >
                          More food nearby
                        </Link>
                        <Link
                          href={askBuddyHref}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-center text-xs font-semibold text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-night"
                        >
                          Ask Buddy
                        </Link>
                      </div>
                      <span className="sr-only">
                        View details
                      </span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Island landing pages */}
        <section className="mt-16">
          <h2 className="text-xl font-bold text-gray-900 mb-5">
            Restaurants by Island
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {islandOptions.map(({ slug, name }) => (
              <Link
                key={slug}
                href={`/restaurants/${slug}`}
                className="group rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-400 hover:bg-gray-50"
              >
                <p className="text-sm font-semibold text-gray-900 group-hover:text-night">
                  Dining in {name}
                </p>
                <p className="mt-1 text-xs text-gray-400">Browse</p>
              </Link>
            ))}
          </div>
        </section>

        {/* App CTA */}
        <div className="mt-16 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h2 className="mb-2 text-2xl font-bold text-night">
            Get personalized dining picks
          </h2>
          <p className="mb-6 text-gray-600">
            Save restaurants into a trip, browse food culture nearby, or ask Buddy when you need planning context.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={startFoodTripHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Start food trip
            </Link>
            <Link
              href={exploreFoodCultureHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Explore food culture
            </Link>
            <Link
              href={askFoodBuddyHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-night"
            >
              Ask Buddy
            </Link>
          </div>
        </div>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}
