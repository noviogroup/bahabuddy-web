import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import TrackView from '@/components/TrackView'
import { PlanWithBuddyCTA } from '@/components/detail/PlanWithBuddyCTA'
import { FALLBACK_IMAGE } from '@/lib/baha-images'
import { getHotelById, getSimilarHotels } from '@/lib/hotels'
import AvailabilityWidget from '@/components/stays/AvailabilityWidget'

export const revalidate = 3600

interface PageProps {
  params: { hotelId: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const hotel = await getHotelById(params.hotelId)
  if (!hotel) return {}
  return {
    title: `${hotel.name} — ${hotel.island ?? 'Bahamas'} Hotel | Baha Buddy`,
    description: `${hotel.name} in ${hotel.island ?? 'the Bahamas'}. ${hotel.star_rating ? `${hotel.star_rating}-star` : ''} ${hotel.property_type_name ?? 'hotel'}. View photos, amenities, and check live availability.`.trim(),
    alternates: { canonical: `/hotel/${hotel.id}` },
    openGraph: {
      title: `${hotel.name} | Baha Buddy`,
      description: `Explore ${hotel.name} in ${hotel.island ?? 'the Bahamas'} — photos, amenities, and live rates.`,
      images: hotel.main_photo_url ? [{ url: hotel.main_photo_url }] : undefined,
    },
  }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-lg leading-none">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < Math.floor(rating) ? 'text-amber-400' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </span>
  )
}

export default async function HotelDetailPage({ params }: PageProps) {
  const hotel = await getHotelById(params.hotelId)
  if (!hotel) notFound()

  const similar = await getSimilarHotels(hotel)
  const photos = hotel.photos ?? []
  const heroUrl = hotel.main_photo_url ?? photos[0]?.url ?? FALLBACK_IMAGE

  const planPrompt = `Tell me about ${hotel.name}${hotel.island ? ` in ${hotel.island}` : ''}, Bahamas`
  const addPrompt = `Book ${hotel.name} for my Bahamas trip`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: hotel.name,
    url: `https://bahabuddy.com/hotel/${hotel.id}`,
    ...(hotel.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: hotel.address,
        addressLocality: hotel.city,
        addressCountry: hotel.country_code ?? 'BS',
      },
    }),
    ...(hotel.star_rating && {
      starRating: { '@type': 'Rating', ratingValue: hotel.star_rating },
    }),
    ...(hotel.review_score && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: hotel.review_score,
        bestRating: 5,
        reviewCount: hotel.review_count ?? 0,
      },
    }),
    ...(heroUrl !== FALLBACK_IMAGE && { image: heroUrl }),
  }

  return (
    <div className="min-h-screen bg-white">
      <TrackView
        event="hotel_detail_viewed"
        props={{ hotel_id: hotel.id, hotel_name: hotel.name, island: hotel.island }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <div className="relative h-72 md:h-[28rem] overflow-hidden">
        <Image src={heroUrl} alt={hotel.name} fill className="object-cover" priority sizes="100vw" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-6xl mx-auto">
          <nav className="text-white/70 text-sm mb-2" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="mx-2">›</span>
            <Link href="/hotel" className="hover:text-white transition-colors">Hotels</Link>
            {hotel.island && (
              <>
                <span className="mx-2">›</span>
                <Link href={`/hotel?island=${encodeURIComponent(hotel.island)}`} className="hover:text-white transition-colors">
                  {hotel.island}
                </Link>
              </>
            )}
          </nav>
          <div className="flex items-center gap-3 mb-3">
            {hotel.star_rating && hotel.star_rating > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/80 text-white backdrop-blur-sm">
                {hotel.star_rating}-Star
              </span>
            )}
            {hotel.property_type_name && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                {hotel.property_type_name}
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{hotel.name}</h1>
          {hotel.island && <p className="text-white/80 text-lg">{hotel.island}, Bahamas</p>}
          {hotel.review_score && (
            <div className="mt-3 flex items-center gap-2">
              <StarRating rating={hotel.review_score} />
              <span className="text-white font-bold text-lg">{hotel.review_score.toFixed(1)}</span>
              {hotel.review_count != null && hotel.review_count > 0 && (
                <span className="text-white/60 text-sm">({hotel.review_count.toLocaleString()} reviews)</span>
              )}
            </div>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* Description */}
            {hotel.description && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {hotel.description}
                </p>
              </section>
            )}

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

            {/* Map */}
            {hotel.latitude && hotel.longitude && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Location</h2>
                {hotel.address && (
                  <p className="text-sm text-gray-500 mb-3">{hotel.address}</p>
                )}
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
            <AvailabilityWidget hotelId={hotel.id} hotelName={hotel.name} />

            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Details</h3>

              {hotel.island && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Location</p>
                  <p className="text-sm text-gray-700 font-medium">{hotel.island}, Bahamas</p>
                </div>
              )}

              {hotel.address && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Address</p>
                  <p className="text-sm text-gray-700">{hotel.address}</p>
                </div>
              )}

              {hotel.star_rating && hotel.star_rating > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Star rating</p>
                  <p className="text-sm text-gray-700 font-medium">{hotel.star_rating} Star</p>
                </div>
              )}

              {hotel.property_type_name && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Property type</p>
                  <p className="text-sm text-gray-700 font-medium">{hotel.property_type_name}</p>
                </div>
              )}

              {hotel.review_score && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Guest rating</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-600">★ {hotel.review_score.toFixed(1)}</span>
                    {hotel.review_count != null && hotel.review_count > 0 && (
                      <span className="text-xs text-gray-400">({hotel.review_count.toLocaleString()} reviews)</span>
                    )}
                  </div>
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
              More hotels in {hotel.island ?? 'the Bahamas'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map((s) => {
                const sPhoto = s.main_photo_url
                  ?? (s.photos && s.photos.length > 0 ? s.photos[0].url : null)
                  ?? FALLBACK_IMAGE

                return (
                  <Link key={s.id} href={`/hotel/${s.id}`} className="group">
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="relative aspect-video overflow-hidden bg-stone-100">
                        <Image
                          src={sPhoto}
                          alt={s.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 50vw, 25vw"
                          unoptimized
                        />
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{s.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {s.review_score && (
                            <span className="text-xs text-amber-500 font-semibold">★ {s.review_score.toFixed(1)}</span>
                          )}
                          {s.property_type_name && (
                            <span className="text-xs text-gray-400">{s.property_type_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}
