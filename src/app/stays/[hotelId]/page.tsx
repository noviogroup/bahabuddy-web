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
  getHotelReviews,
  getLiveHotelPhotoUrls,
  getSimilarHotels,
  hotelHeroPhotoUrl,
  hotelPhotoUrls,
  uniqueHotelPhotoUrls,
  type HotelReview,
} from '@/lib/hotels'
import AvailabilityWidget from '@/components/stays/AvailabilityWidget'
import ExpandableReviewText from '@/components/stays/ExpandableReviewText'
import StayPhotoGallery, { StayMorePhotosGrid } from '@/components/stays/StayPhotoGallery'
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

function formatReviewDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date)
}

function StayReviewsSection({
  hotelName,
  reviewScore,
  reviewCount,
  reviews,
}: {
  hotelName: string
  reviewScore: number | null
  reviewCount: number | null
  reviews: HotelReview[]
}) {
  if ((reviewScore == null || reviewScore <= 0) && reviews.length === 0) return null

  const hasWrittenReviews = reviews.length > 0
  const reviewCountLabel = reviewCount != null && reviewCount > 0
    ? `${reviewCount.toLocaleString()} review${reviewCount === 1 ? '' : 's'}`
    : 'Provider review count pending'

  return (
    <section aria-labelledby="guest-reviews" className="space-y-4">
      <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-brand-700">
              Guest reviews
            </p>
            <h2 id="guest-reviews" className="mt-1 text-2xl font-bold text-night">
              What guests are saying
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal">
              Read recent guest notes, then compare live rooms and rules before saving this stay.
            </p>
          </div>

          {reviewScore != null && reviewScore > 0 && (
            <div className="shrink-0 rounded-baha-lg border border-brand-100 bg-brand-50 px-5 py-4">
              <p className="text-xs font-bold uppercase text-brand-700">Guest rating</p>
              <p className="mt-1 text-3xl font-bold text-night">{reviewScore.toFixed(1)}</p>
              <p className="text-sm font-semibold text-charcoal">{reviewCountLabel}</p>
            </div>
          )}
        </div>
      </div>

      {hasWrittenReviews ? (
        <div className="grid gap-3 md:grid-cols-2">
          {reviews.map((review) => {
            const dateLabel = formatReviewDate(review.time)

            return (
              <article key={`${review.authorName}-${review.time ?? review.text.slice(0, 16)}`} className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-night">{review.authorName}</h3>
                    {dateLabel && (
                      <p className="mt-0.5 text-xs font-semibold text-gray-500">{dateLabel}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-bold text-night">
                    {review.rating.toFixed(1)}
                  </span>
                </div>
                <ExpandableReviewText
                  text={review.text}
                  className="text-sm leading-6 text-charcoal"
                />
              </article>
            )
          })}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-night">Aggregate score available</p>
            <p className="mt-2 text-sm leading-6 text-charcoal">
              {hotelName} currently shows {reviewScore != null && reviewScore > 0 ? `a ${reviewScore.toFixed(1)} guest rating` : 'a provider rating'} from {reviewCountLabel.toLowerCase()}.
            </p>
          </div>
          <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-night">Written comments pending</p>
            <p className="mt-2 text-sm leading-6 text-charcoal">
              The provider record does not include readable guest comments yet, so Baha Buddy is not showing invented quotes.
            </p>
          </div>
          <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-night">Best next check</p>
            <p className="mt-2 text-sm leading-6 text-charcoal">
              Review live room rules, cancellation policy, taxes, and total price before saving this stay to your trip.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

export default async function StayDetailPage({ params, searchParams = {} }: PageProps) {
  const hotel = await getHotelById(params.hotelId)
  if (!hotel) notFound()

  const staySearch = readStaySearchParams(searchParams)
  const cachedPhotoUrls = hotelPhotoUrls(hotel)
  const livePhotoPromise = cachedPhotoUrls.length < 8
    ? getLiveHotelPhotoUrls(hotel.id)
    : Promise.resolve([])
  const [similar, reviews, livePhotoUrls] = await Promise.all([
    getSimilarHotels(hotel),
    getHotelReviews(hotel.id),
    livePhotoPromise,
  ])
  const photoUrls = uniqueHotelPhotoUrls(cachedPhotoUrls, livePhotoUrls)
  const heroUrl = photoUrls[0] ?? hotelHeroPhotoUrl(hotel) ?? FALLBACK_IMAGE
  const galleryUrls = photoUrls.length > 0 ? photoUrls : [heroUrl]
  const photoCountLabel = galleryUrls.length > 1
    ? `${galleryUrls.length} hotel photos`
    : 'Live hotel gallery'

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
              className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Check rates
            </Link>
            <Link
              href={buddyChatHref(planPrompt)}
              className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              Ask Buddy
            </Link>
          </>
        )}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <section aria-label={`${hotel.name} photo gallery`} className="mb-8">
          <StayPhotoGallery
            hotelName={hotel.name}
            galleryUrls={galleryUrls}
            heroUrl={heroUrl}
            photoCountLabel={photoCountLabel}
          />

          <nav aria-label="Stay detail sections" className="mt-5 flex gap-2 overflow-x-auto border-b border-gray-200 pb-2 text-sm font-bold text-charcoal">
            {[
              ['Overview', '#overview'],
              ['Reviews', '#guest-reviews'],
              ['Rooms', '#availability'],
              ['Location', '#location'],
              ['Policies', '#stay-facts'],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="shrink-0 rounded-full px-4 py-2 transition-colors hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                {label}
              </Link>
            ))}
          </nav>
        </section>

        <section id="availability" className="scroll-mt-24 mb-10">
          <AvailabilityWidget
            hotelId={hotel.id}
            hotelName={hotel.name}
            initialCheckin={staySearch.checkin || undefined}
            initialCheckout={staySearch.checkout || undefined}
            initialAdults={staySearch.adults}
            initialChildren={staySearch.children}
            initialRooms={staySearch.rooms}
            roomImageUrls={galleryUrls}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <section id="overview" className="scroll-mt-24 grid gap-3 rounded-baha-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-3">
              {hotel.review_score != null && hotel.review_score > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500">Guest rating</p>
                  <p className="mt-1 text-lg font-bold text-night">Rating {hotel.review_score.toFixed(1)}</p>
                  {hotel.review_count != null && hotel.review_count > 0 && (
                    <p className="text-xs font-semibold text-gray-500">{hotel.review_count.toLocaleString()} reviews</p>
                  )}
                </div>
              )}
              {hotel.property_type_name && (
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500">Type</p>
                  <p className="mt-1 text-lg font-bold text-night">{hotel.property_type_name}</p>
                </div>
              )}
              {hotel.island && (
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500">Island</p>
                  <p className="mt-1 text-lg font-bold text-night">{hotel.island}</p>
                </div>
              )}
            </section>

            <StayReviewsSection
              hotelName={hotel.name}
              reviewScore={hotel.review_score}
              reviewCount={hotel.review_count}
              reviews={reviews}
            />

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
            {galleryUrls.length > 5 && (
              <section id="more-photos" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-gray-900 mb-4">More photos</h2>
                <StayMorePhotosGrid hotelName={hotel.name} galleryUrls={galleryUrls} />
              </section>
            )}

            {/* Amenities */}
            {hotel.amenities && hotel.amenities.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {hotel.amenities.map((amenity) => (
                    <div key={amenity} className="rounded-xl bg-gray-50 p-3">
                      <span className="text-sm font-medium text-gray-700">{amenity}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Map */}
            {hotel.latitude != null && hotel.longitude != null && (
              <section id="location" className="scroll-mt-24">
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
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <StayDetailActions
              hotelId={hotel.id}
              hotelName={hotel.name}
              island={hotel.island}
              imageUrl={heroUrl}
              propertyTypeName={hotel.property_type_name}
              starRating={hotel.star_rating}
              reviewScore={hotel.review_score}
            />

            {/* Details card */}
            <div id="stay-facts" className="scroll-mt-24 space-y-4 rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase text-brand-700">Stay facts</h3>

              {hotel.island && (
                <div>
                  <p className="text-xs font-semibold text-gray-500">Location</p>
                  <p className="text-sm font-semibold text-night">{hotel.island}, Bahamas</p>
                </div>
              )}

              {hotel.address && (
                <div>
                  <p className="text-xs font-semibold text-gray-500">Address</p>
                  <p className="text-sm leading-6 text-charcoal">{hotel.address}</p>
                </div>
              )}

              {hotel.star_rating != null && hotel.star_rating > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500">Star rating</p>
                  <p className="text-sm font-semibold text-night">{hotel.star_rating} Star</p>
                </div>
              )}

              {hotel.property_type_name && (
                <div>
                  <p className="text-xs font-semibold text-gray-500">Property type</p>
                  <p className="text-sm font-semibold text-night">{hotel.property_type_name}</p>
                </div>
              )}

              {hotel.review_score != null && hotel.review_score > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500">Guest rating</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-night">Rating {hotel.review_score.toFixed(1)}</span>
                    {hotel.review_count != null && hotel.review_count > 0 && (
                      <span className="text-xs font-semibold text-gray-500">({hotel.review_count.toLocaleString()} reviews)</span>
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
