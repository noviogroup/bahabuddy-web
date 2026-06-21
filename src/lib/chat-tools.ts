/**
 * chat-tools.ts — Claude tool definitions + executors + card transforms for the web.
 *
 * Mobile reference: /Baha-Buddy-V2/supabase/functions/claude-chat-proxy/tools.ts
 *
 * Architectural choices for the web port (intentional deviations from mobile,
 * all documented inline):
 *
 *   1. Hotels: mobile routes through hotels-stays-proxy (LiteAPI) for live
 *      inventory. Web doesn't have that Edge Function under its own project,
 *      so we fall back to google_places filtered by type=lodging. Result:
 *      curated catalog instead of live LiteAPI prices. Swap to a live source
 *      once a web-side hotels-stays-proxy is deployed.
 *
 *   2. Activities: same story as hotels. Mobile uses Viator. Web falls back
 *      to google_places filtered by tourist_attraction. Swap when an
 *      activities-proxy is wired.
 *
 *   3. Flights: LiteAPI-backed beta flight search, matching the web booking
 *      routes and mobile booking provider contract.
 *
 *   4. Weather: identical to mobile — direct Open-Meteo call, no auth needed.
 *
 *   5. Card generation: SERVER generates concrete-data cards (hotel /
 *      restaurant / activity / flight / destination) from tool results,
 *      emitted via a structured `cards` SSE event. Claude composes only the
 *      narrative + the synthesized cards (day_plan / summary / map), which
 *      it emits via the existing ```card-data fence. parseCardsFromContent
 *      handles the fence; toolResultsToCards() handles the tool path.
 *
 *   6. Detail-page identifiers: every hotel / restaurant / activity card
 *      carries the source row's `place_id`. Clicking the card in chat opens
 *      the corresponding detail page at /stays/[id], /restaurants/[id], or
 *      /activities/[id]. Flight cards carry LiteAPI offer IDs for direct
 *      booking at /flights/[offerId]/book.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CardData } from '@/components/RichCards'
import { resolveAirlineLogoUrl } from '@/lib/airline-logos'
import { callTravelProvider } from '@/lib/travel-booking/provider'
import { fetchIslandWeather, WeatherProviderError } from '@/lib/weather'

// ──────────────────────────────────────────────────────────────────────────
// TOOL DEFINITIONS (sent to Claude)
// ──────────────────────────────────────────────────────────────────────────

export const TOOL_DEFINITIONS = [
  {
    name: 'get_hotels',
    description: 'Search for hotels and accommodations on a specific Bahamas island. Use when the user asks about where to stay, accommodations, hotels, resorts, or villas. ALWAYS call this instead of making up hotel names. Returns curated Bahamas lodging from the database.',
    input_schema: {
      type: 'object',
      properties: {
        island_id: {
          type: 'string',
          enum: ['nassau', 'paradise-island', 'exuma', 'eleuthera', 'harbour-island', 'andros', 'grand-bahama', 'bimini', 'long-island', 'abacos'],
          description: 'The island to search on',
        },
        price_range: {
          type: 'string',
          enum: ['budget', 'moderate', 'upscale', 'fine-dining'],
          description: 'Price tier filter',
        },
        min_rating: {
          type: 'number',
          description: 'Minimum guest rating on a 0-5 scale (e.g. 4.0 for highly rated).',
        },
        limit: {
          type: 'integer',
          description: 'Max results (default 5, max 10)',
        },
      },
      required: ['island_id'],
    },
  },

  {
    name: 'get_restaurants',
    description: 'Search for quality restaurants and dining options on a specific Bahamas island. Use when the user asks about food, dining, restaurants, cafes, bars, where to eat, or cuisine. Results are filtered to avoid generic delis, convenience food spots, and chain-style low-signal records. ALWAYS call this instead of making up restaurant names.',
    input_schema: {
      type: 'object',
      properties: {
        island_id: {
          type: 'string',
          enum: ['nassau', 'paradise-island', 'exuma', 'eleuthera', 'harbour-island', 'andros', 'grand-bahama', 'bimini', 'long-island', 'abacos'],
          description: 'The island to search on',
        },
        cuisine_type: {
          type: 'string',
          description: 'Cuisine filter: bahamian, seafood, italian, international, american, asian, caribbean',
        },
        price_range: {
          type: 'string',
          enum: ['budget', 'moderate', 'upscale', 'fine-dining'],
          description: 'Price tier filter',
        },
        limit: {
          type: 'integer',
          description: 'Max results (default 5)',
        },
      },
      required: ['island_id'],
    },
  },

  {
    name: 'get_activities',
    description: 'Search for tours, activities, and experiences on a specific Bahamas island. Use when the user asks about what to do, tours, excursions, snorkeling, fishing, cultural experiences, nightlife, or any activity. ALWAYS call this instead of making up activity names.',
    input_schema: {
      type: 'object',
      properties: {
        island_id: {
          type: 'string',
          enum: ['nassau', 'paradise-island', 'exuma', 'eleuthera', 'harbour-island', 'andros', 'grand-bahama', 'bimini', 'long-island', 'abacos'],
          description: 'The island to search on',
        },
        vibe_tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by vibe: beach, adventure, culture, nightlife, romance, family, foodie, water-sports, luxury, fishing',
        },
        kid_friendly: {
          type: 'boolean',
          description: 'Only return kid-friendly activities. Set true when the user has children.',
        },
        limit: {
          type: 'integer',
          description: 'Max results (default 5)',
        },
      },
      required: ['island_id'],
    },
  },

  {
    name: 'search_flights',
    description: 'Search for flights to the Bahamas. Use when the user asks about flights, airfare, getting to the Bahamas, or travel from their home city. Queries LiteAPI for beta real-time pricing and offer IDs.',
    input_schema: {
      type: 'object',
      properties: {
        origin_city: {
          type: 'string',
          description: 'Departure city or 3-letter IATA airport code (e.g. "Miami" or "MIA")',
        },
        destination: {
          type: 'string',
          enum: ['NAS', 'EXU', 'ELH', 'FPO', 'GHB', 'BIM', 'ASD', 'MHH'],
          description: 'Bahamas airport code. NAS=Nassau, EXU=Exuma, ELH=Eleuthera, FPO=Freeport, GHB=Governors Harbour, BIM=Bimini, ASD=Andros, MHH=Abacos',
        },
        departure_date: {
          type: 'string',
          description: 'Departure date YYYY-MM-DD. Must be today or in the future.',
        },
        return_date: {
          type: 'string',
          description: 'Return date YYYY-MM-DD (omit for one-way)',
        },
        passengers: {
          type: 'integer',
          description: 'Number of passengers (default 1)',
        },
        cabin_class: {
          type: 'string',
          enum: ['economy', 'premium_economy', 'business', 'first'],
          description: 'Cabin class preference',
        },
      },
      required: ['origin_city', 'destination', 'departure_date'],
    },
  },

  {
    name: 'get_trip_details',
    description: 'Retrieve the current trip state including accommodations, flights, activities, and budget. Use when the user asks about "my trip," wants to review their plan, or you need context about what has already been planned.',
    input_schema: {
      type: 'object',
      properties: {
        trip_id: {
          type: 'string',
          description: 'The trip UUID. Use the active trip from user context if not specified.',
        },
      },
      required: ['trip_id'],
    },
  },

  {
    name: 'get_user_profile',
    description: 'Retrieve detailed user preferences, travel history, and engagement data. Use when you need more context about the user beyond what is in the system context.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  {
    name: 'create_itinerary_item',
    description: 'Add an activity, restaurant, or experience to the user\'s trip timeline. Use when the user says "add this", "book this", "put this on day 3", or confirms they want something in their itinerary.',
    input_schema: {
      type: 'object',
      properties: {
        trip_id: {
          type: 'string',
          description: 'The trip UUID',
        },
        day_number: {
          type: 'integer',
          description: 'Which day of the trip (1-indexed)',
        },
        time_slot: {
          type: 'string',
          enum: ['morning', 'afternoon', 'evening'],
          description: 'Time slot for the activity',
        },
        activity_type: {
          type: 'string',
          enum: ['hotel', 'restaurant', 'activity', 'flight', 'transport'],
          description: 'Type of itinerary item',
        },
        name: {
          type: 'string',
          description: 'Name of the place or activity',
        },
        notes: {
          type: 'string',
          description: 'Optional notes or special instructions',
        },
      },
      required: ['trip_id', 'day_number', 'time_slot', 'activity_type', 'name'],
    },
  },

  {
    name: 'get_weather',
    description: 'Get current weather and 7-day forecast for a Bahamas island. Use when the user asks about weather, temperature, rain, or what to pack.',
    input_schema: {
      type: 'object',
      properties: {
        island_id: {
          type: 'string',
          enum: ['nassau', 'paradise-island', 'exuma', 'eleuthera', 'andros', 'grand-bahama', 'bimini', 'long-island', 'abacos'],
          description: 'The island to get weather for',
        },
      },
      required: ['island_id'],
    },
  },

  {
    name: 'get_island_info',
    description: 'Get detailed information about a specific Bahamian island including overview, highlights, best time to visit, and travel tips.',
    input_schema: {
      type: 'object',
      properties: {
        island_id: {
          type: 'string',
          enum: ['nassau', 'paradise-island', 'exuma', 'eleuthera', 'harbour-island', 'andros', 'grand-bahama', 'bimini', 'long-island', 'abacos'],
          description: 'The island to get info about',
        },
      },
      required: ['island_id'],
    },
  },
] as const

// ──────────────────────────────────────────────────────────────────────────
// SHARED REFERENCE DATA
// ──────────────────────────────────────────────────────────────────────────

const ISLAND_DISPLAY: Record<string, string> = {
  'nassau':            'Nassau',
  'paradise-island':   'Paradise Island',
  'exuma':             'Exuma',
  'eleuthera':         'Eleuthera',
  'harbour-island':    'Harbour Island',
  'andros':            'Andros',
  'grand-bahama':      'Grand Bahama',
  'bimini':            'Bimini',
  'long-island':       'Long Island',
  'abacos':            'The Abacos',
}

const PRICE_LEVEL_MAP: Record<string, number[]> = {
  'budget':      [0, 1],
  'moderate':    [2],
  'upscale':     [3],
  'fine-dining': [3, 4],
}

const RESTAURANT_MIN_REVIEW_COUNT = 15
const RESTAURANT_MIN_RATING = 4.0
const RESTAURANT_EXCLUDED_NAME_TERMS = [
  'brandon',
  'deli',
  'mini mart',
  'minimart',
  'convenience',
  'grocery',
  'supermarket',
  'liquor',
  'gas station',
  'service station',
  'food store',
  'wholesale',
  'pharmacy',
  'marco',
  'domino',
  'kfc',
  'mcdonald',
  'burger king',
  'wendy',
  'subway',
  'popeyes',
  'dunkin',
  'starbucks',
]

const RESTAURANT_EXCLUDED_CUISINE_TERMS = [
  'deli',
  'fast food',
  'convenience',
]

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : ''
}

function hasRestaurantPhoto(place: Record<string, unknown>): boolean {
  const photoUrl = typeof place.photo_url === 'string' ? place.photo_url : ''
  if (photoUrl.startsWith('http')) return true
  const photos = place.photos
  return Array.isArray(photos) && photos.length > 0
}

export function isQualityRestaurantCandidate(place: Record<string, unknown>): boolean {
  const name = textValue(place.name)
  if (!name) return false
  if (RESTAURANT_EXCLUDED_NAME_TERMS.some(term => name.includes(term))) {
    return false
  }

  const cuisine = textValue(place.cuisine_type)
  if (RESTAURANT_EXCLUDED_CUISINE_TERMS.some(term => cuisine.includes(term))) {
    return false
  }

  const rating = typeof place.rating === 'number' ? place.rating : Number(place.rating ?? 0)
  if (!Number.isFinite(rating) || rating < RESTAURANT_MIN_RATING) {
    return false
  }

  const reviewCount = typeof place.user_ratings_total === 'number'
    ? place.user_ratings_total
    : Number(place.user_ratings_total ?? 0)
  if (!Number.isFinite(reviewCount) || reviewCount < RESTAURANT_MIN_REVIEW_COUNT) {
    return false
  }

  return hasRestaurantPhoto(place)
}

const ISLAND_INFO: Record<string, Record<string, unknown>> = {
  'nassau': {
    name: 'Nassau (New Providence)',
    tagline: 'Where culture, beaches, and city energy meet',
    overview: 'The capital and gateway to the Bahamas. Best for first-timers with the perfect mix of culture, beaches, dining, and nightlife.',
    highlights: ['Atlantis Paradise Island', 'Cable Beach', 'Fish Fry at Arawak Cay', 'Junkanoo Festival', 'Fort Charlotte', "Queen's Staircase"],
    best_time: 'December to April (dry season). June-November is hurricane season but prices drop 30-50%.',
    best_months: ['dec', 'jan', 'feb', 'mar', 'apr'],
    days_recommended: '3–4 days',
    getting_there: 'Direct flights to Lynden Pindling Intl (NAS) from most US cities',
    rating: 4.6,
    vibe: 'Urban island energy with world-class resorts and local culture side by side.',
  },
  'paradise-island': {
    name: 'Paradise Island',
    tagline: 'Atlantis territory, resort-island core',
    overview: "Nassau's sister island, home to Atlantis and the Bahamas' biggest resort scene. Connected by bridge — easy to combine with Nassau.",
    highlights: ['Atlantis Aquaventure', 'Cabbage Beach', 'Versailles Gardens', 'Paradise Beach', 'Marina Village'],
    best_time: 'December to April.',
    best_months: ['dec', 'jan', 'feb', 'mar', 'apr'],
    days_recommended: '2–3 days',
    getting_there: 'Fly to NAS, taxi or shuttle across the bridge (~15 min)',
    rating: 4.7,
    vibe: 'Big-resort luxury, family-friendly with the kids-water-park gravity well that is Atlantis.',
  },
  'exuma': {
    name: 'Exuma',
    tagline: 'Crystal water, swimming pigs, exclusive cays',
    overview: 'Crystal-clear waters, swimming pigs, and pristine cays. The Instagram-famous Bahamas experience.',
    highlights: ['Swimming Pigs at Big Major Cay', 'Thunderball Grotto', 'Tropic of Cancer Beach', 'Staniel Cay Yacht Club', 'Compass Cay sharks'],
    best_time: 'November to April. Swimming pig tours run year-round.',
    best_months: ['nov', 'dec', 'jan', 'feb', 'mar', 'apr'],
    days_recommended: '4–6 days',
    getting_there: 'Flights to Exuma Intl (GGT) from Nassau, Fort Lauderdale, Atlanta',
    rating: 4.8,
    vibe: 'Exclusive, adventurous, untouched paradise. Mix of luxury resorts and rustic island charm.',
  },
  'eleuthera': {
    name: 'Eleuthera',
    tagline: 'Pink-sand beaches and laid-back artistry',
    overview: 'Long, narrow island known for pink sand beaches and laid-back vibes. The surfer and artist island.',
    highlights: ['Pink Sands Beach (Harbour Island)', 'Glass Window Bridge', "Surfer's Beach", 'Leon Levy Native Plant Preserve', "Governor's Harbour"],
    best_time: 'December to May. Surf season is October to March.',
    best_months: ['dec', 'jan', 'feb', 'mar', 'apr', 'may'],
    days_recommended: '5–7 days',
    getting_there: "North Eleuthera (ELH) or Governor's Harbour (GHB), then water taxi to Harbour Island",
    rating: 4.7,
    vibe: 'Bohemian luxury meets untouched natural beauty. Slow pace, spectacular scenery.',
  },
  'harbour-island': {
    name: 'Harbour Island',
    tagline: 'Pink sand and colonial-luxury charm',
    overview: 'Three miles of pink sand beach and colonial charm. The most photographed beach in the Bahamas.',
    highlights: ['Pink Sands Beach', 'Dunmore Town', 'The Landing restaurant', 'Golf cart exploration', 'Bone fishing'],
    best_time: 'Year-round. Peak season December to April.',
    best_months: ['dec', 'jan', 'feb', 'mar', 'apr'],
    days_recommended: '3–5 days',
    getting_there: 'Fly to North Eleuthera (ELH), then 10-minute water taxi',
    rating: 4.8,
    vibe: 'Boutique luxury, romance, quiet sophistication. Celebrity-favorite hideaway.',
  },
  'andros': {
    name: 'Andros',
    tagline: 'Reef diving and barrier-island wilderness',
    overview: "The largest Bahamas island and least developed. Home to the world's third-largest barrier reef and mysterious blue holes.",
    highlights: ['Andros Barrier Reef', 'Blue holes', 'Androsia batik fabric', 'Bone fishing flats', "Captain Bill's Blue Hole"],
    best_time: 'November to June. Diving is best March to September.',
    best_months: ['nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun'],
    days_recommended: '5–7 days',
    getting_there: 'San Andros Airport (SAQ) — flights from Nassau',
    rating: 4.6,
    vibe: 'Eco-adventure, diving paradise, off-the-beaten-path exploration.',
  },
  'grand-bahama': {
    name: 'Grand Bahama (Freeport)',
    tagline: 'Family beaches, value, close to Florida',
    overview: 'Family-friendly island closest to Florida. Great beaches, nature parks, and duty-free shopping.',
    highlights: ['Lucayan National Park', 'Gold Rock Beach', 'Port Lucaya Marketplace', 'Peterson Cay', "Deadman's Reef snorkeling"],
    best_time: 'December to April. Most affordable May to November.',
    best_months: ['dec', 'jan', 'feb', 'mar', 'apr'],
    days_recommended: '3–4 days',
    getting_there: 'Grand Bahama Intl (FPO) — 30 min flight from Fort Lauderdale',
    rating: 4.4,
    vibe: 'Relaxed, family-oriented, nature-focused. Best value in the Bahamas.',
  },
  'bimini': {
    name: 'Bimini',
    tagline: 'Sport fishing capital, closest to the US',
    overview: 'The closest Bahamas island to the US mainland. Famous for big game fishing, Hemingway history, and crystal-clear waters.',
    highlights: ['Bimini Road (underwater ruins)', 'Healing Hole', 'Radio Beach', 'Deep sea fishing', 'Resorts World Bimini'],
    best_time: 'Year-round. Big game fishing peaks March to September.',
    best_months: ['mar', 'apr', 'may', 'jun', 'jul'],
    days_recommended: '2–3 days',
    getting_there: 'South Bimini (BIM) — 25 min from Fort Lauderdale; also ferry service',
    rating: 4.5,
    vibe: 'Fishing village meets beach resort. Hemingway nostalgia and world-class diving.',
  },
  'long-island': {
    name: 'Long Island',
    tagline: "Dean's Blue Hole and untouched Bahamas",
    overview: "The most scenic island in the Bahamas. Dramatic cliffs, pristine beaches, and Dean's Blue Hole — the world's deepest.",
    highlights: ["Dean's Blue Hole", 'Cape Santa Maria Beach', 'Columbus Monument', 'Conception Island day trip', "Hamilton's Cave"],
    best_time: 'November to May.',
    best_months: ['nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'may'],
    days_recommended: '5–7 days',
    getting_there: "Deadman's Cay (LGI) — flights from Nassau",
    rating: 4.7,
    vibe: 'Untouched, dramatic landscape, true off-grid Bahamas experience.',
  },
  'abacos': {
    name: 'The Abacos',
    tagline: 'Sailing capital, pastel cay villages',
    overview: 'Sailing capital of the Bahamas. Charming colonial towns, world-class marinas, and sheltered island-hopping waters.',
    highlights: ['Hope Town Lighthouse', 'Elbow Cay', 'Green Turtle Cay', 'Treasure Cay Beach', 'Man-O-War Cay boatbuilding'],
    best_time: 'November to May. Sailing regattas in spring.',
    best_months: ['nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'may'],
    days_recommended: '5–7 days',
    getting_there: 'Marsh Harbour (MHH) — flights from Nassau and Fort Lauderdale',
    rating: 4.6,
    vibe: 'Nautical charm, pastel colonial villages, sailing and boating paradise.',
  },
}

/** Slug → hero photo URL. Mirrors `BahaImages` (lib/baha-images.ts) so
 *  destination cards emitted by `get_island_info` use the same brand
 *  imagery as the rest of the app. Tambourine CDN URLs are stable. */
