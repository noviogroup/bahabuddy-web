import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { BahaLogo } from '@/components/ui'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import TrackView from '@/components/TrackView'
import { PlanWithBuddyCTA } from '@/components/detail/PlanWithBuddyCTA'
import { FALLBACK_IMAGE } from '@/lib/baha-images'
import type { TripAdvisorLocation } from '@/lib/tripadvisor/types'
import {
  isIslandSlug,
  getIslandDisplayName,
  formatAddress,
  ISLAND_SLUG_MAP,
} from '@/lib/tripadvisor/types'

export const revalidate = 86400

interface PageProps {
  params: { id: string }
}

async function getHotelByLocationId(
  locationId: string,
): Promise<TripAdvisorLocation | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tripadvisor_locations')
      .select('*')
      .eq('location_id', locationId)
      .eq('category', 'hotels')
      .single()
    if (error || !data) return null
    return data as TripAdvisorLocation
  } catch {
    return null
  }
}

async function getHotelsByIsland(
  islandName: string,
): Promise<TripAdvisorLocation[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tripadvisor_locations')
      .select('*')
      .eq('category', 'hotels')
      .ilike('island_name', islandName)
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(50)
    if (error || !data) return []
    return data as TripAdvisorLocation[]
  } catch {
    return []
  }
}

async function getSimilarHotels(
  hotel: TripAdvisorLocation,
): Promise<TripAdvisorLocation[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('tripadvisor_locations')
      .select('*')
      .eq('category', 'hotels')
      .ilike('island_name', hotel.island_name ?? '')
      .neq('location_id', hotel.location_id)
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(4)
    return (data as TripAdvisorLocation[]) ?? []
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const slug = params.id

  if (isIslandSlug(slug)) {
    const name = getIslandDisplayName(slug)
    return {
      title: `Best Hotels in ${name} Bahamas | Baha Buddy`,
      description: `Top-rated hotels in ${name}, Bahamas. Browse reviews, photos, amenities, and book your perfect stay.`,
      alternates: { canonical: `/hotels/${slug}` },
      openGraph: {
        title: `Best Hotels in ${name} Bahamas | Baha Buddy`,
        description: `Browse top hotels in ${name} with ratings and TripAdvisor reviews.`,
      },
    }
  }

  const hotel = await getHotelByLocationId(slug)
  if (!hotel) return {}
  return {
    title: `${hotel.name} — ${hotel.island_name ?? 'Bahamas'} Hotel | Baha Buddy`,
    description: `${hotel.name} in ${hotel.island_name ?? 'the Bahamas'}. ${hotel.rating ? `Rated ${hotel.rating}/5` : ''} ${hotel.num_reviews ? `(${hotel.num_reviews} reviews)` : ''}. Photos, amenities, and TripAdvisor reviews.`.trim(),
    alternates: { canonical: `/hotels/${slug}` },
    openGraph: {
      title: `${hotel.name} | Baha Buddy`,
      description: `${hotel.name} hotel in ${hotel.island_name ?? 'the Bahamas'}`,
      images: hotel.photos?.[0]?.url ? [{ url: hotel.photos[0].url }] : undefined,
    },
  }
}

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base'
  return (
    <span className={`text-amber-400 ${cls} leading-none`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < Math.floor(rating) ? 'text-amber-400' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </span>
  )
}

