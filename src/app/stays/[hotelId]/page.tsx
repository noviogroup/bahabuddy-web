import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import TrackView from '@/components/TrackView'
import { PlanWithBuddyCTA } from '@/components/detail/PlanWithBuddyCTA'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import { FALLBACK_IMAGE } from '@/lib/baha-images'
import { buddyChatHref } from '@/lib/buddy-chat'
import {
  getHotelById,
  getSimilarHotels,
  hotelHeroPhotoUrl,
  hotelPhotoCaption,
  hotelPhotoUrl,
  hotelPhotoUrls,
} from '@/lib/hotels'
import AvailabilityWidget from '@/components/stays/AvailabilityWidget'
import StayDetailActions from '@/components/stays/StayDetailActions'
import { readStaySearchParams } from '@/lib/stay-search-params'

export const revalidate = 3600

interface PageProps {
  params: { hotelId: string }
  searchParams?: {
    checkin?: string
    checkout?: string
    adults?: string
    children?: string
    rooms?: string
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const hotel = await getHotelById(params.hotelId)
  if (!hotel) return {}
  return {
    title: `${hotel.name} - ${hotel.island ?? 'Bahamas'} | Book on Baha Buddy`,
    description: `${hotel.name} in ${hotel.island ?? 'the Bahamas'}. ${hotel.star_rating ? `${hotel.star_rating}-star` : ''} ${hotel.property_type_name ?? 'hotel'}. Check live availability and book your stay.`.trim(),
    alternates: { canonical: `/stays/${hotel.id}` },
    openGraph: {
      title: `${hotel.name} | Baha Buddy`,
      description: `Book ${hotel.name} in ${hotel.island ?? 'the Bahamas'}`,
      images: hotel.main_photo_url ? [{ url: hotel.main_photo_url }] : undefined,
    },
  }
}

export default async function StayDetailPage({ params, searchParams = {} }: PageProps) {
  const hotel = await getHotelById(params.hotelId)
  if (!hotel) notFound()

  const staySearch = readStaySearchParams(searchParams)
  const similar = await getSimilarHotels(hotel)
  const photos = hotel.photos ?? []
  const photoUrls = hotelPhotoUrls(hotel)
  const heroUrl = hotelHeroPhotoUrl(hotel) ?? FALLBACK_IMAGE
  const galleryUrls = photoUrls.length > 0 ? photoUrls : [heroUrl]
  const galleryPreview = galleryUrls.slice(0, 5)

  const planPrompt = `Tell me about ${hotel.name}${hotel.island ? ` in ${hotel.island}` : ''}, Bahamas`
  const addPrompt = `Help me plan a Bahamas trip around ${hotel.name}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: hotel.name,
    ...(hotel.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: hotel.address,
        addressLocality: hotel.city,
        addressCountry: hotel.country_code ?? 'BS',
      },
    }),
    ...(hotel.star_rating != null && hotel.star_rating > 0 && {
      starRating: { '@type': 'Rating', ratingValue: hotel.star_rating },
    }),
    ...(hotel.review_score != null && hotel.review_score > 0 && {
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
        event="stay_detail_viewed"
        props={{ hotel_id: hotel.id, hotel_name: hotel.name, island: hotel.island }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <CompactPageHeader
        eyebrow="Stay details"
        title={hotel.name}
        subtitle={`${hotel.island ? `${hotel.island}, Bahamas` : 'Bahamas'}${hotel.property_type_name ? ` | ${hotel.property_type_name}` : ''}${hotel.star_rating != null && hotel.star_rating > 0 ? ` | ${hotel.star_rating}-star` : ''}`}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/stays', label: 'Stays' },
          ...(hotel.island ? [{ label: hotel.island }] : []),
        ]}
        actions={(
          <>
            <Link
              href="#availability"
              className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-gold-400 align-middle" aria-hidden="true" />
              Check rates
            </Link>
            <Link
              href={buddyChatHref(planPrompt)}
              className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Ask Buddy
            </Link>
          </>
        )}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <section aria-label={`${hotel.name} photo gallery`} className="mb-8 grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="relative aspect-[16/10] overflow-hidden rounded-baha-xl bg-stone-100 md:aspect-[16/9]">
            <Image
              src={galleryPreview[0] ?? heroUrl}
              alt={hotel.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 66vw"
              unoptimized
            />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              {hotel.star_rating != null && hotel.star_rating > 0 && (
                <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-charcoal shadow-sm backdrop-blur-sm">
                  {hotel.star_rating}-star
                </span>
              )}
              {hotel.review_score != null && hotel.review_score > 0 && (
                <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-night shadow-soft backdrop-blur-sm">
                  Rating {hotel.review_score.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {galleryPreview.slice(1, 5).map((url, idx) => (
              <div key={url} className="relative min-h-28 overflow-hidden rounded-baha-lg bg-stone-100">
                <Image
                  src={url}
                  alt={`${hotel.name} photo ${idx + 2}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 16vw"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <section className="grid gap-3 rounded-baha-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-3">
              {hotel.review_score != null && hotel.review_score > 0 && (
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-gray-500">Guest rating</p>
                  <p className="mt-1 text-lg font-extrabold text-night">Rating {hotel.review_score.toFixed(1)}</p>
                  {hotel.review_count != null && hotel.review_count > 0 && (
                    <p className="text-xs font-semibold text-gray-500">{hotel.review_count.toLocaleString()} reviews</p>
                  )}
                </div>
              )}
              {hotel.property_type_name && (
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-gray-500">Type</p>
                  <p className="mt-1 text-lg font-extrabold text-night">{hotel.property_type_name}</p>
                </div>
              )}
              {hotel.island && (
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-gray-500">Island</p>
                  <p className="mt-1 text-lg font-extrabold text-night">{hotel.island}</p>
                </div>
              )}
            </section>

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
            {photoUrls.length > 5 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">More photos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {photos.slice(5, 14).map((photo, idx) => {
                    const url = hotelPhotoUrl(photo)
                    if (!url) return null
                    return (
                      <div key={url} className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100">
                        <Image
                          src={url}
                          alt={hotelPhotoCaption(photo) || `${hotel.name} - photo ${idx + 1}`}
                          fill
                          className="object-cover hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 50vw, 33vw"
                          unoptimized
                        />
                      </div>
                    )
                  })}
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
                      <span className="h-2 w-2 shrink-0 rounded-full bg-gray-400" aria-hidden="true" />
                      <span className="text-sm font-medium text-gray-700">{amenity}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Map */}
            {hotel.latitude != null && hotel.longitude != null && (
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
            <StayDetailActions
              hotelId={hotel.id}
              hotelName={hotel.name}
              island={hotel.island}
              imageUrl={heroUrl}
              propertyTypeName={hotel.property_type_name}
              starRating={hotel.star_rating}
              reviewScore={hotel.review_score}
            />

            {/* Availability Widget */}
            <div id="availability" className="scroll-mt-24">
              <AvailabilityWidget
                hotelId={hotel.id}
                hotelName={hotel.name}
                initialCheckin={staySearch.checkin || undefined}
                initialCheckout={staySearch.checkout || undefined}
                initialAdults={staySearch.adults}
                initialChildren={staySearch.children}
                initialRooms={staySearch.rooms}
              />
            </div>

            {/* Details card */}
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

              {hotel.star_rating != null && hotel.star_rating > 0 && (
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

              {hotel.review_score != null && hotel.review_score > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Guest rating</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-night">Rating {hotel.review_score.toFixed(1)}</span>
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
          <PlanWithBuddyCTA
            kind="stay"
            planPrompt={planPrompt}
            addPrompt={addPrompt}
            secondaryLabel="Plan around this stay"
          />
        </div>

        {/* Similar hotels */}
        {similar.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold text-gray-900 mb-5">
              More stays in {hotel.island ?? 'the Bahamas'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map((s) => {
                const sPhoto = hotelHeroPhotoUrl(s) ?? FALLBACK_IMAGE

                return (
                  <Link key={s.id} href={`/stays/${s.id}`} className="group">
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
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
                          {s.review_score != null && s.review_score > 0 && (
                            <span className="text-xs text-charcoal font-semibold">Rating {s.review_score.toFixed(1)}</span>
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