const ISLAND_PHOTOS: Record<string, string> = {
  'nassau':          'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg',
  'paradise-island': 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg',
  'exuma':           'https://tempo.cdn.tambourine.com/windsong/media/bmot-exumas-islands-img-5f7654f77ef66.jpg',
  'eleuthera':       'https://tempo.cdn.tambourine.com/windsong/media/bmot-eleuthera-islands-img-5f7654ecd18bf.jpg',
  'harbour-island':  'https://tempo.cdn.tambourine.com/windsong/media/bmot-eleuthera-islands-img-5f7654ecd18bf.jpg',
  'andros':          'https://tempo.cdn.tambourine.com/windsong/media/bmot-andros-islands-img-5f7654cd43acd.jpg',
  'grand-bahama':    'https://tempo.cdn.tambourine.com/windsong/media/freeport-5ebc543630edb.jpg',
  'bimini':          'https://tempo.cdn.tambourine.com/windsong/media/bimini-5ebc1e784e5d8.jpg',
  'long-island':     'https://tempo.cdn.tambourine.com/windsong/media/bmot-long-island-islands-img-5f765510d841f.jpg',
  'abacos':          'https://tempo.cdn.tambourine.com/windsong/media/bmot-the-abacos-islands-img-5f765543ac3d5.jpg',
}

