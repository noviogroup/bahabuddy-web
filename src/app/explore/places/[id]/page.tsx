import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import { createClient } from '@/lib/supabase/server'
import { FALLBACK_IMAGE } from '@/lib/baha-images'
import { BahaLogo } from '@/components/ui'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import { PlanWithBuddyCTA } from '@/components/detail/PlanWithBuddyCTA'
import TrackView from '@/components/TrackView'

export const revalidate = 300

// ─── Types ──────────────────────────────────────────────────────────────────

interface PlaceDetail {
  id: string
  name: string
  category: string
  island: string | null
  description: string
  image_url: string | null
  source_url: string | null
  tags: string[]
  rating: number | null
  review_count: number | null
  amenities: string[] | null
  pros: string[] | null
  cons: string[] | null
  short_description: string | null
  phone: string | null
  website: string | null
  hours: Record<string, string> | null
  price_range: string | null
  lat: number | null
  lng: number | null
  enriched_at: string | null
  tripadvisor_url: string | null
  tripadvisor_rating: number | null
  tripadvisor_num_reviews: number | null
}

interface PlacePhoto {
  id: string
  url: string
  thumbnail_url: string | null
  caption: string | null
  source: string | null
  sort_order: number
}

interface PlaceReview {
  id: string
  platform: string
  rating: number | null
  review_count: number | null
  summary: string | null
}

interface SimilarPlace {
  id: string
  name: string
  category: string
  island: string | null
  image_url: string | null
  rating: number | null
}

// ─── Data fetchers ──────────────────────────────────────────────────────────

async function getPlace(id: string): Promise<PlaceDetail | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bahamas_attractions')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return null
    return data as PlaceDetail
  } catch {
    return null
  }
}

async function getPlacePhotos(placeId: string): Promise<PlacePhoto[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('place_photos')
      .select('id, url, thumbnail_url, caption, source, sort_order')
      .eq('place_id', placeId)
      .eq('place_type', 'attraction')
      .order('sort_order', { ascending: true })
      .limit(12)
    return (data as PlacePhoto[]) ?? []
  } catch {
    return []
  }
}

async function getPlaceReviews(placeId: string): Promise<PlaceReview[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('place_reviews')
      .select('id, platform, rating, review_count, summary')
      .eq('place_id', placeId)
      .eq('place_type', 'attraction')
    return (data as PlaceReview[]) ?? []
  } catch {
    return []
  }
}

async function getSimilarPlaces(place: PlaceDetail): Promise<SimilarPlace[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('bahamas_attractions')
      .select('id, name, category, island, image_url, rating')
      .eq('island', place.island ?? '')
      .neq('id', place.id)
      .limit(4)
    return (data as SimilarPlace[]) ?? []
  } catch {
    return []
  }
}

// ─── Metadata ───────────────────────────────────────────────────────────────

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const place = await getPlace(params.id)
  if (!place) return {}
  const desc = place.short_description || place.description
  return {
    title: `${place.name} — ${place.island ?? 'Bahamas'} | Baha Buddy`,
    description: desc.slice(0, 160),
    alternates: { canonical: `/explore/places/${place.id}` },
    openGraph: {
      title: `${place.name} | Baha Buddy`,
      description: desc.slice(0, 160),
      images: place.image_url ? [{ url: place.image_url }] : undefined,
    },
  }
}

// ─── Visual maps ────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  attraction: 'bg-brand-500 text-white',
  beach: 'bg-cyan-500 text-white',
  beach_bar: 'bg-amber-500 text-white',
  cultural: 'bg-purple-500 text-white',
  diving: 'bg-sky-600 text-white',
  fishing: 'bg-teal-600 text-white',
  food_culture: 'bg-rose-500 text-white',
  landmark: 'bg-stone-600 text-white',
  national_park: 'bg-emerald-600 text-white',
  natural_wonder: 'bg-emerald-500 text-white',
  snorkeling: 'bg-cyan-500 text-white',
  wildlife: 'bg-lime-600 text-white',
  Hotel: 'bg-purple-500 text-white',
  Restaurant: 'bg-rose-500 text-white',
  Activity: 'bg-emerald-500 text-white',
  Nature: 'bg-green-600 text-white',
  Culture: 'bg-orange-500 text-white',
  Beach: 'bg-cyan-500 text-white',
  Dining: 'bg-rose-500 text-white',
  'Water Activity': 'bg-sky-500 text-white',
}

