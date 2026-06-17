'use client'

import { HotelCard as NewHotelCard, type HotelCardData,
         RestaurantCard as NewRestaurantCard, type RestaurantCardData,
         ActivityCard as NewActivityCard, type ActivityCardData,
         SummaryCard as NewSummaryCard, type SummaryCardData, type CostBreakdown,
         DayPlanCard as NewDayPlanCard, type DayPlanCardData,
         FlightCard as NewFlightCard, type FlightCardData, type FlightLayover,
         DestinationCard as NewDestinationCard, type DestinationCardData,
         MapCard as NewMapCard, type MapCardData, type MapLocation } from './cards'

/**
 * RichCards — every visual card type that appears inline in chat.
 *
 * Architecture (post chat-vs-detail-page split):
 *
 *   Cards are *previews*. They show enough information to identify a
 *   place, but the primary action when a user taps a card is to land on
 *   a real detail page — NOT to send another chat message.
 *
 *   - HotelCard / RestaurantCard / ActivityCard wrap themselves in a
 *     <Link> when `place_id` is present. They link to /hotels/[id],
 *     /restaurants/[id], or /activities/[id] respectively.
 *   - DestinationCard links to /explore/places/[island-slug] (the
 *     marketing surface) when the island slug is recognizable.
 *   - Flight, DayPlan, Summary, Map cards have no detail page concept;
 *     they remain non-linking.
 *
 *   The detail pages themselves carry the chat affordance: a "Plan this
 *   with Buddy" CTA that opens chat with a contextual prompt. Cards no
 *   longer call onSendMessage on click — that was funnelling every tap
 *   back into chat, which is the wrong UX (per mobile spec: every
 *   Explore card has both Read more AND Plan this — chat is the
 *   *action*, the detail page is the *content*).
 *
 *   The onSendMessage prop is kept on the renderer for legacy callers,
 *   but card click handlers no longer fire it.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type CardType =
  | 'hotel' | 'restaurant' | 'activity' | 'flight'
  | 'day_plan' | 'summary' | 'map' | 'destination' | 'mixed'

export interface CardData {
  card_type: CardType
  // mixed: contains cards array
  cards?: CardData[]
  /** Stable identifier from google_places.place_id, used to link the
   *  card to its detail page. Present on hotel / restaurant / activity
   *  cards emitted by tools. Absent on Claude-synthesized cards. */
  place_id?: string
  // hotel
  name?: string
  island?: string
  /** Original kebab-case island id (e.g. 'paradise-island') used to
   *  link Destination cards to /explore/places/[island]. */
  island_id?: string
  city?: string
  rating?: number
  stars?: number
  review_count?: number
  chain?: string
  price_per_night?: number
  /** True when price_per_night is derived from price_level, not live inventory. */
  price_is_estimate?: boolean
  cheapest_total?: number
  amenities?: string[]
  photo?: string
  thumbnail?: string
  photo_url?: string
  // restaurant
  cuisine?: string
  cuisine_type?: string
  price_level?: number
  // activity / map (shared)
  title?: string
  subtitle?: string
  description?: string
  duration?: string
  from_price?: number
  price?: number
  supplier?: string
  product_code?: string
  icon?: string
  // flight
  route?: string
  airline?: string
  departure?: string
  arrival?: string
  stops?: string
  passengers?: number
  // day_plan
  day_number?: number
  morning?: string
  afternoon?: string
  evening?: string
  // summary
  trip_name?: string
  days?: number
  islands?: string[]
  total_cost?: number
  travelers?: number
  // destination
  tagline?: string
  price_from?: number
  highlights?: string[]

  // ── Enrichments for the new info-dense card system ─────────────────────
  // Populated by chat-tools.ts where available. Each is optional so older
  // tool outputs (and Claude-synthesized cards) keep rendering cleanly.
  photos?: string[]
  phone?: string
  website?: string
  full_address?: string
  /** Flat array of "Monday: 11am – 10pm" strings from google_places.opening_hours. */
  opening_hours?: string[]
  /** Vibe-category labels (beach, adventure, culture…) for activities. */
  vibe_tags?: string[]
  kid_friendly?: boolean
  top_review?: {
    text: string
    author_name: string
    rating: number
    time: string
  }
  /** When the card is rendered with trip context, the per-night PriceTag
   *  shows a full-stay total preview underneath. */
  nights?: number

  // ── Phase 3 synthesis-card enrichments ────────────────────────────────
  // Populated by Claude in synthesis cards. Each is optional.

  /** Summary: free-form date range ("Jun 12 – Jun 19"). */
  date_range?: string
  /** Summary: per-category cost breakdown. Feeds the stacked breakdown bar. */
  cost_breakdown?: CostBreakdown

  /** Day plan: free-form date label ("Saturday Jun 14"). */
  day_date?: string
  /** Day plan: total cost for the day. */
  day_total_cost?: number
  /** Day plan: pace heuristic. Computed from filled slots when absent. */
  day_pace?: 'relaxed' | 'moderate' | 'packed'

  /** Flight: cabin class chip alongside the airline. */
  cabin_class?: string
  /** Flight: ordered layovers when not direct. */
  layovers?: FlightLayover[]
  /** Flight: baggage allowance badges. */
  baggage?: { carry_on?: boolean; checked?: number }
  /** Flight: Duffel offer ID, threaded through for future booking wiring. */
  duffel_offer_id?: string
  /** LiteAPI flight offer ID / normalized provider offer ID. */
  offer_id?: string
  provider_offer_id?: string

  // ── Phase 4 destination/map enrichments ────────────────────────────────

  /** Destination: 3-letter lowercase month codes when the island peaks. */
  best_months?: string[]
  /** Destination: "Bahamasair from Nassau · 1h" — how to actually get there. */
  getting_there?: string
  /** Destination: free-form recommended length ("3–5 days"). */
  days_recommended?: string

  /** Map: explicit location list with optional lat/lng. */
  locations?: MapLocation[]
}