const CITY_TO_IATA: Record<string, string> = {
  'miami': 'MIA', 'fort lauderdale': 'FLL', 'west palm beach': 'PBI',
  'palm beach': 'PBI', 'new york': 'JFK', 'jfk': 'JFK',
  'newark': 'EWR', 'laguardia': 'LGA', 'atlanta': 'ATL', 'charlotte': 'CLT',
  'raleigh': 'RDU', 'raleigh durham': 'RDU', 'baltimore': 'BWI',
  'nashville': 'BNA', 'dallas': 'DFW', 'houston': 'IAH',
  'houston hobby': 'HOU', 'chicago': 'ORD', 'los angeles': 'LAX',
  'san francisco': 'SFO', 'boston': 'BOS', 'philadelphia': 'PHL',
  'washington': 'IAD', 'dc': 'IAD', 'orlando': 'MCO', 'tampa': 'TPA',
  'jacksonville': 'JAX', 'fort myers': 'RSW', 'new orleans': 'MSY',
  'detroit': 'DTW', 'denver': 'DEN', 'seattle': 'SEA',
  'minneapolis': 'MSP', 'phoenix': 'PHX', 'las vegas': 'LAS',
  'san diego': 'SAN', 'portland': 'PDX', 'toronto': 'YYZ',
  'montreal': 'YUL', 'vancouver': 'YVR', 'london': 'LHR',
  'nassau': 'NAS', 'freeport': 'FPO',
}

