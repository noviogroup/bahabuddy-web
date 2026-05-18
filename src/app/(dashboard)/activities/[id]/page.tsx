import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlanWithBuddyCTA } from '@/components/detail/PlanWithBuddyCTA'
import { BackLink } from '@/components/detail/BackLink'

/**
 * /activities/[id] — Activity / experience detail page.
 *
 * The "Read more" destination from ActivityCard. Server-rendered from
 * google_places filtered to attraction-style types (web's activities
 * data source per architecture decision #13). When the Viator Merchant
 * API is wired into a web-side activities-proxy, this page should be
 * extended to fetch live availability, tour times, and a deeper product
 * description.
 *
 * URL param: `id` is the google_places.place_id value.
 *
 * Auth: handled by the (dashboard) route group layout.
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

const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  tourist_attraction: 'Attraction',
  amusement_park: 'Park',
  aquarium: 'Aquarium',
  museum: 'Museum',
  park: 'Park',
  natural_feature: 'Natural site',
  spa: 'Spa',
}

export const dynamic = 'force-dynamic'

interface ActivityRow {
  place_id: string
  name: string | null
  type: string | null
  island_id: string | null
  rating: number | null
  user_ratings_total: number | null
  address: string | null
  photo_url: string | null
  description: string | null
  vibe_tags: string[] | null
  kid_friendly: boolean | null
}

export default async function ActivityDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('google_places')
    .select('place_id:id, name, type, island_id, rating, user_ratings_total, address, photo_url:image_url, description, vibe_tags, kid_friendly')
    .eq('id', params.id)
    .eq('is_active', true)
    .eq('type', 'attraction')
    .maybeSingle()

  const activity = data as ActivityRow | null
  if (!activity) notFound()

  const name = activity.name ?? 'Activity'
  const island = activity.island_id ? ISLAND_DISPLAY[activity.island_id] ?? activity.island_id : ''
  const rating = activity.rating ?? 0
  const reviews = activity.user_ratings_total ?? 0
  const vibeTags = activity.vibe_tags ?? []
  const typeLabel = activity.type ? ACTIVITY_TYPE_LABEL[activity.type] ?? null : null

  const planPrompt = `I'm looking at "${name}"${island ? ` on ${island}` : ''}. Tell me more — what to expect, how long it takes, what to bring, and whether it fits my trip.`
  const addPrompt = `Add "${name}"${island ? ` on ${island}` : ''} to my trip.`

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <BackLink href="/dashboard/chat" label="Back to chat" />

      {/* Hero */}
      <div className="relative aspect-[16/9] sm:aspect-[2/1] rounded-baha-lg overflow-hidden mb-6 bg-gradient-to-br from-sky-400 to-blue-600">
        {activity.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activity.photo_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-7xl opacity-50" aria-hidden="true">🏖️</span>
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
          {typeLabel && (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-semibold">
              {typeLabel}
            </span>
          )}
          {activity.kid_friendly && (
            <span className="inline-flex items-center gap-1.5 bg-palm-50 text-palm-700 rounded-full px-3 py-1 text-xs font-semibold">
              Kid-friendly
            </span>
          )}
          {activity.address && (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs">
              {activity.address}
            </span>
          )}
        </div>
      </header>

      {/* Description */}
      {activity.description && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-night mb-3">About this experience</h2>
          <p className="text-gray-700 leading-relaxed">
            {activity.description}
          </p>
        </section>
      )}

      {/* Vibe tags */}
      {vibeTags.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-night mb-3">Vibe</h2>
          <div className="flex flex-wrap gap-2">
            {vibeTags.map(t => (
              <span
                key={t}
                className="bg-brand-50 text-brand-700 rounded-full px-3 py-1.5 text-sm font-medium capitalize"
              >
                {t.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* CTA panel */}
      <PlanWithBuddyCTA planPrompt={planPrompt} addPrompt={addPrompt} kind="experience" />
    </main>
  )
}
