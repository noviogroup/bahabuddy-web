import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import TrackView from '@/components/TrackView'
import { BahaImages, FALLBACK_IMAGE } from '@/lib/baha-images'
import type { TripAdvisorLocation } from '@/lib/tripadvisor/types'
import { ISLAND_SLUG_MAP } from '@/lib/tripadvisor/types'

export const metadata: Metadata = {
  title: 'Best Restaurants in the Bahamas | Baha Buddy',
  description:
    'Browse top-rated Bahamas restaurants across Nassau, Exuma, Eleuthera, and more. Cuisine, ratings, photos, and TripAdvisor reviews.',
  openGraph: {
    title: 'Best Restaurants in the Bahamas | Baha Buddy',
    description:
      'Find the best Bahamas dining — browse by island, cuisine, and rating.',
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
      className="font-bold text-brand-600 text-sm"
      aria-label={`Price level ${level}`}
    >
      {'$'.repeat(Math.min(count, 4))}
      <span className="text-gray-300">
        {'$'.repeat(Math.max(0, 4 - count))}
      </span>
    </span>
  )
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

      <div className="relative overflow-hidden text-white">
        <Image
          src={BahaImages.bahamasLifestyle}
          alt="Bahamas dining and culture"
          fill
          priority
          className="object-cover"
          sizes="100vw"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/90 via-brand-700/75 to-brand-500/55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(245,183,49,0.32),transparent_34%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-20 text-center">
          <p className="text-gold-200 text-sm font-extrabold tracking-[0.22em] uppercase mb-3">
            Bahamas Dining
          </p>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">
            {activeIsland ? `Where to Eat in ${activeIsland}` : 'Bahamas Dining Guide'}
          </h1>
          <p className="text-white/85 text-lg max-w-2xl mx-auto leading-8">
            Find island restaurants, local seafood, waterfront spots, and refined dining with real photos, ratings, and Buddy context.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard?q=Recommend+restaurants+for+my+Bahamas+trip"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-brand-700 shadow-soft transition-colors hover:bg-brand-50"
            >
              Ask Buddy for food picks
            </Link>
            <Link
              href="/destinations"
              className="rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-extrabold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              Explore by island
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Island filter pills */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
            Island
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={activeCuisine ? `/restaurants?cuisine=${encodeURIComponent(activeCuisine)}` : '/restaurants'}
              className={`text-sm rounded-full px-4 py-1.5 font-medium transition-colors ${
                !activeIsland
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Islands
            </Link>
            {islandOptions.map(({ slug, name }) => {
              const params = new URLSearchParams()
              params.set('island', name)
              if (activeCuisine) params.set('cuisine', activeCuisine)
              return (
                <Link
                  key={slug}
                  href={`/restaurants?${params.toString()}`}
                  className={`text-sm rounded-full px-4 py-1.5 font-medium transition-colors ${
                    activeIsland === name
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {name}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Cuisine filter pills */}
        {cuisineTypes.length > 0 && (
          <div className="mb-8">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
              Cuisine
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={activeIsland ? `/restaurants?island=${encodeURIComponent(activeIsland)}` : '/restaurants'}
                className={`text-sm rounded-full px-4 py-1.5 font-medium transition-colors ${
                  !activeCuisine
                    ? 'bg-gold-400 text-night'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Cuisines
              </Link>
              {cuisineTypes.slice(0, 15).map((cuisine) => {
                const params = new URLSearchParams()
                if (activeIsland) params.set('island', activeIsland)
                params.set('cuisine', cuisine)
                return (
                  <Link
                    key={cuisine}
                    href={`/restaurants?${params.toString()}`}
                    className={`text-sm rounded-full px-4 py-1.5 font-medium transition-colors ${
                      activeCuisine === cuisine
                        ? 'bg-gold-400 text-night'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cuisine}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Results count */}
        <p className="text-sm text-gray-400 mb-6">
          {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''}
          {activeIsland ? ` in ${activeIsland}` : ''}
          {activeCuisine ? ` · ${activeCuisine}` : ''}
        </p>

        {/* Grid */}
        {restaurants.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600">
              No restaurants found
            </p>
            <p className="text-sm mt-2">
              Restaurant data is being loaded — check back soon.
            </p>
            <Link
              href="/restaurants"
              className="inline-block mt-4 text-brand-600 hover:text-brand-700 text-sm font-medium"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((rest) => {
              const heroPhoto = rest.photos?.[0]?.url ?? FALLBACK_IMAGE

              return (
                <Link
                  key={rest.id}
                  href={`/restaurants/${rest.location_id}`}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col"
                >
                  <div className="relative h-48 overflow-hidden bg-stone-200">
                    <Image
                      src={heroPhoto}
                      alt={rest.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      unoptimized
                    />
                    {rest.rating && (
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
                        <span className="text-amber-400 text-sm">★</span>
                        <span className="text-xs font-bold text-gray-700">
                          {rest.rating.toFixed(1)}
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
                        <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
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
                            className="text-xs bg-gray-50 text-gray-600 rounded-full px-3 py-0.5 font-medium border border-gray-100"
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

                    <div className="mt-auto pt-4">
                      <span className="text-sm font-semibold text-brand-600 group-hover:text-brand-700 transition-colors">
                        View details &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
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
                className="bg-gray-50 hover:bg-brand-50 border border-gray-100 hover:border-brand-100 rounded-xl p-4 transition-colors group"
              >
                <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-700">
                  Dining in {name}
                </p>
                <p className="text-xs text-gray-400 mt-1">Browse &rarr;</p>
              </Link>
            ))}
          </div>
        </section>

        {/* App CTA */}
        <div className="mt-16 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 rounded-2xl p-8 text-center text-white shadow-card">
          <h2 className="text-2xl font-bold mb-2">
            Get personalized dining picks
          </h2>
          <p className="text-brand-50 mb-6">
            Tell Baha Buddy your cuisine preferences — we&apos;ll recommend the
            best spots.
          </p>
          <Link
            href="/dashboard?q=Recommend+restaurants+in+the+Bahamas"
            className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold rounded-xl px-6 py-3 hover:bg-brand-50 transition-colors text-sm"
          >
            Chat with Baha Buddy
          </Link>
        </div>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}
