import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { BahaLogo } from '@/components/ui'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import TrackView from '@/components/TrackView'
import { FALLBACK_IMAGE } from '@/lib/baha-images'
import type { TripAdvisorLocation } from '@/lib/tripadvisor/types'
import { formatAddress, ISLAND_SLUG_MAP } from '@/lib/tripadvisor/types'

export const metadata: Metadata = {
  title: 'Best Hotels in the Bahamas | Baha Buddy',
  description:
    'Browse top-rated Bahamas hotels across Nassau, Exuma, Eleuthera, and more. Ratings, photos, amenities, and TripAdvisor reviews.',
  openGraph: {
    title: 'Best Hotels in the Bahamas | Baha Buddy',
    description:
      'Find the perfect Bahamas hotel — browse by island, rating, and price.',
  },
}

export const revalidate = 86400

async function getHotels(island?: string): Promise<TripAdvisorLocation[]> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('tripadvisor_locations')
      .select('*')
      .eq('category', 'hotels')
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(100)

    if (island) {
      query = query.ilike('island_name', island)
    }

    const { data, error } = await query
    if (error || !data) return []
    return data as TripAdvisorLocation[]
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

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.3
  return (
    <span className="text-amber-400 text-sm leading-none" aria-label={`${rating} out of 5`}>
      {'★'.repeat(full)}
      {half && '½'}
    </span>
  )
}

function PriceLevel({ level }: { level: string }) {
  const count = level === '$' ? 1 : level === '$$' ? 2 : level === '$$$' ? 3 : level === '$$$$' ? 4 : level.length
  return (
    <span className="font-bold text-brand-600 text-sm" aria-label={`Price level ${level}`}>
      {'$'.repeat(Math.min(count, 4))}
      <span className="text-gray-300">{'$'.repeat(Math.max(0, 4 - count))}</span>
    </span>
  )
}

export default async function HotelsPage({
  searchParams,
}: {
  searchParams: { island?: string }
}) {
  const activeIsland = searchParams.island ?? ''
  const hotels = await getHotels(activeIsland || undefined)
  const islandOptions = getIslandOptions()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: activeIsland
      ? `Best Hotels in ${activeIsland}, Bahamas`
      : 'Best Hotels in the Bahamas',
    numberOfItems: hotels.length,
    itemListElement: hotels.slice(0, 20).map((h, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Hotel',
        name: h.name,
        ...(h.rating && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: h.rating,
            reviewCount: h.num_reviews ?? 0,
          },
        }),
        ...(h.tripadvisor_url && { url: h.tripadvisor_url }),
      },
    })),
  }

  return (
    <div className="min-h-screen bg-white">
      <TrackView
        event="hotels_directory_viewed"
        props={{ island_filter: activeIsland || 'all', hotel_count: hotels.length }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <BahaLogo href="/" size="md" />
          <div className="flex items-center gap-4">
            <Link href="/restaurants" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              Restaurants
            </Link>
            <Link href="/destinations" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              Destinations
            </Link>
            <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <p className="text-brand-100 text-sm font-semibold tracking-widest uppercase mb-3">
            Bahamas Hotels
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            {activeIsland
              ? `Best Hotels in ${activeIsland}`
              : 'Find Your Perfect Bahamas Hotel'}
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            Browse top-rated hotels with reviews, photos, and amenities — powered by TripAdvisor.
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Island filter pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/hotels"
            className={`text-sm rounded-full px-4 py-1.5 font-medium transition-colors ${
              !activeIsland
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Islands
          </Link>
          {islandOptions.map(({ slug, name }) => (
            <Link
              key={slug}
              href={`/hotels?island=${encodeURIComponent(name)}`}
              className={`text-sm rounded-full px-4 py-1.5 font-medium transition-colors ${
                activeIsland === name
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {name}
            </Link>
          ))}
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-400 mb-6">
          {hotels.length} hotel{hotels.length !== 1 ? 's' : ''}
          {activeIsland ? ` in ${activeIsland}` : ''}
        </p>

        {/* Grid */}
        {hotels.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600">No hotels found</p>
            <p className="text-sm mt-2">
              Hotel data is being loaded — check back soon.
            </p>
            <Link
              href="/hotels"
              className="inline-block mt-4 text-brand-600 hover:text-brand-700 text-sm font-medium"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotels.map((hotel) => {
              const heroPhoto =
                hotel.photos && hotel.photos.length > 0
                  ? hotel.photos[0].url
                  : FALLBACK_IMAGE
              const addr = formatAddress(hotel.address)

              return (
                <Link
                  key={hotel.id}
                  href={`/hotels/${hotel.location_id}`}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col"
                >
                  <div className="relative h-48 overflow-hidden bg-stone-200">
                    <Image
                      src={heroPhoto}
                      alt={hotel.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      unoptimized
                    />
                    {hotel.hotel_class && (
                      <div className="absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 bg-white/90 text-amber-600 backdrop-blur-sm">
                        {hotel.hotel_class}
                      </div>
                    )}
                    {hotel.rating && (
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
                        <StarRating rating={hotel.rating} />
                        <span className="text-xs font-bold text-gray-700">
                          {hotel.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="text-base font-bold text-gray-900 leading-snug line-clamp-1">
                      {hotel.name}
                    </h2>

                    {(hotel.island_name || addr) && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                        {hotel.island_name ? `${hotel.island_name}, Bahamas` : addr}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      {hotel.price_level && (
                        <PriceLevel level={hotel.price_level} />
                      )}
                      {hotel.num_reviews != null && hotel.num_reviews > 0 && (
                        <span className="text-xs text-gray-400">
                          {hotel.num_reviews.toLocaleString()} reviews
                        </span>
                      )}
                    </div>

                    {hotel.amenities && hotel.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {hotel.amenities.slice(0, 3).map((a) => (
                          <span
                            key={a}
                            className="text-xs bg-brand-50 text-brand-700 rounded-full px-3 py-0.5 font-medium"
                          >
                            {a}
                          </span>
                        ))}
                        {hotel.amenities.length > 3 && (
                          <span className="text-xs text-gray-400 self-center">
                            +{hotel.amenities.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {hotel.reviews && hotel.reviews.length > 0 && (
                      <p className="text-xs text-gray-500 mt-3 line-clamp-2 italic leading-relaxed flex-1">
                        &ldquo;{hotel.reviews[0].text}&rdquo;
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
            Hotels by Island
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {islandOptions.map(({ slug, name }) => (
              <Link
                key={slug}
                href={`/hotels/${slug}`}
                className="bg-gray-50 hover:bg-brand-50 border border-gray-100 hover:border-brand-100 rounded-xl p-4 transition-colors group"
              >
                <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-700">
                  Hotels in {name}
                </p>
                <p className="text-xs text-gray-400 mt-1">Browse &rarr;</p>
              </Link>
            ))}
          </div>
        </section>

        {/* App CTA */}
        <div className="mt-16 bg-gradient-to-r from-brand-600 to-brand-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">
            Let Baha Buddy find your hotel
          </h2>
          <p className="text-brand-100 mb-6">
            Tell us your dates, budget, and vibe — we&apos;ll match you with the
            perfect stay.
          </p>
          <Link
            href="/dashboard?q=Help+me+find+a+hotel+in+the+Bahamas"
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
