import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import { createClient } from '@/lib/supabase/server'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import { PlanWithBuddyCTA } from '@/components/detail/PlanWithBuddyCTA'
import DirectTripItemActions from '@/components/trip/DirectTripItemActions'
import TrackView from '@/components/TrackView'

export const revalidate = 300

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

async function getPlace(id: string): Promise<PlaceDetail | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('bahamas_attractions').select('*').eq('id', id).single()
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

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

function categoryToTripItem(category?: string | null): 'restaurant' | 'activity' {
  const key = (category || '').toLowerCase()
  return key.includes('food') || key.includes('dining') || key.includes('restaurant')
    ? 'restaurant'
    : 'activity'
}

function categoryToTimeSlot(category?: string | null): 'morning' | 'afternoon' | 'evening' {
  const key = (category || '').toLowerCase()
  if (key.includes('food') || key.includes('dining') || key.includes('night')) return 'evening'
  if (key.includes('culture') || key.includes('landmark')) return 'morning'
  return 'afternoon'
}

function paramsFrom(values: Record<string, string | undefined | null>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value?.trim()) params.set(key, value.trim())
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export default async function PlaceDetailPage({ params }: PageProps) {
  const place = await getPlace(params.id)
  if (!place) notFound()

  const [photos, reviews, similar] = await Promise.all([getPlacePhotos(params.id), getPlaceReviews(params.id), getSimilarPlaces(place)])

  const isEnriched = !!place.enriched_at
  const tripItemType = categoryToTripItem(place.category)
  const primaryImageUrl = place.image_url ?? photos[0]?.url ?? null
  const relatedPlacesHref = `/explore/places${paramsFrom({
    island: place.island,
    category: place.category,
    search: place.category,
  })}`

  const planPrompt = `Tell me everything about ${place.name}${place.island ? ` in ${place.island}` : ''}, Bahamas`
  const addPrompt = `Help me plan a Bahamas day around ${place.name}`

  return (
    <div className="min-h-screen bg-white">
      <TrackView event="attraction_viewed" props={{ attraction_id: params.id, attraction_name: place.name, category: place.category }} />

      <CompactPageHeader
        eyebrow="Place detail"
        title={place.name}
        subtitle={place.island ? `${place.island}, Bahamas` : 'Bahamas explore guide'}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/explore', label: 'Explore' },
          { href: '/explore/places', label: 'Places' },
          ...(place.island ? [{ label: place.island }] : []),
          { label: place.name },
        ]}
        actions={
          <>
            <Link href="#trip-actions" className="inline-flex items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-soft transition hover:bg-brand-700">
              Add to trip
            </Link>
            <Link href={relatedPlacesHref} className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-night transition hover:border-gray-300 hover:bg-gray-50">
              More nearby
            </Link>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-charcoal">
            {place.category}
          </span>
          {place.price_range && (
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-charcoal">
              {place.price_range}
            </span>
          )}
          {isEnriched && place.rating && (
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-charcoal">
              Rating {place.rating.toFixed(1)}{place.review_count != null && place.review_count > 0 ? ` (${place.review_count} reviews)` : ''}
            </span>
          )}
          {place.tripadvisor_rating != null && (
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-charcoal">
              TripAdvisor {place.tripadvisor_rating.toFixed(1)}{place.tripadvisor_num_reviews != null && place.tripadvisor_num_reviews > 0 ? ` (${place.tripadvisor_num_reviews.toLocaleString()} reviews)` : ''}
            </span>
          )}
        </div>
      </CompactPageHeader>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <ImageWithSourcePolicy
          src={primaryImageUrl}
          alt={place.name}
          title={place.name}
          eyebrow={place.category}
          description="Place details are available. Provider photo is not available yet."
          pendingLabel="Photo pending"
          tone="island"
          className="mb-10 aspect-[16/7] min-h-[240px] rounded-baha-xl border border-gray-200 shadow-sm"
          imageClassName="object-cover"
          sizes="(max-width: 768px) 100vw, 1100px"
          priority
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <section><h2 className="text-xl font-bold text-gray-900 mb-3">About</h2><p className="text-gray-600 text-base leading-relaxed">{place.description}</p></section>

            {photos.length > 0 && <section><h2 className="text-xl font-bold text-gray-900 mb-4">Photos</h2><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{photos.map((photo, idx) => <div key={photo.id} className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100"><Image src={photo.thumbnail_url || photo.url} alt={photo.caption || `${place.name} — photo ${idx + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 50vw, 33vw" unoptimized />{photo.caption && <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3"><p className="text-white text-xs">{photo.caption}</p></div>}</div>)}</div></section>}

            {isEnriched && place.amenities && place.amenities.length > 0 && <section><h2 className="text-xl font-bold text-gray-900 mb-4">Amenities</h2><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{place.amenities.map((amenity) => <div key={amenity} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden="true" /><span className="text-sm font-medium text-gray-700 capitalize">{amenity}</span></div>)}</div></section>}

            {isEnriched && ((place.pros && place.pros.length > 0) || (place.cons && place.cons.length > 0)) && <section><h2 className="text-xl font-bold text-gray-900 mb-4">What travelers say</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{place.pros && place.pros.length > 0 && <div className="rounded-2xl p-5 border border-gray-200 bg-white shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">What works well</h3><ul className="space-y-2">{place.pros.map((pro, i) => <li key={i} className="flex items-start gap-2 text-sm text-charcoal"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-palm-500" aria-hidden="true" />{pro}</li>)}</ul></div>}{place.cons && place.cons.length > 0 && <div className="rounded-2xl p-5 border border-gray-200 bg-white shadow-sm"><h3 className="text-sm font-bold text-gray-900 mb-3">Good to know</h3><ul className="space-y-2">{place.cons.map((con, i) => <li key={i} className="flex items-start gap-2 text-sm text-charcoal"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" aria-hidden="true" />{con}</li>)}</ul></div>}</div></section>}

            {reviews.length > 0 && <section><h2 className="text-xl font-bold text-gray-900 mb-4">Review scores</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{reviews.map((r) => <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{r.platform}</p>{r.rating != null && <p className="text-3xl font-bold text-gray-900">{r.rating.toFixed(1)}</p>}{r.review_count != null && <p className="text-xs text-gray-400 mt-1">{r.review_count} reviews</p>}{r.summary && <p className="text-sm text-gray-500 mt-3 leading-relaxed">{r.summary}</p>}</div>)}</div></section>}

            {isEnriched && place.lat && place.lng && <section><h2 className="text-xl font-bold text-gray-900 mb-4">Location</h2><div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 aspect-video"><iframe title={`Map of ${place.name}`} width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${place.lat},${place.lng}&zoom=14`} /></div><div className="mt-3"><a href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:text-brand-700 font-medium">Get directions →</a></div></section>}
          </div>

          <aside className="space-y-6">
            <DirectTripItemActions
              itemType={tripItemType}
              sourceId={place.id}
              sourceType="web_place_detail"
              name={place.name}
              island={place.island}
              imageUrl={place.image_url}
              returnPath={`/explore/places/${place.id}#trip-actions`}
              heading={tripItemType === 'restaurant' ? 'Save this food spot' : 'Save this experience'}
              description="Add this directly to a trip. Buddy remains secondary for questions and planning."
              primaryLabel={tripItemType === 'restaurant' ? 'Add food spot to trip' : 'Add experience to trip'}
              createTripLabel="Create trip for this item"
              savedLabel={tripItemType === 'restaurant' ? 'Saved food spot to trip' : 'Saved experience to trip'}
              timeSlot={categoryToTimeSlot(place.category)}
              notes={place.short_description ?? place.description.slice(0, 180)}
              metadata={{
                category: place.category,
                tags: place.tags,
                rating: place.rating ?? place.tripadvisor_rating,
                reviewCount: place.review_count ?? place.tripadvisor_num_reviews,
                sourceUrl: place.source_url,
                website: place.website,
                tripadvisorUrl: place.tripadvisor_url,
              }}
            />

            <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Details</h3>
              {place.island && <div><p className="text-xs text-gray-400 font-medium">Location</p><Link href={`/explore/island/${place.island.toLowerCase().replace(/[\s&]+/g, '-').replace(/[()]/g, '')}`} className="text-sm text-brand-600 hover:text-brand-700 font-medium">{place.island}, Bahamas</Link></div>}
              {place.phone && <div><p className="text-xs text-gray-400 font-medium">Phone</p><a href={`tel:${place.phone}`} className="text-sm text-gray-700 hover:text-brand-600">{place.phone}</a></div>}
              {place.website && <div><p className="text-xs text-gray-400 font-medium">Website</p><a href={place.website} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:text-brand-700 font-medium break-all">Visit website →</a></div>}
              {place.price_range && <div><p className="text-xs text-gray-400 font-medium">Price range</p><p className="text-sm text-gray-700 font-medium">{place.price_range}</p></div>}
              {place.tripadvisor_url && <div><p className="text-xs text-gray-400 font-medium">TripAdvisor</p><a href={place.tripadvisor_url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1 mt-1">View on TripAdvisor →</a></div>}
            </div>

            {isEnriched && place.hours && Object.keys(place.hours).length > 0 && <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Hours</h3><div className="space-y-2">{Object.entries(place.hours).map(([day, time]) => <div key={day} className="flex justify-between text-sm"><span className="text-gray-500 font-medium">{DAY_LABELS[day.toLowerCase()] ?? day}</span><span className="text-gray-700">{time}</span></div>)}</div></div>}

            {place.tags && place.tags.length > 0 && <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Tags</h3><div className="flex flex-wrap gap-2">{place.tags.map((tag) => <span key={tag} className="text-xs bg-white text-gray-600 rounded-full px-3 py-1 border border-gray-200 font-medium">{tag}</span>)}</div></div>}
          </aside>
        </div>

        <div className="mt-14"><PlanWithBuddyCTA kind="experience" planPrompt={planPrompt} addPrompt={addPrompt} /></div>

        {similar.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold text-gray-900 mb-5">
              More in {place.island ?? 'the Bahamas'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map((s) => (
                <Link key={s.id} href={`/explore/places/${s.id}`} className="group">
                  <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <ImageWithSourcePolicy
                      src={s.image_url}
                      alt={s.name}
                      title={s.name}
                      eyebrow={s.category}
                      description="Similar place details are available. Place image is not available yet."
                      className="aspect-video"
                      imageClassName="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      tone="island"
                    />
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{s.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{s.category}</span>
                        {s.rating && (
                          <span className="text-xs text-amber-700 font-semibold">
                            Rating {s.rating.toFixed(1)}
                          </span>
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