function IslandListingPage({
  slug,
  islandName,
  hotels,
}: {
  slug: string
  islandName: string
  hotels: TripAdvisorLocation[]
}) {
  const islandOptions = Object.entries(ISLAND_SLUG_MAP)
    .reduce<{ slug: string; name: string }[]>((acc, [s, n]) => {
      if (!acc.find((x) => x.name === n)) acc.push({ slug: s, name: n })
      return acc
    }, [])
    .sort((a, b) => a.name.localeCompare(b.name))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best Hotels in ${islandName}, Bahamas`,
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
      },
    })),
  }

  return (
    <div className="min-h-screen bg-white">
      <TrackView event="hotels_island_viewed" props={{ island: islandName, hotel_count: hotels.length }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <BahaLogo href="/" size="md" />
          <div className="flex items-center gap-4">
            <Link href="/hotels" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              All Hotels
            </Link>
            <Link href="/restaurants" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              Restaurants
            </Link>
            <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-br from-brand-600 to-brand-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <nav className="text-white/60 text-sm mb-3" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="mx-2">›</span>
            <Link href="/hotels" className="hover:text-white transition-colors">Hotels</Link>
            <span className="mx-2">›</span>
            <span className="text-white/80">{islandName}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Best Hotels in {islandName}
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            Top-rated stays in {islandName}, Bahamas — with reviews and photos from TripAdvisor.
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Island navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/hotels"
            className="text-sm rounded-full px-4 py-1.5 font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            All Islands
          </Link>
          {islandOptions.map((opt) => (
            <Link
              key={opt.slug}
              href={`/hotels/${opt.slug}`}
              className={`text-sm rounded-full px-4 py-1.5 font-medium transition-colors ${
                opt.slug === slug
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.name}
            </Link>
          ))}
        </div>

        <p className="text-sm text-gray-400 mb-6">
          {hotels.length} hotel{hotels.length !== 1 ? 's' : ''} in {islandName}
        </p>

        {hotels.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600">No hotels found in {islandName}</p>
            <p className="text-sm mt-2">Hotel data is being loaded — check back soon.</p>
            <Link href="/hotels" className="inline-block mt-4 text-brand-600 hover:text-brand-700 text-sm font-medium">
              Browse all hotels
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotels.map((hotel) => {
              const heroPhoto = hotel.photos?.[0]?.url ?? FALLBACK_IMAGE
              return (
                <Link
                  key={hotel.id}
                  href={`/hotels/${hotel.location_id}`}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col"
                >
                  <div className="relative h-48 overflow-hidden bg-stone-200">
                    <Image src={heroPhoto} alt={hotel.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" unoptimized />
                    {hotel.hotel_class && (
                      <div className="absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 bg-white/90 text-amber-600 backdrop-blur-sm">{hotel.hotel_class}</div>
                    )}
                    {hotel.rating && (
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
                        <span className="text-amber-400 text-sm">★</span>
                        <span className="text-xs font-bold text-gray-700">{hotel.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="text-base font-bold text-gray-900 leading-snug line-clamp-1">{hotel.name}</h2>
                    {hotel.num_reviews != null && hotel.num_reviews > 0 && (
                      <p className="text-xs text-gray-400 mt-1">{hotel.num_reviews.toLocaleString()} reviews</p>
                    )}
                    {hotel.amenities && hotel.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {hotel.amenities.slice(0, 3).map((a) => (
                          <span key={a} className="text-xs bg-brand-50 text-brand-700 rounded-full px-3 py-0.5 font-medium">{a}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto pt-4">
                      <span className="text-sm font-semibold text-brand-600 group-hover:text-brand-700 transition-colors">View details &rarr;</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}

function HotelDetailPage({
  hotel,
  similar,
}: {
  hotel: TripAdvisorLocation
  similar: TripAdvisorLocation[]
}) {
  const photos = hotel.photos ?? []
  const heroUrl = photos[0]?.url ?? FALLBACK_IMAGE
  const addr = formatAddress(hotel.address)
  const reviews = hotel.reviews ?? []

  const planPrompt = `Tell me about ${hotel.name}${hotel.island_name ? ` in ${hotel.island_name}` : ''}, Bahamas`
  const addPrompt = `Book ${hotel.name} for my Bahamas trip`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: hotel.name,
    ...(addr && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: hotel.address?.street1,
        addressLocality: hotel.address?.city,
        addressRegion: hotel.address?.state,
        addressCountry: hotel.address?.country ?? 'BS',
      },
    }),
    ...(hotel.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: hotel.rating,
        bestRating: 5,
        reviewCount: hotel.num_reviews ?? 0,
      },
    }),
    ...(hotel.website && { url: hotel.website }),
    ...(photos.length > 0 && { image: photos.map((p) => p.url) }),
  }

  return (
    <div className="min-h-screen bg-white">
      <TrackView event="hotel_detail_viewed" props={{ location_id: hotel.location_id, hotel_name: hotel.name, island: hotel.island_name }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <BahaLogo href="/" size="md" />
          <div className="flex items-center gap-4">
            <Link href="/hotels" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              ← All Hotels
            </Link>
            <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative h-72 md:h-[28rem] overflow-hidden">
        <Image src={heroUrl} alt={hotel.name} fill className="object-cover" priority sizes="100vw" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-6xl mx-auto">
          <nav className="text-white/70 text-sm mb-2" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="mx-2">›</span>
            <Link href="/hotels" className="hover:text-white transition-colors">Hotels</Link>
            {hotel.island_name && (
              <>
                <span className="mx-2">›</span>
                <span className="text-white/80">{hotel.island_name}</span>
              </>
            )}
          </nav>
          <div className="flex items-center gap-3 mb-3">
            {hotel.hotel_class && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/80 text-white backdrop-blur-sm">
                {hotel.hotel_class}
              </span>
            )}
            {hotel.price_level && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                {hotel.price_level}
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{hotel.name}</h1>
          {hotel.island_name && <p className="text-white/80 text-lg">{hotel.island_name}, Bahamas</p>}
          {hotel.rating && (
            <div className="mt-3 flex items-center gap-2">
              <StarRating rating={hotel.rating} size="lg" />
              <span className="text-white font-bold text-lg">{hotel.rating.toFixed(1)}</span>
              {hotel.num_reviews != null && hotel.num_reviews > 0 && (
                <span className="text-white/60 text-sm">({hotel.num_reviews.toLocaleString()} reviews)</span>
              )}
            </div>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* Photo gallery */}
            {photos.length > 1 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Photos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {photos.slice(0, 9).map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100">
                      <Image
                        src={photo.url}
                        alt={photo.caption || `${hotel.name} — photo ${idx + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, 33vw"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Amenities */}
            {hotel.amenities && hotel.amenities.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {hotel.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <span className="text-brand-500 text-sm">✓</span>
                      <span className="text-sm font-medium text-gray-700">{amenity}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Guest Reviews</h2>
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        {review.rating && (
                          <span className="text-amber-400 text-sm leading-none">
                            {'★'.repeat(Math.floor(review.rating))}
                            <span className="text-gray-300">{'★'.repeat(5 - Math.floor(review.rating))}</span>
                          </span>
                        )}
                        <span className="text-xs text-gray-400 font-medium">{review.author}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Map */}
            {hotel.latitude && hotel.longitude && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Location</h2>
                <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 aspect-video">
                  <iframe
                    title={`Map of ${hotel.name}`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${hotel.latitude},${hotel.longitude}&zoom=14`}
                  />
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Details</h3>

              {hotel.island_name && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Location</p>
                  <p className="text-sm text-gray-700 font-medium">{hotel.island_name}, Bahamas</p>
                </div>
              )}

              {addr && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Address</p>
                  <p className="text-sm text-gray-700">{addr}</p>
                </div>
              )}

              {hotel.price_level && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Price level</p>
                  <p className="text-sm text-gray-700 font-medium">{hotel.price_level}</p>
                </div>
              )}

              {hotel.hotel_class && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Hotel class</p>
                  <p className="text-sm text-gray-700 font-medium">{hotel.hotel_class}</p>
                </div>
              )}

              {hotel.website && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Website</p>
                  <a href={hotel.website} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:text-brand-700 font-medium break-all">
                    Visit website →
                  </a>
                </div>
              )}

              {hotel.tripadvisor_url && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">TripAdvisor</p>
                  <div className="flex items-center gap-2">
                    {hotel.rating && (
                      <span className="text-sm font-bold text-emerald-600">★ {hotel.rating.toFixed(1)}</span>
                    )}
                    {hotel.num_reviews != null && hotel.num_reviews > 0 && (
                      <span className="text-xs text-gray-400">({hotel.num_reviews.toLocaleString()})</span>
                    )}
                  </div>
                  <a href={hotel.tripadvisor_url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1 mt-1">
                    View on TripAdvisor →
                  </a>
                </div>
              )}
            </div>
          </aside>
        </div>

        <div className="mt-14">
          <PlanWithBuddyCTA kind="stay" planPrompt={planPrompt} addPrompt={addPrompt} />
        </div>

        {/* Similar hotels */}
        {similar.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold text-gray-900 mb-5">
              More hotels in {hotel.island_name ?? 'the Bahamas'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map((s) => (
                <Link key={s.id} href={`/hotels/${s.location_id}`} className="group">
                  <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative aspect-video overflow-hidden bg-stone-100">
                      <Image src={s.photos?.[0]?.url ?? FALLBACK_IMAGE} alt={s.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 50vw, 25vw" unoptimized />
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{s.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {s.rating && <span className="text-xs text-amber-500 font-semibold">★ {s.rating.toFixed(1)}</span>}
                        {s.hotel_class && <span className="text-xs text-gray-400">{s.hotel_class}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}

export default async function HotelSlugPage({ params }: PageProps) {
  const slug = params.id

  if (isIslandSlug(slug)) {
    const islandName = getIslandDisplayName(slug)
    const hotels = await getHotelsByIsland(islandName)
    return <IslandListingPage slug={slug} islandName={islandName} hotels={hotels} />
  }

  const hotel = await getHotelByLocationId(slug)
  if (!hotel) notFound()

  const similar = await getSimilarHotels(hotel)
  return <HotelDetailPage hotel={hotel} similar={similar} />
}