// Amenity → icon glyph. Keys are lowercased on lookup so DB rows
// can be written in any case. The '✦' fallback below catches any
// amenity name we haven't mapped yet (a generic four-pointed star).
const AMENITY_ICONS: Record<string, string> = {
  wifi: '📶',
  'free wifi': '📶',
  pool: '🏊',
  'swimming pool': '🏊',
  beach: '🏖️',
  'beach access': '🏖️',
  parking: '🅿️',
  'free parking': '🅿️',
  breakfast: '🍳',
  restaurant: '🍽️',
  bar: '🍹',
  'bar/lounge': '🍹',
  spa: '💆',
  gym: '🏋️',
  'fitness center': '🏋️',
  'kid-friendly': '👶',
  'family-friendly': '👶',
  'kids club': '👶',
  snorkeling: '🤿',
  'snorkel gear': '🤿',
  diving: '🌊',
  fishing: '🎣',
  boating: '⛵',
  'water sports': '🌊',
  'air conditioning': '❄️',
  ac: '❄️',
  oceanview: '🏝️',
  'ocean view': '🏝️',
  'pet-friendly': '🐕',
  'pets allowed': '🐕',
  'room service': '🛋️',
  'concierge': '🐝',
  'airport shuttle': '🚐',
  laundry: '🧺',
  'all-inclusive': '✨',
  marina: '⚓',
  casino: '🎲',
  nightlife: '🌟',
  shopping: '🛍️',
  live_music: '🎶',
  'live music': '🎶',
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function PlaceDetailPage({ params }: PageProps) {
  const place = await getPlace(params.id)
  if (!place) notFound()

  const [photos, reviews, similar] = await Promise.all([
    getPlacePhotos(params.id),
    getPlaceReviews(params.id),
    getSimilarPlaces(place),
  ])

  const isEnriched = !!place.enriched_at
  const heroUrl = place.image_url || FALLBACK_IMAGE
  const catColor = CATEGORY_COLORS[place.category] ?? 'bg-gray-500 text-white'

  const planPrompt = `Tell me everything about ${place.name}${place.island ? ` in ${place.island}` : ''}, Bahamas`
  const addPrompt = `Add ${place.name} to my Bahamas trip plan`

  return (
    <div className="min-h-screen bg-white">
      <TrackView event="attraction_viewed" props={{ attraction_id: params.id, attraction_name: place.name, category: place.category }} />
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <BahaLogo href="/" size="md" />
          <div className="flex items-center gap-4">
            <Link
              href="/explore/places"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            >
              ← All Places
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative h-72 md:h-[28rem] overflow-hidden">
        <Image
          src={heroUrl}
          alt={place.name}
          fill
          className="object-cover"
          priority
          sizes="100vw"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-6xl mx-auto">
          <nav className="text-white/70 text-sm mb-2" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="mx-2">›</span>
            <Link href="/explore/places" className="hover:text-white transition-colors">Places</Link>
            {place.island && (
              <>
                <span className="mx-2">›</span>
                <span className="text-white/80">{place.island}</span>
              </>
            )}
          </nav>
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${catColor}`}>
              {place.category}
            </span>
            {place.price_range && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                {place.price_range}
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{place.name}</h1>
          {place.island && (
            <p className="text-white/80 text-lg">{place.island}, Bahamas</p>
          )}

          {/* Rating overlay */}
          {isEnriched && place.rating && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex">
                {Array.from({ length: 5 }, (_, i) => (
                  <span
                    key={i}
                    className={`text-lg ${i < Math.floor(place.rating!) ? 'text-amber-400' : 'text-white/30'}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-white font-bold text-lg">{place.rating.toFixed(1)}</span>
              {place.review_count != null && place.review_count > 0 && (
                <span className="text-white/60 text-sm">({place.review_count} reviews)</span>
              )}
            </div>
          )}
          {place.tripadvisor_rating != null && (
            <div className={`${isEnriched && place.rating ? 'mt-1' : 'mt-3'} flex items-center gap-2`}>
              <span className="text-emerald-400 font-bold text-sm">TripAdvisor</span>
              <span className="text-white font-bold">{place.tripadvisor_rating.toFixed(1)}</span>
              {place.tripadvisor_num_reviews != null && place.tripadvisor_num_reviews > 0 && (
                <span className="text-white/60 text-sm">
                  ({place.tripadvisor_num_reviews.toLocaleString()} reviews)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content — 2/3 */}
          <div className="lg:col-span-2 space-y-10">
            {/* Description */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
              <p className="text-gray-600 text-base leading-relaxed">
                {place.description}
              </p>
            </section>

            {/* Photo gallery */}
            {photos.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Photos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {photos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100"
                    >
                      <Image
                        src={photo.thumbnail_url || photo.url}
                        alt={photo.caption || `${place.name} — photo ${idx + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, 33vw"
                        unoptimized
                      />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                          <p className="text-white text-xs">{photo.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Amenities */}
            {isEnriched && place.amenities && place.amenities.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {place.amenities.map((amenity) => {
                    const icon = AMENITY_ICONS[amenity.toLowerCase()] ?? '✦'
                    return (
                      <div
                        key={amenity}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                      >
                        <span className="text-xl" aria-hidden="true">{icon}</span>
                        <span className="text-sm font-medium text-gray-700 capitalize">{amenity}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Pros / Cons */}
            {isEnriched && ((place.pros && place.pros.length > 0) || (place.cons && place.cons.length > 0)) && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">What travelers say</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {place.pros && place.pros.length > 0 && (
                    <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                      <h3 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                        Pros
                      </h3>
                      <ul className="space-y-2">
                        {place.pros.map((pro, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                            <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {place.cons && place.cons.length > 0 && (
                    <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100">
                      <h3 className="text-sm font-bold text-rose-700 mb-3 flex items-center gap-2">
                        Cons
                      </h3>
                      <ul className="space-y-2">
                        {place.cons.map((con, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-rose-800">
                            <span className="text-rose-400 mt-0.5 shrink-0">✕</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Reviews aggregate */}
            {reviews.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Review scores</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reviews.map((r) => (
                    <div
                      key={r.id}
                      className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-center"
                    >
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        {r.platform}
                      </p>
                      {r.rating != null && (
                        <p className="text-3xl font-bold text-gray-900">{r.rating.toFixed(1)}</p>
                      )}
                      {r.review_count != null && (
                        <p className="text-xs text-gray-400 mt-1">{r.review_count} reviews</p>
                      )}
                      {r.summary && (
                        <p className="text-sm text-gray-500 mt-3 leading-relaxed">{r.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Map */}
            {isEnriched && place.lat && place.lng && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Location</h2>
                <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 aspect-video">
                  <iframe
                    title={`Map of ${place.name}`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${place.lat},${place.lng}&zoom=14`}
                  />
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Get directions →
                  </a>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar — 1/3 */}
          <aside className="space-y-6">
            {/* Contact info card */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Details</h3>

              {place.island && (
                <div className="flex items-start gap-3">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Location</p>
                    <Link
                      href={`/explore/island/${place.island.toLowerCase().replace(/[\s&]+/g, '-').replace(/[()]/g, '')}`}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      {place.island}, Bahamas
                    </Link>
                  </div>
                </div>
              )}

              {place.phone && (
                <div className="flex items-start gap-3">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Phone</p>
                    <a href={`tel:${place.phone}`} className="text-sm text-gray-700 hover:text-brand-600">
                      {place.phone}
                    </a>
                  </div>
                </div>
              )}

              {place.website && (
                <div className="flex items-start gap-3">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Website</p>
                    <a
                      href={place.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium break-all"
                    >
                      Visit website →
                    </a>
                  </div>
                </div>
              )}

              {place.price_range && (
                <div className="flex items-start gap-3">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Price range</p>
                    <p className="text-sm text-gray-700 font-medium">{place.price_range}</p>
                  </div>
                </div>
              )}

              {place.tripadvisor_url && (
                <div className="flex items-start gap-3">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">TripAdvisor</p>
                    <div className="flex items-center gap-2">
                      {place.tripadvisor_rating != null && (
                        <span className="text-sm font-bold text-emerald-600">
                          ★ {place.tripadvisor_rating.toFixed(1)}
                        </span>
                      )}
                      {place.tripadvisor_num_reviews != null && place.tripadvisor_num_reviews > 0 && (
                        <span className="text-xs text-gray-400">
                          ({place.tripadvisor_num_reviews.toLocaleString()})
                        </span>
                      )}
                    </div>
                    <a
                      href={place.tripadvisor_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1 mt-1"
                    >
                      View on TripAdvisor →
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Hours */}
            {isEnriched && place.hours && Object.keys(place.hours).length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Hours</h3>
                <div className="space-y-2">
                  {Object.entries(place.hours).map(([day, time]) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="text-gray-500 font-medium">{DAY_LABELS[day.toLowerCase()] ?? day}</span>
                      <span className="text-gray-700">{time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {place.tags && place.tags.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {place.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-white text-gray-600 rounded-full px-3 py-1 border border-gray-200 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Plan with Buddy CTA */}
        <div className="mt-14">
          <PlanWithBuddyCTA
            kind="experience"
            planPrompt={planPrompt}
            addPrompt={addPrompt}
          />
        </div>

        {/* Similar places */}
        {similar.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold text-gray-900 mb-5">
              More in {place.island ?? 'the Bahamas'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map((s) => (
                <Link
                  key={s.id}
                  href={`/explore/places/${s.id}`}
                  className="group"
                >
                  <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative aspect-video overflow-hidden bg-stone-100">
                      <Image
                        src={s.image_url || FALLBACK_IMAGE}
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
                        <span className="text-xs text-gray-400">{s.category}</span>
                        {s.rating && (
                          <span className="text-xs text-amber-500 font-semibold">★ {s.rating.toFixed(1)}</span>
                        )}
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
