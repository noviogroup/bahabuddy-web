import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlanWithBuddyCTA } from '@/components/detail/PlanWithBuddyCTA'
import { BackLink } from '@/components/detail/BackLink'
import { priceLevelToNightlyEstimate } from '@/lib/chat-tools'

/**
 * /hotels/[id] — Hotel detail page.
 *
 * The "Read more" destination from HotelCard. Server-rendered from
 * google_places (web's hotel data source per architecture decision #13).
 * When a web-side LiteAPI proxy is wired, this page should be extended
 * to fetch live room availability and pricing.
 *
 * URL param: `id` is the google_places.place_id value (URL-safe
 * alphanumeric + dashes/underscores typical of Google place IDs).
 *
 * Auth: handled by the (dashboard) route group layout.
 *
 * Image handling: photos come from arbitrary Google Places CDN domains
 * that aren't known until live data flows. Using raw <img> with
 * eslint-disable for now (matches the RichCards strategy). D.7b in
 * PERF-AUDIT.md documents how to convert to next/image once hostnames
 * are captured.
 */

const ISLAND_DISPLAY: Record<string, string> = {
  'nassau': 'Nassau',
  'paradise-island': 'Paradise Island',
  'exuma': 'Exuma',
  'eleuthera': 'Eleuthera',
  'harbour-island': 'Harbour Island',
  'andros': 'Andros',
  'grand-bahama': 'Grand Bahama',
  'bimini': 'Bimini',
  'long-island': 'Long Island',
  'abacos': 'The Abacos',
}

export const dynamic = 'force-dynamic'

interface HotelRow {
  place_id: string
  name: string | null
  type: string | null
  island_id: string | null
  rating: number | null
  user_ratings_total: number | null
  address: string | null
  price_level: number | null
  photo_url: string | null
  description: string | null
  amenities: string[] | null
}

export default async function HotelDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('google_places')
    .select('place_id:id, name, type, island_id, rating, user_ratings_total, address, price_level, photo_url:image_url, description, amenities')
    .eq('id', params.id)
    .eq('is_active', true)
    .in('type', ['lodging', 'hotel', 'resort'])
    .maybeSingle()

  const hotel = data as HotelRow | null
  if (!hotel) notFound()

  const name = hotel.name ?? 'Hotel'
  const island = hotel.island_id ? ISLAND_DISPLAY[hotel.island_id] ?? hotel.island_id : ''
  const rating = hotel.rating ?? 0
  const reviews = hotel.user_ratings_total ?? 0
  const priceLevel = hotel.price_level ?? 0
  const pricePerNight = priceLevelToNightlyEstimate(hotel.price_level)
  const amenities = hotel.amenities ?? []

  const planPrompt = `I'm looking at "${name}"${island ? ` on ${island}` : ''}. Tell me more about it and help me decide if it's right for my trip.`
  const addPrompt = `Add "${name}"${island ? ` on ${island}` : ''} to my trip.`

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <BackLink href="/dashboard/chat" label="Back to chat" />

      {/* Hero */}
      <div className="relative aspect-[16/9] sm:aspect-[2/1] rounded-baha-lg overflow-hidden mb-6 bg-gradient-to-br from-amber-700 to-amber-400">
        {hotel.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hotel.photo_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-7xl opacity-50" aria-hidden="true">🏨</span>
          </div>
        )}
      </div>

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-night leading-tight">
              {name}
            </h1>
            {island && (
              <p className="text-base text-gray-500 mt-1">
                {island}
              </p>
            )}
          </div>
          {rating > 0 && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl px-3 py-2 text-right">
              <p className="text-2xl font-extrabold text-brand-700 leading-none">
                {rating.toFixed(1)}
                <span className="text-sm font-medium text-brand-500 ml-1">/5</span>
              </p>
              {reviews > 0 && (
                <p className="text-[11px] text-brand-600 mt-0.5">
                  {reviews.toLocaleString()} reviews
                </p>
              )}
            </div>
          )}
        </div>

        {/* Metadata pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-800 rounded-full px-3 py-1 text-xs font-semibold">
            From ${pricePerNight.toLocaleString()}/night
          </span>
          {priceLevel > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-semibold">
              <span className="font-bold text-brand-600" aria-label={`Price level ${priceLevel} of 4`}>
                {'$'.repeat(Math.min(4, priceLevel))}
                <span className="text-gray-300">{'$'.repeat(4 - Math.min(4, priceLevel))}</span>
              </span>
            </span>
          )}
          {hotel.address && (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs">
              {hotel.address}
            </span>
          )}
        </div>
      </header>

      {/* Description */}
      {hotel.description && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-night mb-3">About this stay</h2>
          <p className="text-gray-700 leading-relaxed">
            {hotel.description}
          </p>
        </section>
      )}

      {/* Amenities */}
      {amenities.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-night mb-3">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {amenities.map(a => (
              <span
                key={a}
                className="bg-brand-50 text-brand-700 rounded-full px-3 py-1.5 text-sm font-medium"
              >
                {a}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* CTA panel */}
      <PlanWithBuddyCTA planPrompt={planPrompt} addPrompt={addPrompt} kind="stay" />
    </main>
  )
}