// ─── Card Renderer ────────────────────────────────────────────────────────────

interface RichCardRendererProps {
  cardData: CardData
  /** Legacy prop. Card click handlers no longer call this — detail
   *  pages own the chat affordance. Kept here so older call sites
   *  don't break; ignored by the rendered cards. */
  onSendMessage?: (msg: string) => void
  /** Active trip context enables direct Add to trip actions without sending a chat prompt. */
  activeTripId?: string
  onAddToTrip?: (cardData: CardData, tripId: string) => void | Promise<void>
  /** C.9.7: When set, the SummaryCard renders a "Book this trip" CTA
   *  that links to /dashboard/checkout. Plumbed by ChatPanel from
   *  msg.savedTripId on the parent message. Other cards ignore it. */
  tripId?: string
}

export function RichCardRenderer({ cardData, onSendMessage, activeTripId, onAddToTrip, tripId }: RichCardRendererProps) {
  if (cardData.card_type === 'mixed' && cardData.cards?.length) {
    return (
      <div className="space-y-2">
        {cardData.cards.map((c, i) => (
          <RichCardRenderer
            key={i}
            cardData={c}
            onSendMessage={onSendMessage}
            activeTripId={activeTripId}
            onAddToTrip={onAddToTrip}
            tripId={tripId}
          />
        ))}
      </div>
    )
  }

  switch (cardData.card_type) {
    case 'hotel':      return <HotelCardAdapter data={cardData} onSendMessage={onSendMessage} activeTripId={activeTripId} onAddToTrip={onAddToTrip} />
    case 'restaurant': return <RestaurantCardAdapter data={cardData} onSendMessage={onSendMessage} activeTripId={activeTripId} onAddToTrip={onAddToTrip} />
    case 'activity':   return <ActivityCardAdapter data={cardData} onSendMessage={onSendMessage} activeTripId={activeTripId} onAddToTrip={onAddToTrip} />
    case 'flight':     return <FlightCardAdapter data={cardData} onSendMessage={onSendMessage} activeTripId={activeTripId} onAddToTrip={onAddToTrip} />
    case 'day_plan':   return <DayPlanCardAdapter data={cardData} onSendMessage={onSendMessage} />
    case 'summary':    return <SummaryCardAdapter data={cardData} tripId={tripId} />
    case 'map':        return <MapCardAdapter data={cardData} />
    case 'destination':return <DestinationCardAdapter data={cardData} />
    default:           return null
  }
}

// ─── Hotel Card adapter (new cards/ system) ─────────────────────────────

/**
 * Adapter that converts loose `CardData` (used everywhere in chat) to
 * the tighter `HotelCardData` consumed by the new `HotelCard` component.
 *
 * The new card lives under `src/components/cards/HotelCard.tsx` so it
 * can be reused on /hotels list pages, in trip summaries, etc. — the
 * old inline `HotelCard` function below is kept commented out for
 * reference but no longer dispatched from the switch.
 *
 * Save-to-trip: in the chat surface, tapping the heart icon sends a
 * chat message to Buddy asking to add the hotel to the user's trip.
 * Other surfaces wire `onSave` differently (direct API call on list
 * pages, etc.) — see HotelCard's `onSave` prop.
 */
