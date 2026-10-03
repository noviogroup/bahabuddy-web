/**
 * Trip-style personalization (pure, client-safe helpers).
 *
 * Slugs mirror the `places_trip_styles_check` / `users_trip_styles_check`
 * constraints (migration 20261002151513_trip_styles_price_tier_place_status).
 * Ranking only reorders: with no style chosen every helper returns its input
 * unchanged, so cached server output stays identical for every visitor.
 */

export const TRIP_STYLES = [
  { slug: 'luxury', label: 'Luxury escape', short: 'luxury' },
  { slug: 'nightlife', label: 'Party & nightlife', short: 'nightlife' },
  { slug: 'beach-fun', label: 'Beach & fun', short: 'beach' },
  { slug: 'family', label: 'Family', short: 'family' },
  { slug: 'romance', label: 'Romance & honeymoon', short: 'romantic' },
  { slug: 'celebration', label: 'Celebration', short: 'celebration' },
  { slug: 'adventure', label: 'Adventure & water', short: 'adventure' },
  { slug: 'food-culture', label: 'Food & culture', short: 'food & culture' },
] as const

export type TripStyle = (typeof TRIP_STYLES)[number]['slug']

export const PRICE_TIERS = ['luxury', 'premium', 'mid', 'value'] as const
export type PriceTier = (typeof PRICE_TIERS)[number]

export const BUSINESS_STATUS_CLOSED_PERMANENTLY = 'CLOSED_PERMANENTLY'
export const BUSINESS_STATUS_CLOSED_TEMPORARILY = 'CLOSED_TEMPORARILY'

/** localStorage key for the visitor's chosen styles (JSON string array). */
export const TRIP_STYLES_STORAGE_KEY = 'bahabuddy.tripStyles.v1'
/** Same-tab broadcast so every mounted picker/list follows a change. */
export const TRIP_STYLES_CHANGE_EVENT = 'bahabuddy:trip-styles-change'

const STYLE_SLUGS = new Set<string>(TRIP_STYLES.map((style) => style.slug))
const TIER_SLUGS = new Set<string>(PRICE_TIERS)

export function isTripStyle(value: unknown): value is TripStyle {
  return typeof value === 'string' && STYLE_SLUGS.has(value)
}

export function isPriceTier(value: unknown): value is PriceTier {
  return typeof value === 'string' && TIER_SLUGS.has(value)
}

/**
 * Valid, de-duplicated styles in canonical order from an array, a JSON array
 * string or a comma-separated string (URL params). Unknown values are dropped.
 */
export function parseTripStyles(value: unknown): TripStyle[] {
  let raw: unknown[] = []
  if (Array.isArray(value)) {
    raw = value
  } else if (typeof value === 'string') {
    const text = value.trim()
    if (text.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(text)
        raw = Array.isArray(parsed) ? parsed : []
      } catch {
        raw = []
      }
    } else {
      raw = text.split(',')
    }
  }
  const wanted = new Set(
    raw
      .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
      .filter(isTripStyle),
  )
  return TRIP_STYLES.map((style) => style.slug).filter((slug) => wanted.has(slug))
}

export function tripStyleLabel(style: TripStyle): string {
  return TRIP_STYLES.find((item) => item.slug === style)?.label ?? style
}

/** "Picks for your family trip", "Picks for your family & beach trip". */
export function tripStyleHeading(styles: readonly TripStyle[]): string | null {
  if (styles.length === 0) return null
  if (styles.length > 2) return 'Picks for your kind of trip'
  const words = styles.map(
    (style) => TRIP_STYLES.find((item) => item.slug === style)?.short ?? style,
  )
  return `Picks for your ${words.join(' & ')} trip`
}

