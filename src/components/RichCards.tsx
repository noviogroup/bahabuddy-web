'use client'

import Link from 'next/link'
import { isStripeConfigured } from '@/lib/stripe/client'

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
}

// ─── Card Renderer ────────────────────────────────────────────────────────────

interface RichCardRendererProps {
  cardData: CardData
  /** Legacy prop. Card click handlers no longer call this — detail
   *  pages own the chat affordance. Kept here so older call sites
   *  don't break; ignored by the rendered cards. */
  onSendMessage?: (msg: string) => void
  /** C.9.7: When set, the SummaryCard renders a "Book this trip" CTA
   *  that links to /dashboard/checkout. Plumbed by ChatPanel from
   *  msg.savedTripId on the parent message. Other cards ignore it. */
  tripId?: string
}

export function RichCardRenderer({ cardData, onSendMessage, tripId }: RichCardRendererProps) {
  if (cardData.card_type === 'mixed' && cardData.cards?.length) {
    return (
      <div className="space-y-2">
        {cardData.cards.map((c, i) => (
          <RichCardRenderer key={i} cardData={c} onSendMessage={onSendMessage} tripId={tripId} />
        ))}
      </div>
    )
  }

  switch (cardData.card_type) {
    case 'hotel':      return <HotelCard data={cardData} />
    case 'restaurant': return <RestaurantCard data={cardData} />
    case 'activity':   return <ActivityCard data={cardData} />
    case 'flight':     return <FlightCard data={cardData} />
    case 'day_plan':   return <DayPlanCard data={cardData} />
    case 'summary':    return <SummaryCard data={cardData} tripId={tripId} />
    case 'map':        return <MapCard data={cardData} />
    case 'destination':return <DestinationCard data={cardData} />
    default:           return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Stars({ count }: { count: number }) {
  return (
    <span className="text-amber-400 text-xs" aria-hidden="true">
      {'★'.repeat(Math.min(5, Math.max(0, count)))}
      {'☆'.repeat(Math.max(0, 5 - Math.min(5, Math.max(0, count))))}
    </span>
  )
}

function PriceLevel({ level }: { level: number }) {
  const clamped = Math.min(4, Math.max(1, level))
  return (
    <span className="font-semibold text-brand-600 text-sm" aria-label={`Price level ${clamped} of 4`}>
      {'$'.repeat(clamped)}
      <span className="text-gray-300">{'$'.repeat(4 - clamped)}</span>
    </span>
  )
}

/**
 * Linkify wrapper — renders children inside a Link if href is provided,
 * otherwise renders a plain div. Centralizes the "card may or may not
 * have a detail page" decision so each card body stays readable.
 */
function CardShell({
  href,
  children,
  ariaLabel,
}: {
  href?: string | null
  children: React.ReactNode
  ariaLabel?: string
}) {
  const baseClasses =
    'mt-2 rounded-2xl bg-white border border-gray-100 shadow-md overflow-hidden block transition-shadow'
  const hoverClasses = href ? 'hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2' : ''

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={`${baseClasses} ${hoverClasses}`}>
        {children}
      </Link>
    )
  }
  return <div className={baseClasses}>{children}</div>
}

/** Normalize an island display name to its mobile-canonical slug.
 *  Keys match the slug system in `src/lib/island-config.ts` and mobile's
 *  `ISLANDS` catalog in `baha-images.ts`, so DestinationCard links land
 *  on a real /explore/island/[id] page. Returns null for unknown names
 *  so the card stays non-linking defensively. */
function islandNameToSlug(name: string): string | null {
  const KNOWN: Record<string, string> = {
    'nassau': 'nassau-paradise-island',
    'nassau & paradise island': 'nassau-paradise-island',
    'paradise island': 'paradise-island',
    'exuma': 'the-exumas',
    'exumas': 'the-exumas',
    'the exumas': 'the-exumas',
    'eleuthera': 'eleuthera-harbour-island',
    'harbour island': 'harbour-island',
    'briland': 'harbour-island',
    'andros': 'andros',
    'grand bahama': 'grand-bahama',
    'bimini': 'bimini',
    'long island': 'long-island',
    'abacos': 'abacos',
    'the abacos': 'abacos',
  }
  return KNOWN[name.trim().toLowerCase()] ?? null
}

// ─── Hotel Card ───────────────────────────────────────────────────────────────