function HotelCardAdapter({
  data,
  onSendMessage,
  activeTripId,
  onAddToTrip,
}: {
  data: CardData
  onSendMessage?: (msg: string) => void
  activeTripId?: string
  onAddToTrip?: (cardData: CardData, tripId: string) => void | Promise<void>
}) {
  const hotelData: HotelCardData = {
    place_id: data.place_id,
    name: data.name ?? 'Hotel',
    island: data.island,
    island_id: data.island_id,
    rating: data.rating,
    review_count: data.review_count,
    stars: data.stars,
    photo_url: data.photo ?? data.thumbnail ?? data.photo_url,
    photos: data.photos ?? [],
    amenities: data.amenities ?? [],
    price_per_night: data.price_per_night,
    price_is_estimate: data.price_is_estimate,
    nights: data.nights,
    phone: data.phone,
    website: data.website,
    full_address: data.full_address,
    top_review: data.top_review,
  }

  const handleSave = activeTripId && onAddToTrip
    ? () => onAddToTrip(data, activeTripId)
    : onSendMessage
    ? (d: HotelCardData) => onSendMessage(`Help me add ${d.name} to my trip`)
    : undefined

  return <NewHotelCard data={hotelData} size="compact" onSave={handleSave} />
}

// ─── Restaurant Card adapter (new cards/ system) ────────────────────────

/** Adapts loose `CardData` to `RestaurantCardData`. Save-to-trip goes
 *  through onSendMessage in chat surfaces — see HotelCardAdapter for
 *  the rationale. */
function RestaurantCardAdapter({
  data,
  onSendMessage,
  activeTripId,
  onAddToTrip,
}: {
  data: CardData
  onSendMessage?: (msg: string) => void
  activeTripId?: string
  onAddToTrip?: (cardData: CardData, tripId: string) => void | Promise<void>
}) {
  const restaurantData: RestaurantCardData = {
    place_id: data.place_id,
    name: data.name ?? 'Restaurant',
    island: data.island,
    island_id: data.island_id,
    cuisine: data.cuisine ?? data.cuisine_type,
    rating: data.rating,
    review_count: data.review_count,
    price_level: data.price_level,
    photo_url: data.photo ?? data.thumbnail ?? data.photo_url,
    photos: data.photos ?? [],
    phone: data.phone,
    website: data.website,
    full_address: data.full_address,
    opening_hours: data.opening_hours,
    top_review: data.top_review,
  }

  const handleSave = activeTripId && onAddToTrip
    ? () => onAddToTrip(data, activeTripId)
    : onSendMessage
    ? (d: RestaurantCardData) => onSendMessage(`Help me add ${d.name} to my trip`)
    : undefined

  return <NewRestaurantCard data={restaurantData} size="compact" onSave={handleSave} />
}

// ─── Activity Card adapter (new cards/ system) ───────────────────────────

/** Adapts loose `CardData` to `ActivityCardData`. */
function ActivityCardAdapter({
  data,
  onSendMessage,
  activeTripId,
  onAddToTrip,
}: {
  data: CardData
  onSendMessage?: (msg: string) => void
  activeTripId?: string
  onAddToTrip?: (cardData: CardData, tripId: string) => void | Promise<void>
}) {
  const activityData: ActivityCardData = {
    place_id: data.place_id,
    product_code: data.product_code,
    name: data.name ?? data.title ?? 'Activity',
    island: data.island,
    island_id: data.island_id,
    description: data.description,
    rating: data.rating,
    review_count: data.review_count,
    vibe_tags: data.vibe_tags ?? [],
    kid_friendly: data.kid_friendly,
    duration: data.duration,
    from_price: data.from_price ?? data.price,
    supplier: data.supplier,
    photo_url: data.photo ?? data.thumbnail ?? data.photo_url,
    photos: data.photos ?? [],
    phone: data.phone,
    website: data.website,
    full_address: data.full_address,
    opening_hours: data.opening_hours,
    top_review: data.top_review,
  }

  const handleSave = activeTripId && onAddToTrip
    ? () => onAddToTrip(data, activeTripId)
    : onSendMessage
    ? (d: ActivityCardData) => onSendMessage(`Help me add ${d.name} to my trip`)
    : undefined

  return <NewActivityCard data={activityData} size="compact" onSave={handleSave} />
}

// ─── Summary Card adapter (new cards/ system) ────────────────────────────

/** Adapts loose `CardData` to `SummaryCardData`. Threads `tripId`
 *  through to the new card so the Stripe Book CTA gating is preserved
 *  (tripId + total_cost > 0 + isStripeConfigured → CTA renders). */
function SummaryCardAdapter({
  data,
  tripId,
}: {
  data: CardData
  tripId?: string
}) {
  const summaryData: SummaryCardData = {
    trip_name: data.trip_name,
    date_range: data.date_range,
    days: data.days,
    islands: data.islands,
    travelers: data.travelers,
    total_cost: data.total_cost,
    cost_breakdown: data.cost_breakdown,
  }

  return <NewSummaryCard data={summaryData} tripId={tripId} />
}

