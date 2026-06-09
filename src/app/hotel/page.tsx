import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import TrackView from '@/components/TrackView'
import { FALLBACK_IMAGE } from '@/lib/baha-images'
import { getHotels, getIslandOptions, getPropertyTypes } from '@/lib/hotels'

export const metadata: Metadata = {
  title: 'Bahamas Hotels — Browse 700+ Properties | Baha Buddy',
  description:
    'Explore 700+ hotels across the Bahamas — from luxury resorts in Nassau to boutique stays in Exuma. Compare ratings, amenities, and book your perfect hotel.',
  openGraph: {
    title: 'Bahamas Hotels — Browse 700+ Properties | Baha Buddy',
    description:
      'Find your perfect Bahamas hotel. Browse resorts, villas, and apartments across 16 islands with live availability and rates.',
  },
}

export const revalidate = 3600

function StarBadge({ stars }: { stars: number }) {
  return (
    <span className="text-amber-400 text-xs leading-none" aria-label={`${stars} star`}>
      {'★'.repeat(Math.floor(stars))}
    </span>
  )
}

export default async function HotelPage({
  searchParams,
}: {
  searchParams: { island?: string; type?: string; stars?: string; sort?: string }
}) {
  const activeIsland = searchParams.island ?? ''
  const activeType = searchParams.type ?? ''
  const minStars = searchParams.stars ? parseInt(searchParams.stars, 10) : undefined
  const sortBy = searchParams.sort === 'stars' ? 'stars' : 'rating'

  const [hotels, islands, propertyTypes] = await Promise.all([
    getHotels({
      island: activeIsland || undefined,
      propertyType: activeType || undefined,
      minStars: minStars && minStars >= 1 && minStars <= 5 ? minStars : undefined,
      sort: sortBy as 'rating' | 'stars',
    }),
    getIslandOptions(),
    getPropertyTypes(),
  ])

  function buildFilterUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = {
      island: activeIsland,
      type: activeType,
      stars: searchParams.stars,
      sort: searchParams.sort,
      ...overrides,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v)
    }
    const qs = params.toString()
    return qs ? `/hotel?${qs}` : '/hotel'
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: activeIsland
      ? `Hotels in ${activeIsland}, Bahamas`
      : 'Hotels in the Bahamas',
    numberOfItems: hotels.length,
    itemListElement: hotels.slice(0, 20).map((h, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'LodgingBusiness',
        name: h.name,
        url: `https://bahabuddy.com/hotel/${h.id}`,
        ...(h.star_rating && { starRating: { '@type': 'Rating', ratingValue: h.star_rating } }),
        ...(h.review_score && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: h.review_score,
            reviewCount: h.review_count ?? 0,
          },
        }),
      },
    })),
  }

  return (
    <div className="min-h-screen bg-white">
      <TrackView
        event="hotel_directory_viewed"
        props={{
          island_filter: activeIsland || 'all',
          type_filter: activeType || 'all',
          stars_filter: minStars ?? 'any',
          sort: sortBy,
          hotel_count: hotels.length,
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <p className="text-brand-100 text-sm font-semibold tracking-widest uppercase mb-3">
            Bahamas Hotels
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            {activeIsland
              ? `Hotels in ${activeIsland}`
              : 'Find Your Perfect Bahamas Hotel'}
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            Browse {hotels.length}+ hotels, resorts, and villas across 16 stunning islands.
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Island filter pills */}
        {islands.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
              Island
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildFilterUrl({ island: undefined })}
                className={`text-sm rounded-full px-4 py-1.5 font-medium transition-colors ${
                  !activeIsland
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Islands
              </Link>
              {islands.map((name) => (
                <Link
                  key={name}
                  href={buildFilterUrl({ island: name })}
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
          </div>
        )}

        {/* Property type filter */}
        {propertyTypes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
              Property Type
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildFilterUrl({ type: undefined })}
                className={`text-sm rounded-full px-4 py-1.5 font-medium transition-colors ${
                  !activeType
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Types
              </Link>
              {propertyTypes.map((t) => (
                <Link
                  key={t}
                  href={buildFilterUrl({ type: t })}
                  className={`text-sm rounded-full px-4 py-1.5 font-medium transition-colors ${
                    activeType === t
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sort + star filter row */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Stars</span>
            <div className="flex gap-1">
              {[3, 4, 5].map((s) => (
                <Link
                  key={s}
                  href={buildFilterUrl({ stars: minStars === s ? undefined : String(s) })}
                  className={`text-xs rounded-full px-3 py-1 font-medium transition-colors ${
                    minStars === s
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s}+ ★
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Sort</span>
            <Link
              href={buildFilterUrl({ sort: undefined })}
              className={`text-xs rounded-full px-3 py-1 font-medium transition-colors ${
                sortBy === 'rating'
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Top Rated
            </Link>
            <Link
              href={buildFilterUrl({ sort: 'stars' })}
              className={`text-xs rounded-full px-3 py-1 font-medium transition-colors ${
                sortBy === 'stars'
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Star Rating
            </Link>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-400 mb-6">
          {hotels.length} hotel{hotels.length !== 1 ? 's' : ''}
          {activeIsland ? ` in ${activeIsland}` : ''}
          {activeType ? ` · ${activeType}` : ''}
        </p>

        {/* Grid */}
        {hotels.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600">No hotels found</p>
            <p className="text-sm mt-2">
              Try adjusting your filters or check back soon.
            </p>
            <Link
              href="/hotel"
              className="inline-block mt-4 text-brand-600 hover:text-brand-700 text-sm font-medium"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotels.map((hotel) => {
              const heroPhoto = hotel.main_photo_url
                ?? (hotel.photos && hotel.photos.length > 0 ? hotel.photos[0].url : null)
                ?? FALLBACK_IMAGE

              return (
                <Link
                  key={hotel.id}
                  href={`/hotel/${hotel.id}`}
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
                    {hotel.star_rating && hotel.star_rating > 0 && (
                      <div className="absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 bg-white/90 text-amber-600 backdrop-blur-sm">
                        {hotel.star_rating} ★
                      </div>
                    )}
                    {hotel.review_score && (
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
                        <span className="text-amber-400 text-sm">★</span>
                        <span className="text-xs font-bold text-gray-700">
                          {hotel.review_score.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="text-base font-bold text-gray-900 leading-snug line-clamp-1">
                      {hotel.name}
                    </h2>

                    <div className="flex items-center gap-2 mt-1">
                      {hotel.property_type_name && (
                        <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                          {hotel.property_type_name}
                        </span>
                      )}
                      {hotel.island && (
                        <span className="text-xs text-gray-400">
                          {hotel.island}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      {hotel.star_rating && hotel.star_rating > 0 && (
                        <StarBadge stars={hotel.star_rating} />
                      )}
                      {hotel.review_count != null && hotel.review_count > 0 && (
                        <span className="text-xs text-gray-400">
                          {hotel.review_count.toLocaleString()} reviews
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

                    <div className="mt-auto pt-4">
                      <span className="text-sm font-semibold text-brand-600 group-hover:text-brand-700 transition-colors">
                        View details →
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* App CTA */}
        <div className="mt-16 bg-gradient-to-r from-brand-600 to-brand-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">
            Let Baha Buddy find your perfect hotel
          </h2>
          <p className="text-brand-100 mb-6">
            Tell us your dates, budget, and vibe — we&apos;ll match you with the best option.
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