function HotelCard({ data }: { data: CardData }) {
  const name = data.name ?? 'Hotel'
  const location = data.island ?? data.city ?? ''
  const rating = data.rating ?? 0
  const stars = data.stars ?? 0
  const reviews = data.review_count ?? 0
  const chain = data.chain
  const photoUrl = data.photo ?? data.thumbnail ?? data.photo_url
  const cheapestTotal = data.cheapest_total
  const pricePerNight = data.price_per_night ?? 0
  const priceIsEstimate = data.price_is_estimate ?? false
  const displayPrice = pricePerNight > 0
    ? `$${Math.round(pricePerNight).toLocaleString()}`
    : cheapestTotal != null
      ? `$${Math.round(cheapestTotal).toLocaleString()}`
      : ''
  const priceLabel = pricePerNight > 0
    ? priceIsEstimate ? 'from/night' : '/night'
    : cheapestTotal != null
      ? ' total'
      : ''
  const amenities = data.amenities ?? []
  const href = data.place_id ? `/hotels/${encodeURIComponent(data.place_id)}` : null

  return (
    <CardShell href={href} ariaLabel={href ? `View details for ${name}` : undefined}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="w-full h-32 object-cover" />
      ) : (
        <div className="w-full h-24 bg-gradient-to-r from-amber-700 to-amber-400" aria-hidden />
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 leading-tight truncate">{name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {location}{chain ? ` · ${chain}` : ''}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {stars > 0 && <Stars count={stars} />}
              {rating > 0 && (
                <span className="text-xs text-gray-700 font-medium">
                  {rating}{reviews > 0 ? ` (${reviews.toLocaleString()} reviews)` : ''}
                </span>
              )}
            </div>
            {amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {amenities.slice(0, 3).map(a => (
                  <span key={a} className="text-xs bg-brand-50 text-brand-700 rounded-full px-2 py-0.5">{a}</span>
                ))}
              </div>
            )}
          </div>
          {displayPrice && (
            <div className="text-right shrink-0">
              {priceIsEstimate && pricePerNight > 0 && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 block">
                  From
                </span>
              )}
              <span className="text-lg font-bold text-brand-600">{displayPrice}</span>
              <span className="text-xs text-gray-400 block">
                {pricePerNight > 0 ? 'per night' : priceLabel.trim()}
              </span>
            </div>
          )}
        </div>
      </div>
    </CardShell>
  )
}

// ─── Restaurant Card ──────────────────────────────────────────────────────────

function RestaurantCard({ data }: { data: CardData }) {
  const name = data.name ?? 'Restaurant'
  const island = data.island ?? ''
  const cuisine = data.cuisine ?? data.cuisine_type ?? ''
  const rating = data.rating ?? 0
  const priceLevel = data.price_level ?? 0
  const photoUrl = data.photo_url
  const href = data.place_id ? `/restaurants/${encodeURIComponent(data.place_id)}` : null

  return (
    <CardShell href={href} ariaLabel={href ? `View details for ${name}` : undefined}>
      <div className="flex gap-3 p-3">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-600 to-orange-400 shrink-0" aria-hidden />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 leading-tight">{name}</p>
          {island && <p className="text-xs text-gray-500 mt-0.5">{island}</p>}
          {cuisine && <p className="text-xs text-orange-500 font-medium mt-0.5">{cuisine}</p>}
          <div className="flex items-center justify-between mt-1.5">
            {rating > 0 && <span className="text-xs text-gray-700">{rating}</span>}
            {priceLevel > 0 && <PriceLevel level={priceLevel} />}
          </div>
        </div>
      </div>
    </CardShell>
  )
}

// ─── Activity Card ────────────────────────────────────────────────────────────