function resolveAirportCode(input: string): string | null {
  if (!input) return null
  const clean = input.trim()
  if (/^[A-Z]{3}$/i.test(clean)) return clean.toUpperCase()
  const lower = normalizeAirportLookup(clean)
  if (CITY_TO_IATA[lower]) return CITY_TO_IATA[lower]
  for (const [city, code] of Object.entries(CITY_TO_IATA)) {
    if (lower.includes(city) || city.includes(lower)) return code
  }
  return null
}

function normalizeAirportLookup(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[-/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ──────────────────────────────────────────────────────────────────────────
// TOOL EXECUTORS
// ──────────────────────────────────────────────────────────────────────────

export interface ToolResult {
  /** Tool result data passed back to Claude as tool_result content. */
  data: unknown
  /** Optional concrete cards to emit to the UI via the `cards` SSE event. */
  cards?: CardData[]
}

/**
 * Shape of a single photo entry in `google_places.photos` JSONB.
 * Mirrors what the Google Places Details API returns.
 */
interface PhotoMeta {
  reference: string
  width?: number
  height?: number
}

/** Build a proxy URL for a Google Place photo reference. Matches the
 *  pattern in `src/lib/place-photos.ts` so existing storage caching
 *  (the /api/place-photo route walks Supabase storage first) applies. */
function photoRefToProxyUrl(reference: string, width = 800): string {
  const params = new URLSearchParams({ ref: reference, w: String(width) })
  return `/api/place-photo?${params.toString()}`
}

/** Convert a place's photos JSONB array into renderable URL strings.
 *  Returns an empty array when the field is missing/malformed. */
function buildPhotoGallery(photos: unknown): string[] {
  if (!Array.isArray(photos)) return []
  return photos
    .filter((p): p is PhotoMeta => !!p && typeof p === 'object' && typeof (p as PhotoMeta).reference === 'string')
    .map(p => photoRefToProxyUrl(p.reference, 800))
}

/** Shape of a single top-review record returned by fetchTopReviews. */
interface TopReview {
  text: string
  author_name: string
  rating: number
  time: string
}

/**
 * Batch-pull one positive review per place from `google_place_reviews`.
 *
 * Used by all three place-search executors (hotels, restaurants,
 * activities) to add social-proof snippets to their cards. We pull a
 * wide window (rating >= 4, newest first) then dedupe to first-per-place
 * client-side — PostgREST has no DISTINCT ON, and a LATERAL subquery
 * would require a custom RPC. Query cost is small (~1,700 review rows,
 * indexed on place_id).
 *
 * Reviews shorter than 30 chars are skipped — they don't carry
 * decision-supporting signal ("Great!" doesn't help anyone decide).
 */
async function fetchTopReviews(
  supabase: SupabaseClient,
  placeIds: string[],
): Promise<Map<string, TopReview>> {
  const out = new Map<string, TopReview>()
  if (placeIds.length === 0) return out

  const { data: rows, error } = await supabase
    .from('google_place_reviews')
    .select('place_id, author_name, rating, text, time')
    .in('place_id', placeIds)
    .gte('rating', 4)
    .not('text', 'is', null)
    .order('time', { ascending: false })
    .limit(placeIds.length * 4) // pull a few per place; we keep first

  if (error) {
    console.warn('[fetchTopReviews] lookup failed:', error.message)
    return out
  }
  if (!rows) return out

  for (const r of rows) {
    const pid = r.place_id as string
    const txt = (r.text as string | null) ?? ''
    if (!out.has(pid) && txt.length > 30) {
      out.set(pid, {
        text: txt,
        author_name: (r.author_name as string) ?? 'Guest',
        rating: (r.rating as number) ?? 5,
        time: (r.time as string) ?? '',
      })
    }
  }
  return out
}

export async function getHotels(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  let query = supabase
    .from('google_places')
    .select('place_id:id, name, type, island_id, rating, user_ratings_total, address, phone, website, price_level, photo_url:image_url, photos, description, amenities')
    .eq('is_active', true)
    .in('type', ['lodging', 'hotel', 'resort'])
    .eq('island_id', args.island_id)
    .gte('user_ratings_total', 5)
    .order('rating', { ascending: false })

  if (args.price_range) {
    const levels = PRICE_LEVEL_MAP[args.price_range as string]
    if (levels) query = query.in('price_level', levels)
  }
  if (args.min_rating) query = query.gte('rating', args.min_rating)

  const limit = Math.min(Number(args.limit) || 5, 10)
  query = query.limit(limit)

  const { data, error } = await query

  if (error) {
    return { data: { error: `Hotel search failed: ${error.message}`, results: [] } }
  }

  if (!data || data.length === 0) {
    return {
      data: {
        results: [],
        message: `No hotels found on ${ISLAND_DISPLAY[args.island_id as string] ?? args.island_id} matching your criteria. Try a different island or relax the filters.`,
      },
    }
  }

  // ── Top-review fetch ──────────────────────────────────────────────
  const placeIds = data.map(p => p.place_id as string).filter(Boolean)
  const reviewsByPlace = await fetchTopReviews(supabase, placeIds)

  // Compact data for Claude
  const compact = data.map(p => ({
    place_id: p.place_id,
    name: p.name,
    island: p.island_id,
    rating: p.rating,
    review_count: p.user_ratings_total,
    price_level: p.price_level,
    amenities: p.amenities ?? [],
    description: p.description,
  }))

  // Cards for the UI — `place_id` is what makes each card link to its
  // detail page (/stays/[id]). The renderer falls back to non-linking
  // when place_id is absent (defensive — should never happen for tool-
  // emitted cards since the column is non-null in google_places).
  const cards: CardData[] = data.map(p => {
    const pid = p.place_id as string
    const gallery = buildPhotoGallery(p.photos)
    return {
      card_type: 'hotel' as const,
      place_id: pid,
      name: p.name ?? 'Hotel',
      island: ISLAND_DISPLAY[p.island_id as string] ?? (p.island_id as string),
      island_id: p.island_id ?? undefined,
      rating: p.rating ?? 0,
      stars: priceLevelToStars(p.price_level),
      review_count: p.user_ratings_total ?? 0,
      photo_url: p.photo_url ?? gallery[0] ?? undefined,
      photos: gallery,
      amenities: (p.amenities as string[] | null) ?? [],
      price_per_night: priceLevelToNightlyEstimate(p.price_level),
      price_is_estimate: true,
      phone: (p.phone as string | null) ?? undefined,
      website: (p.website as string | null) ?? undefined,
      full_address: (p.address as string | null) ?? undefined,
      top_review: reviewsByPlace.get(pid),
    }
  })

  return { data: { results: compact, count: data.length }, cards }
}

/** Heuristic: price_level 4 = 5-star feel, 3 = 4-star, 2 = 3-star, lower = 3-star. */
function priceLevelToStars(level: number | null | undefined): number {
  switch (level) {
    case 4: return 5
    case 3: return 4
    case 2: return 3
    case 1: return 3
    default: return 3
  }
}

/** Approximate USD/night from Google price_level until LiteAPI live rates ship. */
export function priceLevelToNightlyEstimate(level: number | null | undefined): number {
  switch (level) {
    case 4: return 650
    case 3: return 425
    case 2: return 275
    case 1: return 175
    default: return 199
  }
}

async function getRestaurants(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  let query = supabase
    .from('google_places')
    .select('place_id:id, name, type, island_id, rating, user_ratings_total, address, phone, website, price_level, photo_url:image_url, photos, opening_hours, description, cuisine_type')
    .eq('is_active', true)
    .eq('type', 'restaurant')
    .eq('island_id', args.island_id)
    .gte('rating', RESTAURANT_MIN_RATING)
    .gte('user_ratings_total', RESTAURANT_MIN_REVIEW_COUNT)
    .order('rating', { ascending: false })

  if (args.cuisine_type) {
    query = query.ilike('cuisine_type', `%${args.cuisine_type}%`)
  }
  if (args.price_range) {
    const levels = PRICE_LEVEL_MAP[args.price_range as string]
    if (levels) query = query.in('price_level', levels)
  }

  const limit = Math.min(Number(args.limit) || 5, 10)
  query = query.limit(Math.min(limit * 4, 40))

  const { data, error } = await query

  if (error) {
    return { data: { error: `Restaurant search failed: ${error.message}`, results: [] } }
  }

  const filteredData = data
    ?.filter((p: Record<string, unknown>) => isQualityRestaurantCandidate(p))
    .slice(0, limit)

  if (!filteredData || filteredData.length === 0) {
    return {
      data: {
        results: [],
        message: `No restaurants found on ${ISLAND_DISPLAY[args.island_id as string] ?? args.island_id} matching your criteria.`,
      },
    }
  }

  const placeIds = filteredData.map(p => p.place_id as string).filter(Boolean)
  const reviewsByPlace = await fetchTopReviews(supabase, placeIds)

  const compact = filteredData.map(p => ({
    place_id: p.place_id,
    name: p.name,
    island: p.island_id,
    cuisine: p.cuisine_type,
    rating: p.rating,
    price_level: p.price_level,
    description: p.description,
  }))

  const cards: CardData[] = filteredData.map(p => {
    const pid = p.place_id as string
    const gallery = buildPhotoGallery(p.photos)
    const hours = Array.isArray(p.opening_hours) ? (p.opening_hours as string[]) : undefined
    return {
      card_type: 'restaurant' as const,
      place_id: pid,
      name: p.name ?? 'Restaurant',
      island: ISLAND_DISPLAY[p.island_id as string] ?? (p.island_id as string),
      island_id: p.island_id ?? undefined,
      cuisine: (p.cuisine_type as string | null) ?? 'International',
      rating: p.rating ?? 0,
      review_count: p.user_ratings_total ?? 0,
      price_level: p.price_level ?? 2,
      photo_url: p.photo_url ?? gallery[0] ?? undefined,
      photos: gallery,
      phone: (p.phone as string | null) ?? undefined,
      website: (p.website as string | null) ?? undefined,
      full_address: (p.address as string | null) ?? undefined,
      opening_hours: hours,
      top_review: reviewsByPlace.get(pid),
    }
  })

  return { data: { results: compact, count: filteredData.length }, cards }
}

async function getActivities(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  let query = supabase
    .from('google_places')
    .select('place_id:id, name, type, island_id, rating, user_ratings_total, address, phone, website, price_level, photo_url:image_url, photos, opening_hours, description, vibe_tags, kid_friendly')
    .eq('is_active', true)
    .eq('type', 'attraction')
    .eq('island_id', args.island_id)
    .gte('user_ratings_total', 5)
    .order('rating', { ascending: false })

  if (args.kid_friendly === true) {
    query = query.eq('kid_friendly', true)
  }

  // Vibe tag overlap (Supabase array contains operator)
  if (Array.isArray(args.vibe_tags) && args.vibe_tags.length > 0) {
    query = query.overlaps('vibe_tags', args.vibe_tags as string[])
  }

  const limit = Math.min(Number(args.limit) || 5, 10)
  query = query.limit(limit)

  const { data, error } = await query

  if (error) {
    return { data: { error: `Activity search failed: ${error.message}`, results: [] } }
  }

  if (!data || data.length === 0) {
    return {
      data: {
        results: [],
        message: `No activities found on ${ISLAND_DISPLAY[args.island_id as string] ?? args.island_id} matching your criteria. I can recommend activities from my knowledge of the Bahamas — just ask.`,
      },
    }
  }

  const placeIds = data.map(p => p.place_id as string).filter(Boolean)
  const reviewsByPlace = await fetchTopReviews(supabase, placeIds)

  const compact = data.map(p => ({
    place_id: p.place_id,
    name: p.name,
    island: p.island_id,
    rating: p.rating,
    review_count: p.user_ratings_total,
    description: p.description,
    vibe_tags: p.vibe_tags,
    kid_friendly: p.kid_friendly,
  }))

  const cards: CardData[] = data.map(p => {
    const pid = p.place_id as string
    const gallery = buildPhotoGallery(p.photos)
    const hours = Array.isArray(p.opening_hours) ? (p.opening_hours as string[]) : undefined
    return {
      card_type: 'activity' as const,
      place_id: pid,
      name: p.name ?? 'Activity',
      island: ISLAND_DISPLAY[p.island_id as string] ?? (p.island_id as string),
      island_id: p.island_id ?? undefined,
      description: (p.description as string | null) ?? '',
      rating: p.rating ?? 0,
      review_count: p.user_ratings_total ?? 0,
      vibe_tags: (p.vibe_tags as string[] | null) ?? [],
      kid_friendly: (p.kid_friendly as boolean | null) ?? false,
      photo_url: p.photo_url ?? gallery[0] ?? undefined,
      photos: gallery,
      phone: (p.phone as string | null) ?? undefined,
      website: (p.website as string | null) ?? undefined,
      full_address: (p.address as string | null) ?? undefined,
      opening_hours: hours,
      top_review: reviewsByPlace.get(pid),
      icon: pickActivityIcon((p.vibe_tags as string[] | null) ?? []),
    }
  })

  return { data: { results: compact, count: data.length }, cards }
}

function pickActivityIcon(vibeTags: string[]): string {
  if (vibeTags.includes('water-sports') || vibeTags.includes('diving')) return 'dive'
  if (vibeTags.includes('beach')) return 'beach'
  if (vibeTags.includes('fishing')) return 'fish'
  if (vibeTags.includes('foodie')) return 'eat'
  if (vibeTags.includes('culture')) return 'culture'
  if (vibeTags.includes('luxury') || vibeTags.includes('spa')) return 'spa'
  if (vibeTags.includes('adventure')) return 'hike'
  return 'tour'
}

export async function searchFlights(args: Record<string, unknown>): Promise<ToolResult> {
  const originCode = resolveAirportCode((args.origin_city as string) || '')
  const destCode = ((args.destination as string) || 'NAS').toUpperCase()
  const passengers = Number(args.passengers) || 1
  const cabinClass = String(args.cabin_class ?? 'economy').toUpperCase()
  const departureDate = String(args.departure_date ?? '').trim()
  const returnDate = typeof args.return_date === 'string' ? args.return_date.trim() : ''

  if (!originCode) {
    return {
      data: {
        error: `Could not resolve airport code for "${args.origin_city}". Try a 3-letter IATA code like MIA, JFK, ATL.`,
        results: [],
      },
    }
  }

  if (!departureDate) {
    return {
      data: {
        error: 'A future departure_date in YYYY-MM-DD format is required for live flight search.',
        results: [],
      },
    }
  }

  const legs = [
    { origin: originCode, destination: destCode, date: departureDate, direction: 'OUTBOUND' },
    ...(returnDate ? [{ origin: destCode, destination: originCode, date: returnDate, direction: 'INBOUND' }] : []),
  ]

  try {
    const result = await callTravelProvider('/flights/rates', {
      legs,
      adults: Math.max(1, passengers),
      cabinClass,
      currency: 'USD',
      country: 'US',
    })

    const cards = shapeLiteApiFlightCards(result.data)
    const compact = cards.map((card) => ({
      offer_id: card.offer_id,
      provider_offer_id: card.provider_offer_id,
      route: card.route,
      airline: card.airline,
      departure: card.departure,
      arrival: card.arrival,
      duration: card.duration,
      stops: card.stops,
      price: card.price,
      cabin_class: card.cabin_class,
      passengers: card.passengers,
    }))

    return {
      data: {
        results: compact,
        count: compact.length,
        message: compact.length === 0
          ? `No flights found from ${originCode} to ${destCode} on ${departureDate}. Try different dates or another airport.`
          : undefined,
      },
      cards,
    }
  } catch (err) {
    console.error('Flight search error:', err)
    return { data: { error: `Flight search error: ${String(err)}`, results: [] } }
  }
}

function shapeLiteApiFlightCards(response: unknown): CardData[] {
  const batches = Array.isArray(recordValue(response).data) ? recordValue(response).data as unknown[] : []
  const cards: CardData[] = []

  for (const batchValue of batches) {
    const batch = recordValue(batchValue)
    const journeys = Array.isArray(batch.journeys) ? batch.journeys : []
    for (const journeyValue of journeys) {
      const journey = recordValue(journeyValue)
      const segments = recordListValue(journey.segments)
      const outbound = segments.filter((segment) => segment.direction !== 'INBOUND')
      const shownSegments = outbound.length > 0 ? outbound : segments
      const first = shownSegments[0] ?? {}
      const last = shownSegments[shownSegments.length - 1] ?? first
      const carrier = recordValue(first.carrier)
      const duration = recordValue(journey.totalDuration)
      const offers = recordListValue(journey.offers)
      const passengerCounts = recordValue(journey.parameters)
      const passengerTotal = numericValue(passengerCounts.adults, 1) +
        numericValue(passengerCounts.children) +
        numericValue(passengerCounts.infants)

      for (const offer of offers) {
        const display = recordValue(recordValue(offer.pricing).display)
        const fare = recordValue(offer.fare)
        const terms = recordValue(offer.terms)
        const offerId = liteTextValue(offer.offerId)
        const airlineName = liteTextValue(carrier.marketingName, liteTextValue(carrier.operatingName, 'Airline'))
        const airlineCode = liteTextValue(carrier.marketingCode, liteTextValue(carrier.operatingCode, liteTextValue(carrier.iataCode)))
        const providerLogoUrl = liteTextValue(carrier.logoUrl, liteTextValue(carrier.logo_url))
        cards.push({
          card_type: 'flight',
          offer_id: offerId,
          provider_offer_id: offerId,
          route: `${liteTextValue(first.originCode)} to ${liteTextValue(last.destinationCode)}`,
          airline: airlineName,
          airline_code: airlineCode,
          airline_logo_url: resolveAirlineLogoUrl({
            providerLogoUrl,
            airlineCode,
            airlineName,
          }),
          departure: formatLiteApiFlightTime(first.departureTime),
          arrival: formatLiteApiFlightTime(last.arrivalTime),
          duration: formatLiteApiDuration(numericValue(duration.minutes)),
          stops: shownSegments.length <= 1 ? 'Direct' : `${shownSegments.length - 1} stop${shownSegments.length > 2 ? 's' : ''}`,
          price: numericValue(display.total),
          currency: liteTextValue(display.currency, 'USD'),
          cabin_class: liteTextValue(fare.family, 'Economy'),
          fare_brand: liteTextValue(fare.brandName, liteTextValue(fare.name, liteTextValue(fare.family))),
          passengers: Math.max(1, passengerTotal),
          baggage: { checked: liteApiBaggageCount(offer.baggage) },
          refundable: terms.refundable === true,
          expiration: liteTextValue(offer.expiresAt, liteTextValue(offer.expires_at, liteTextValue(offer.expiration))),
          description: terms.refundable === true ? 'Refundable fare' : undefined,
        })
      }
    }
  }

  return cards
    .filter((card) => card.offer_id && typeof card.price === 'number' && card.price > 0)
    .sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0))
    .slice(0, 5)
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function recordListValue(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(recordValue) : []
}

function liteTextValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numericValue(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function formatLiteApiFlightTime(value: unknown): string {
  if (typeof value !== 'string' || !value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatLiteApiDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`
}

function liteApiBaggageCount(value: unknown): number {
  const included = recordListValue(recordValue(value).included)
  return included.filter((bag) => /checked/i.test(liteTextValue(bag.description))).length
}

async function getTripDetails(supabase: SupabaseClient, tripId: string): Promise<ToolResult> {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      trip_accommodations(*),
      trip_flights(*),
      trip_activities(*)
    `)
    .eq('id', tripId)
    .single()

  if (error) return { data: { error: `Could not load trip: ${error.message}` } }
  return { data }
}

async function getUserProfile(supabase: SupabaseClient, userId: string): Promise<ToolResult> {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, email, country, city, party_type, party_size, children_count, children_ages, interest_tags, engagement_score, dietary_needs, accessibility_needs')
    .eq('id', userId)
    .single()
  if (error) return { data: { error: `Could not load profile: ${error.message}` } }
  return { data }
}

async function createItineraryItem(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const { data, error } = await supabase
    .from('trip_activities')
    .insert({
      trip_id: args.trip_id,
      day_number: args.day_number,
      time_slot: args.time_slot,
      activity_type: args.activity_type,
      activity_name: args.name,
      notes: args.notes ?? null,
    })
    .select()
    .single()

  if (error) return { data: { error: `Could not add to itinerary: ${error.message}` } }

  return {
    data: {
      success: true,
      message: `Added "${args.name}" to Day ${args.day_number} (${args.time_slot})`,
      item: data,
    },
  }
}

async function getWeather(islandId: string): Promise<ToolResult> {
  try {
    const weather = await fetchIslandWeather(islandId, { fallbackToNassau: false })

    return {
      data: {
        island: weather.islandId,
        current: {
          temperature_f: weather.tempF,
          humidity: weather.humidity,
          wind_speed_mph: weather.windMph,
          condition: weather.condition,
        },
        forecast: weather.forecast.map((day) => ({
          date: day.date,
          high_f: day.highF,
          low_f: day.lowF,
          rain_chance: day.rainChance,
          condition: day.condition,
        })),
      },
    }
  } catch (err) {
    if (err instanceof WeatherProviderError && err.status === 400) {
      return { data: { error: err.message } }
    }
    return { data: { error: `Weather fetch failed: ${String(err)}` } }
  }
}

function getIslandInfo(islandId: string): ToolResult {
  const info = ISLAND_INFO[islandId]
  if (!info) {
    return {
      data: { error: `Unknown island: ${islandId}. Available: ${Object.keys(ISLAND_INFO).join(', ')}` },
    }
  }

  // Emit a destination card alongside the tool_result data. This is the
  // only tool that pairs a knowledge payload (read by Claude for prose)
  // with a UI card — the data is structured enough to render directly
  // without Claude needing to compose a card-data fence.
  const card: CardData = {
    card_type: 'destination',
    name: (info.name as string) ?? islandId,
    island_id: islandId,
    tagline: (info.tagline as string) ?? undefined,
    photo_url: ISLAND_PHOTOS[islandId],
    highlights: (info.highlights as string[] | undefined) ?? [],
    rating: (info.rating as number | undefined) ?? 4.5,
    best_months: (info.best_months as string[] | undefined) ?? undefined,
    getting_there: (info.getting_there as string | undefined) ?? undefined,
    days_recommended: (info.days_recommended as string | undefined) ?? undefined,
  }

  return { data: info, cards: [card] }
}

// ──────────────────────────────────────────────────────────────────────────
// DISPATCHER
// ──────────────────────────────────────────────────────────────────────────

/**
 * Execute a single tool call. Returns the data to feed back to Claude as
 * tool_result AND any cards the server should emit to the UI.
 */
export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string | null,
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'get_hotels':              return await getHotels(supabase, toolInput)
      case 'get_restaurants':         return await getRestaurants(supabase, toolInput)
      case 'get_activities':          return await getActivities(supabase, toolInput)
      case 'search_flights':          return await searchFlights(toolInput)
      case 'get_trip_details':        return await getTripDetails(supabase, toolInput.trip_id as string)
      case 'get_user_profile': {
        if (!userId) return { data: { error: 'No authenticated user — cannot load profile.' } }
        return await getUserProfile(supabase, userId)
      }
      case 'create_itinerary_item':   return await createItineraryItem(supabase, toolInput)
      case 'get_weather':             return await getWeather(toolInput.island_id as string)
      case 'get_island_info':         return getIslandInfo(toolInput.island_id as string)
      default:
        return { data: { error: `Unknown tool: ${toolName}` } }
    }
  } catch (err) {
    console.error(`[executeTool ${toolName}]`, err)
    return { data: { error: `Tool execution failed: ${String(err)}` } }
  }
}

/**
 * Human-readable progress label sent to the UI when a tool starts. Mobile
 * shows these inline with the Buddy avatar's "thinking" state.
 */
export function toolProgressLabel(toolName: string): string {
  switch (toolName) {
    case 'get_hotels':            return 'Searching hotels…'
    case 'get_restaurants':       return 'Finding restaurants…'
    case 'get_activities':        return 'Browsing activities…'
    case 'search_flights':        return 'Checking flights…'
    case 'get_trip_details':      return 'Pulling up your trip…'
    case 'get_user_profile':      return 'Reviewing your preferences…'
    case 'create_itinerary_item': return 'Adding to your itinerary…'
    case 'get_weather':           return 'Checking the weather…'
    case 'get_island_info':       return 'Looking up island details…'
    default:                      return 'Working on it…'
  }
}
