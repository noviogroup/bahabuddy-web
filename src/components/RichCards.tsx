'use client'

// ─── Types ───────────────────────────────────────────────────────────────────

export type CardType =
  | 'hotel' | 'restaurant' | 'activity' | 'flight'
  | 'day_plan' | 'summary' | 'map' | 'destination' | 'mixed'

export interface CardData {
  card_type: CardType
  // mixed: contains cards array
  cards?: CardData[]
  // hotel
  name?: string
  island?: string
  city?: string
  rating?: number
  stars?: number
  review_count?: number
  chain?: string
  price_per_night?: number
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
  onSendMessage?: (msg: string) => void
}

export function RichCardRenderer({ cardData, onSendMessage }: RichCardRendererProps) {
  if (cardData.card_type === 'mixed' && cardData.cards?.length) {
    return (
      <div className="space-y-2">
        {cardData.cards.map((c, i) => (
          <RichCardRenderer key={i} cardData={c} onSendMessage={onSendMessage} />
        ))}
      </div>
    )
  }

  switch (cardData.card_type) {
    case 'hotel':      return <HotelCard data={cardData} />
    case 'restaurant': return <RestaurantCard data={cardData} />
    case 'activity':   return <ActivityCard data={cardData} onSendMessage={onSendMessage} />
    case 'flight':     return <FlightCard data={cardData} />
    case 'day_plan':   return <DayPlanCard data={cardData} />
    case 'summary':    return <SummaryCard data={cardData} />
    case 'map':        return <MapCard data={cardData} />
    case 'destination':return <DestinationCard data={cardData} onSendMessage={onSendMessage} />
    default:           return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Stars({ count }: { count: number }) {
  return (
    <span className="text-amber-400 text-xs">
      {'★'.repeat(Math.min(5, Math.max(0, count)))}
      {'☆'.repeat(Math.max(0, 5 - Math.min(5, Math.max(0, count))))}
    </span>
  )
}

function PriceLevel({ level }: { level: number }) {
  const clamped = Math.min(4, Math.max(1, level))
  return (
    <span className="font-semibold text-brand-600 text-sm">
      {'$'.repeat(clamped)}
      <span className="text-gray-300">{'$'.repeat(4 - clamped)}</span>
    </span>
  )
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
  const displayPrice = cheapestTotal != null
    ? `$${Math.round(cheapestTotal)}`
    : pricePerNight > 0 ? `$${pricePerNight}` : ''
  const priceLabel = cheapestTotal != null ? ' total' : '/night'
  const amenities = data.amenities ?? []

  return (
    <div className="mt-2 rounded-2xl bg-white border border-gray-100 shadow-md overflow-hidden">
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="w-full h-32 object-cover" />
      ) : (
        <div className="w-full h-24 bg-gradient-to-r from-amber-700 to-amber-400 flex items-center justify-center">
          <span className="text-3xl">🏨</span>
        </div>
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
                  ⭐ {rating}{reviews > 0 ? ` (${reviews.toLocaleString()})` : ''}
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
              <span className="text-lg font-bold text-brand-600">{displayPrice}</span>
              <span className="text-xs text-gray-400 block">{priceLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
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

  return (
    <div className="mt-2 rounded-2xl bg-white border border-gray-100 shadow-md overflow-hidden flex gap-3 p-3">
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-600 to-orange-400 flex items-center justify-center shrink-0">
          <span className="text-2xl">🍽️</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 leading-tight">{name}</p>
        {island && <p className="text-xs text-gray-500 mt-0.5">{island}</p>}
        {cuisine && <p className="text-xs text-orange-500 font-medium mt-0.5">{cuisine}</p>}
        <div className="flex items-center justify-between mt-1.5">
          {rating > 0 && <span className="text-xs text-gray-700">⭐ {rating}</span>}
          {priceLevel > 0 && <PriceLevel level={priceLevel} />}
        </div>
      </div>
    </div>
  )
}

// ─── Activity Card ────────────────────────────────────────────────────────────

function ActivityCard({ data, onSendMessage }: { data: CardData; onSendMessage?: (m: string) => void }) {
  const name = data.name ?? data.title ?? 'Activity'
  const duration = data.duration ?? ''
  const description = data.description ?? ''
  const supplier = data.supplier ?? ''
  const reviews = data.review_count ?? 0
  const fromPrice = data.from_price ?? data.price ?? 0
  const rating = data.rating ?? 0
  const photoUrl = data.photo_url

  const iconMap: Record<string, string> = {
    dive: '🤿', swim: '🏊', eat: '🍽️', sail: '⛵', fish: '🎣',
    hike: '🥾', beach: '🏖️', spa: '💆', snorkel: '🤿', kayak: '🛶',
    tour: '🗺️', culture: '🏛️',
  }
  const emoji = iconMap[data.icon ?? ''] ?? '🌟'

  return (
    <div
      className="mt-2 rounded-2xl bg-white border border-gray-100 shadow-md overflow-hidden flex gap-3 p-3 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onSendMessage?.(`Tell me more about "${name}"`)}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shrink-0 text-2xl">
          {emoji}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{name}</p>
        {supplier && <p className="text-xs text-brand-500 mt-0.5">{supplier}</p>}
        {description && !supplier && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {duration && <span className="text-xs text-gray-500">⏱ {duration}</span>}
          {rating > 0 && (
            <span className="text-xs text-gray-700">
              ⭐ {rating}{reviews > 0 ? ` (${reviews.toLocaleString()})` : ''}
            </span>
          )}
          {fromPrice > 0 && (
            <span className="ml-auto text-sm font-bold text-brand-600">From ${fromPrice % 1 === 0 ? fromPrice : fromPrice.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Flight Card ──────────────────────────────────────────────────────────────

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
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">✈️</span>
        <span className="font-semibold text-sm text-gray-900">{route}</span>
      </div>
      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
        {departure && <span>{departure}</span>}
        {departure && arrival && <span className="text-gray-300">→</span>}
        {arrival && <span>{arrival}</span>}
        {duration && <span>⏱ {duration}</span>}
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
    { period: 'Morning',   activity: morning,   emoji: '☀️',  color: 'bg-amber-50 text-amber-700 border-amber-100' },
    { period: 'Afternoon', activity: afternoon, emoji: '🌤️',  color: 'bg-sky-50 text-sky-700 border-sky-100' },
    { period: 'Evening',   activity: evening,   emoji: '🌙',  color: 'bg-purple-50 text-purple-700 border-purple-100' },
  ].filter(s => s.activity)

  return (
    <div className="mt-2 rounded-2xl bg-white border border-gray-100 shadow-md overflow-hidden">
      <div className="bg-brand-600 px-4 py-2.5">
        <span className="text-white font-bold text-sm">Day {dayNumber}</span>
      </div>
      <div className="p-3 space-y-2">
        {slots.map(({ period, activity, emoji, color }) => (
          <div key={period} className={`flex items-start gap-2 rounded-xl border p-2.5 ${color}`}>
            <span className="text-base mt-0.5">{emoji}</span>
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

function SummaryCard({ data }: { data: CardData }) {
  const tripName = data.trip_name ?? 'Your Trip'
  const days = data.days ?? 0
  const islands = data.islands ?? []
  const totalCost = data.total_cost ?? 0
  const travelers = data.travelers ?? 1

  return (
    <div className="mt-2 rounded-2xl bg-white border-2 border-brand-200 shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-4 py-3">
        <p className="text-brand-100 text-xs font-bold uppercase tracking-widest">TRIP SUMMARY</p>
        <p className="text-white font-bold text-lg mt-1">{tripName}</p>
      </div>
      <div className="p-4 space-y-2">
        {days > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">📅 Duration</span>
            <span className="font-medium">{days} days</span>
          </div>
        )}
        {islands.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">📍 Islands</span>
            <span className="font-medium text-right max-w-[60%]">{islands.join(', ')}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">👥 Travelers</span>
          <span className="font-medium">{travelers}</span>
        </div>
        {totalCost > 0 && (
          <>
            <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between items-center">
              <span className="font-semibold text-sm text-gray-700">Estimated Total</span>
              <span className="text-2xl font-extrabold text-brand-600">${totalCost.toLocaleString()}</span>
            </div>
          </>
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
        <div className="absolute inset-0 flex items-center justify-center opacity-90">
          <span className="text-4xl">🗺️</span>
        </div>
        <p className="relative z-10 px-4 pb-3 text-white font-bold text-sm">{title}</p>
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-500">{subtitle}</p>
        <button className="mt-2 w-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold py-2 rounded-xl transition-colors">
          View on Map
        </button>
      </div>
    </div>
  )
}

// ─── Destination Card ─────────────────────────────────────────────────────────

function DestinationCard({ data, onSendMessage }: { data: CardData; onSendMessage?: (m: string) => void }) {
  const name = data.name ?? 'Island'
  const tagline = data.tagline ?? ''
  const duration = data.duration ?? ''
  const priceFrom = data.price_from ?? 0
  const highlights = data.highlights ?? []
  const rating = data.rating ?? 0
  const photoUrl = data.photo_url

  return (
    <div
      className="mt-2 rounded-2xl bg-white border border-gray-100 shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onSendMessage?.(`Tell me more about ${name}`)}
    >
      <div className="relative h-32">
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-500 to-brand-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {rating > 0 && (
          <div className="absolute top-2 right-2 bg-black/40 rounded-lg px-2 py-1 flex items-center gap-1">
            <span className="text-amber-400 text-xs">★</span>
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
          {duration && <span>⏱ {duration}</span>}
          {priceFrom > 0 && <span className="text-brand-600 font-bold text-sm">From ${priceFrom}</span>}
        </div>
      </div>
    </div>
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