function ActivityCard({ data }: { data: CardData }) {
  const name = data.name ?? data.title ?? 'Activity'
  const duration = data.duration ?? ''
  const description = data.description ?? ''
  const supplier = data.supplier ?? ''
  const reviews = data.review_count ?? 0
  const fromPrice = data.from_price ?? data.price ?? 0
  const rating = data.rating ?? 0
  const photoUrl = data.photo_url
  const href = data.place_id ? `/activities/${encodeURIComponent(data.place_id)}` : null

  const activityInitial = (data.icon ?? name).slice(0, 1).toUpperCase()

  return (
    <CardShell href={href} ariaLabel={href ? `View details for ${name}` : undefined}>
      <div className="flex gap-3 p-3">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shrink-0 text-sm font-bold text-white" aria-hidden="true">
            {activityInitial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{name}</p>
          {supplier && <p className="text-xs text-brand-500 mt-0.5">{supplier}</p>}
          {description && !supplier && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {duration && <span className="text-xs text-gray-500">{duration}</span>}
            {rating > 0 && (
              <span className="text-xs text-gray-700">
                {rating}{reviews > 0 ? ` (${reviews.toLocaleString()} reviews)` : ''}
              </span>
            )}
            {fromPrice > 0 && (
              <span className="ml-auto text-sm font-bold text-brand-600">From ${fromPrice % 1 === 0 ? fromPrice : fromPrice.toFixed(2)}</span>
            )}
          </div>
        </div>
      </div>
    </CardShell>
  )
}

// ─── Flight Card ──────────────────────────────────────────────────────────────

/**
 * FlightCard — non-linking by design. Flight offers are Duffel
 * PaymentIntent-like: time-sensitive, expire in ~30 min, no stable URL.
 * Showing details inline in the card is sufficient.
 */
function FlightCard({ data }: { data: CardData }) {
  const route = data.route ?? ''
  const airline = data.airline ?? ''
  const departure = data.departure ?? ''
  const arrival = data.arrival ?? ''
  const duration = data.duration ?? ''
  const stops = data.stops ?? ''
  const price = data.price ?? 0

  return (
    <div className="mt-2 rounded-2xl bg-white border border-gray-100 shadow-md p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{airline}</span>
        {price > 0 && <span className="text-xl font-bold text-brand-600">${price}</span>}
      </div>
      <p className="font-semibold text-sm text-gray-900 mb-2">{route}</p>
      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
        {departure && <span>{departure}</span>}
        {departure && arrival && <span className="text-gray-300" aria-hidden="true">→</span>}
        {arrival && <span>{arrival}</span>}
        {duration && <span>{duration}</span>}
        {stops && (
          <span className={stops === 'Direct' || stops === 'Nonstop' ? 'text-green-600 font-semibold' : ''}>
            {stops}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Day Plan Card ────────────────────────────────────────────────────────────

function DayPlanCard({ data }: { data: CardData }) {
  const dayNumber = data.day_number ?? 1
  const morning = data.morning ?? ''
  const afternoon = data.afternoon ?? ''
  const evening = data.evening ?? ''

  const slots = [
    { period: 'Morning',   activity: morning,   color: 'bg-amber-50 text-amber-700 border-amber-100' },
    { period: 'Afternoon', activity: afternoon, color: 'bg-sky-50 text-sky-700 border-sky-100' },
    { period: 'Evening',   activity: evening,   color: 'bg-purple-50 text-purple-700 border-purple-100' },
  ].filter(s => s.activity)

  return (
    <div className="mt-2 rounded-2xl bg-white border border-gray-100 shadow-md overflow-hidden">
      <div className="bg-brand-600 px-4 py-2.5">
        <span className="text-white font-bold text-sm">Day {dayNumber}</span>
      </div>
      <div className="p-3 space-y-2">
        {slots.map(({ period, activity, color }) => (
          <div key={period} className={`rounded-xl border p-2.5 ${color}`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{period}</p>
              <p className="text-sm mt-0.5">{activity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

/**
 * SummaryCard — Buddy's trip summary with totals.
 *
 * C.9.7: When `tripId` is provided AND `total_cost > 0` AND Stripe is
 * configured, renders a "Book this trip" CTA at the bottom of the card.
 * The CTA links to /dashboard/checkout?... with the same param shape used
 * by the trip-detail-page CTA — so both entry points lead to the same
 * checkout experience.
 *
 * If any of those preconditions fails, the card renders without a CTA
 * (the trip detail page still has its own bookable surface in that case).
 */
function SummaryCard({ data, tripId }: { data: CardData; tripId?: string }) {
  const tripName = data.trip_name ?? 'Your Trip'
  const days = data.days ?? 0
  const islands = data.islands ?? []
  const totalCost = data.total_cost ?? 0
  const travelers = data.travelers ?? 1

  const showBookCTA = Boolean(tripId) && totalCost > 0 && isStripeConfigured

  const checkoutHref = showBookCTA
    ? `/dashboard/checkout?trip_id=${encodeURIComponent(tripId!)}` +
      `&amount=${Math.round(totalCost * 100)}` +
      `&type=full_trip` +
      `&description=${encodeURIComponent(tripName)}`
    : null

  return (
    <div className="mt-2 rounded-2xl bg-white border-2 border-brand-200 shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-4 py-3">
        <p className="text-brand-100 text-xs font-bold uppercase tracking-widest">TRIP SUMMARY</p>
        <p className="text-white font-bold text-lg mt-1">{tripName}</p>
      </div>
      <div className="p-4 space-y-2">
        {days > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Duration</span>
            <span className="font-medium">{days} days</span>
          </div>
        )}
        {islands.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Islands</span>
            <span className="font-medium text-right max-w-[60%]">{islands.join(', ')}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Travelers</span>
          <span className="font-medium">{travelers}</span>
        </div>
        {totalCost > 0 && (
          <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between items-center">
            <span className="font-semibold text-sm text-gray-700">Estimated Total</span>
            <span className="text-2xl font-extrabold text-brand-600">${totalCost.toLocaleString()}</span>
          </div>
        )}

        {/* C.9.7: Book CTA — only when trip is saved, total is real, Stripe configured */}
        {checkoutHref && (
          <div className="pt-3">
            <Link
              href={checkoutHref}
              className="flex items-center justify-center gap-2 w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold py-2.5 px-4 rounded-full transition-colors shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            >
              Book this trip
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Map Card ─────────────────────────────────────────────────────────────────

function MapCard({ data }: { data: CardData }) {
  const title = data.title ?? 'Trip Map'
  const islands = data.islands ?? []
  const subtitle = data.subtitle ?? (islands.length > 0 ? islands.join(' → ') : 'See your itinerary on the map')

  return (
    <div className="mt-2 rounded-2xl bg-white border border-gray-100 shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-brand-600/80 to-brand-400 h-20 flex items-end relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-90" aria-hidden="true">
        </div>
        <p className="relative z-10 px-4 pb-3 text-white font-bold text-sm">{title}</p>
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-500">{subtitle}</p>
        <button
          type="button"
          className="mt-2 w-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
        >
          View on Map
        </button>
      </div>
    </div>
  )
}

// ─── Destination Card ─────────────────────────────────────────────────────────

/**
 * DestinationCard — island-level callout. Links to the marketing
 * /explore/island/[id] surface when the island is recognizable. The
 * marketing surface intentionally lives outside the (dashboard) group
 * for SEO; users navigating there leave the dashboard shell but their
 * auth cookie carries.
 *
 * `island_id` is preferred when present (cards emitted by chat tools
 * thread it through from `google_places.island_id`, matching mobile's
 * canonical slug system). Falls back to inferring from `name` via
 * `islandNameToSlug`.
 */
function DestinationCard({ data }: { data: CardData }) {
  const name = data.name ?? 'Island'
  const tagline = data.tagline ?? ''
  const duration = data.duration ?? ''
  const priceFrom = data.price_from ?? 0
  const highlights = data.highlights ?? []
  const rating = data.rating ?? 0
  const photoUrl = data.photo_url

  const islandSlug = data.island_id ?? islandNameToSlug(name)
  const href = islandSlug ? `/explore/island/${islandSlug}` : null

  return (
    <CardShell href={href} ariaLabel={href ? `Read about ${name}` : undefined}>
      <div className="relative h-32">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-500 to-brand-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />
        {rating > 0 && (
          <div className="absolute top-2 right-2 bg-black/40 rounded-lg px-2 py-1 flex items-center gap-1">
            <span className="text-amber-400 text-xs" aria-hidden="true">★</span>
            <span className="text-white text-xs font-semibold">{rating}</span>
          </div>
        )}
        <p className="absolute bottom-3 left-4 text-white text-xl font-extrabold drop-shadow">{name}</p>
      </div>
      <div className="p-3">
        {tagline && <p className="text-xs text-gray-500 mb-2">{tagline}</p>}
        {highlights.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {highlights.map(h => (
              <span key={h} className="text-xs bg-brand-50 text-brand-700 rounded-full px-2 py-0.5">{h}</span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500">
          {duration && <span><span aria-hidden="true">⏱</span> {duration}</span>}
          {priceFrom > 0 && <span className="text-brand-600 font-bold text-sm">From ${priceFrom}</span>}
        </div>
      </div>
    </CardShell>
  )
}

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