export function sameTripStyles(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

export interface TripStyleFit {
  tripStyles?: readonly string[] | null
  priceTier?: string | null
}

/** Price tiers that suit a style, best first (a weak tie-breaker signal). */
const STYLE_TIER_AFFINITY: Partial<Record<TripStyle, readonly PriceTier[]>> = {
  luxury: ['luxury', 'premium'],
  romance: ['luxury', 'premium'],
  celebration: ['premium', 'luxury'],
  family: ['mid', 'value'],
  'beach-fun': ['mid', 'value'],
  'food-culture': ['value', 'mid'],
}

const STYLE_MATCH_WEIGHT = 10

/** 0 when nothing fits; each matching style tag outweighs any price signal. */
export function tripStyleScore(fit: TripStyleFit, styles: readonly TripStyle[]): number {
  if (styles.length === 0) return 0
  const tags = new Set(fit.tripStyles ?? [])
  let score = 0
  for (const style of styles) {
    if (tags.has(style)) score += STYLE_MATCH_WEIGHT
    const tiers = STYLE_TIER_AFFINITY[style]
    if (tiers && isPriceTier(fit.priceTier)) {
      const position = tiers.indexOf(fit.priceTier)
      if (position === 0) score += 2
      else if (position === 1) score += 1
    }
  }
  return score
}

export function matchesTripStyles(fit: TripStyleFit, styles: readonly TripStyle[]): boolean {
  if (styles.length === 0) return true
  const tags = fit.tripStyles ?? []
  return styles.some((style) => tags.includes(style))
}

/**
 * Stable re-rank: best fit first, ties keep their original (admin / rating)
 * order. Returns the same array when no style is chosen.
 */
export function rankByTripStyles<T>(
  items: readonly T[],
  styles: readonly TripStyle[],
  fitOf: (item: T) => TripStyleFit,
): readonly T[] {
  if (styles.length === 0 || items.length < 2) return items
  return items
    .map((item, index) => ({ item, index, score: tripStyleScore(fitOf(item), styles) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item)
}

// ---------------------------------------------------------------------------
// Stays: the `hotels` table (LiteAPI) has no trip_styles column, so the stays
// list derives a fit from the card's own name, property type, amenities and
// star class. Used for client-side ordering only, never shown as a claim.
// ---------------------------------------------------------------------------

interface HotelFitInput {
  name?: string | null
  property_type_name?: string | null
  amenities?: readonly string[] | null
  description?: string | null
  star_rating?: number | null
}

const HOTEL_STYLE_SIGNALS: Record<TripStyle, readonly string[]> = {
  luxury: ['luxury', 'spa', 'butler', 'private beach', 'suite', 'villa'],
  nightlife: ['casino', 'nightclub', 'night club', 'bar', 'lounge'],
  'beach-fun': ['beach', 'beachfront', 'water park', 'waterpark', 'oceanfront'],
  family: ['family', 'families', 'kid', 'children', 'water park', 'waterpark', 'kitchen'],
  romance: ['adults only', 'adult only', 'couples', 'romantic', 'honeymoon', 'boutique', 'spa'],
  celebration: ['casino', 'villa', 'rooftop', 'event', 'banquet'],
  adventure: ['dive', 'diving', 'snorkel', 'snorkeling', 'snorkelling', 'fishing', 'marina', 'kayak', 'kayaking', 'watersport', 'water sport'],
  'food-culture': ['historic', 'heritage', 'downtown', 'colonial', 'restaurant'],
}

function normalizeSignal(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function hotelPriceTier(starRating: number | null | undefined): PriceTier | null {
  if (starRating == null || !Number.isFinite(starRating) || starRating <= 0) return null
  if (starRating >= 5) return 'luxury'
  if (starRating >= 4) return 'premium'
  if (starRating >= 3) return 'mid'
  return 'value'
}

export function inferHotelTripStyles(hotel: HotelFitInput): TripStyle[] {
  const text = ` ${[
    hotel.name,
    hotel.property_type_name,
    ...(hotel.amenities ?? []),
    hotel.description?.slice(0, 600),
  ].map(normalizeSignal).filter(Boolean).join(' ')} `
  const styles = new Set<TripStyle>()
  // Whole words (or a plain plural): "bar" matches "bars", not "barbecue".
  const hasWord = (signal: string) => text.includes(` ${signal} `) || text.includes(` ${signal}s `)
  for (const style of TRIP_STYLES) {
    if (HOTEL_STYLE_SIGNALS[style.slug].some(hasWord)) {
      styles.add(style.slug)
    }
  }
  if ((hotel.star_rating ?? 0) >= 5) styles.add('luxury')
  return TRIP_STYLES.map((style) => style.slug).filter((slug) => styles.has(slug))
}

// ---------------------------------------------------------------------------
// Business status
// ---------------------------------------------------------------------------

export function isPermanentlyClosed(status: unknown): boolean {
  return status === BUSINESS_STATUS_CLOSED_PERMANENTLY
}

export function isTemporarilyClosed(status: unknown): boolean {
  return status === BUSINESS_STATUS_CLOSED_TEMPORARILY
}

// ---------------------------------------------------------------------------
// Browser storage (every access is guarded: private mode / blocked storage)
// ---------------------------------------------------------------------------

export function readStoredTripStyles(): TripStyle[] {
  if (typeof window === 'undefined') return []
  try {
    return parseTripStyles(window.localStorage.getItem(TRIP_STYLES_STORAGE_KEY) ?? '')
  } catch {
    return []
  }
}

export function writeStoredTripStyles(styles: readonly TripStyle[]): void {
  if (typeof window === 'undefined') return
  try {
    if (styles.length === 0) window.localStorage.removeItem(TRIP_STYLES_STORAGE_KEY)
    else window.localStorage.setItem(TRIP_STYLES_STORAGE_KEY, JSON.stringify(styles))
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
  try {
    window.dispatchEvent(new CustomEvent(TRIP_STYLES_CHANGE_EVENT, { detail: [...styles] }))
  } catch {
    // CustomEvent unsupported: other mounted components refresh on next load.
  }
}