// ─── Day Plan Card adapter (new cards/ system) ───────────────────────────

/** Adapts loose `CardData` to `DayPlanCardData`. `onSendMessage` is
 *  threaded through so each time-slot can render a Swap/Add affordance
 *  that fires a contextual chat message back to Buddy. */
function DayPlanCardAdapter({
  data,
  onSendMessage,
}: {
  data: CardData
  onSendMessage?: (msg: string) => void
}) {
  const dayData: DayPlanCardData = {
    day_number: data.day_number,
    day_date: data.day_date,
    morning: data.morning,
    afternoon: data.afternoon,
    evening: data.evening,
    day_total_cost: data.day_total_cost,
    day_pace: data.day_pace,
  }

  return <NewDayPlanCard data={dayData} onSendMessage={onSendMessage} />
}

// ─── Flight Card adapter (new cards/ system) ──────────────────────────────

/** Adapts loose `CardData` to `FlightCardData`. `onSendMessage` enables
 *  the Save-flight pill in chat surfaces. */
function FlightCardAdapter({
  data,
  onSendMessage,
  activeTripId,
  onAddToTrip,
}: {
  data: CardData
  onSendMessage?: (msg: string) => void
  activeTripId?: string
  onAddToTrip?: (cardData: CardData, tripId: string) => void | Promise<void>
}) {
  const flightData: FlightCardData = {
    route: data.route,
    airline: data.airline,
    departure: data.departure,
    arrival: data.arrival,
    duration: data.duration,
    stops: data.stops,
    price: data.price,
    cabin_class: data.cabin_class,
    layovers: data.layovers,
    baggage: data.baggage,
    duffel_offer_id: data.duffel_offer_id,
  }

  return (
    <div className="space-y-2">
      <NewFlightCard data={flightData} />
      <div className="flex flex-wrap justify-end gap-2">
        {activeTripId && onAddToTrip && (
          <button
            type="button"
            onClick={() => onAddToTrip(data, activeTripId)}
            className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 px-3 py-1 rounded-full border border-brand-200 hover:bg-brand-50 transition-colors"
          >
            Add to trip
          </button>
        )}
        {(data.duffel_offer_id || data.offer_id || data.provider_offer_id) && (
          <a
            href={`/flights/${encodeURIComponent(String(data.duffel_offer_id ?? data.offer_id ?? data.provider_offer_id))}/book`}
            className="text-[11px] font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1 rounded-full transition-colors"
          >
            Book this fare
          </a>
        )}
        {!activeTripId && onSendMessage && (
          <button
            type="button"
            onClick={() => onSendMessage(`Help me save the ${data.airline ?? 'flight'} option to my trip`)}
            className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 px-3 py-1 rounded-full border border-brand-200 hover:bg-brand-50 transition-colors"
          >
            Plan this flight
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Destination Card adapter (new cards/ system) ─────────────────────────

/** Adapts loose `CardData` to `DestinationCardData`. */
function DestinationCardAdapter({ data }: { data: CardData }) {
  const destinationData: DestinationCardData = {
    name: data.name ?? data.title ?? 'Island',
    island_id: data.island_id,
    photo_url: data.photo ?? data.thumbnail ?? data.photo_url,
    tagline: data.tagline,
    getting_there: data.getting_there,
    days_recommended: data.days_recommended ?? data.duration, // legacy fallback
    best_months: data.best_months,
    highlights: data.highlights,
    rating: data.rating,
    price_from: data.price_from,
  }

  return <NewDestinationCard data={destinationData} />
}

// ─── Map Card adapter (new cards/ system) ────────────────────────────────

/** Adapts loose `CardData` to `MapCardData`. Falls back to the
 *  `islands` array when Claude didn't emit explicit locations. */
function MapCardAdapter({ data }: { data: CardData }) {
  const mapData: MapCardData = {
    title: data.title,
    subtitle: data.subtitle,
    islands: data.islands,
    locations: data.locations,
  }

  return <NewMapCard data={mapData} />
}

// ─── Card implementations moved to src/components/cards/ ─────────────────────

// ─── Card Parser ──────────────────────────────────────────────────────────────

const CARD_BLOCK_RE = /```(?:card-data|json)\n([\s\S]*?)\n```/g

export function parseCardsFromContent(content: string): { text: string; cards: CardData[] } {
  const cards: CardData[] = []
  let cleaned = content

  let match: RegExpExecArray | null
  const regex = new RegExp(CARD_BLOCK_RE.source, 'g')
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      if (parsed && typeof parsed === 'object' && ('card_type' in parsed || 'cards' in parsed)) {
        cards.push(parsed as CardData)
        cleaned = cleaned.replace(match[0], '')
      }
    } catch {
      // not valid card JSON, leave as-is
    }
  }

  return { text: cleaned.trim(), cards }
}
