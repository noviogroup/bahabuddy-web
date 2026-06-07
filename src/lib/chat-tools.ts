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
 *   3. Flights: identical to mobile — direct Duffel API call with the
 *      DUFFEL_API_TOKEN env var. Returns graceful "unavailable" if missing.
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
 *      the corresponding detail page at /hotels/[id], /restaurants/[id], or
 *      /activities/[id]. Flights are intentionally non-linking — Duffel
 *      offers are time-sensitive and have no stable URL.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CardData } from '@/components/RichCards'

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
    description: 'Search for restaurants and dining options on a specific Bahamas island. Use when the user asks about food, dining, restaurants, cafes, bars, where to eat, or cuisine. ALWAYS call this instead of making up restaurant names.',
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
    description: 'Search for flights to the Bahamas. Use when the user asks about flights, airfare, getting to the Bahamas, or travel from their home city. Queries the Duffel API for real-time pricing.',
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

const ISLAND_COORDS: Record<string, { lat: number; lng: number }> = {
  'nassau':          { lat: 25.0343, lng: -77.3963 },
  'paradise-island': { lat: 25.0862, lng: -77.3206 },
  'exuma':           { lat: 23.6282, lng: -75.7689 },
  'eleuthera':       { lat: 25.1397, lng: -76.1495 },
  'harbour-island':  { lat: 25.5014, lng: -76.6341 },
  'andros':          { lat: 24.7083, lng: -77.7753 },
  'grand-bahama':    { lat: 26.6287, lng: -78.3508 },
  'bimini':          { lat: 25.7267, lng: -79.2662 },
  'long-island':     { lat: 23.1500, lng: -75.0833 },
  'abacos':          { lat: 26.3500, lng: -77.1500 },
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
  'miami': 'MIA', 'fort lauderdale': 'FLL', 'new york': 'JFK', 'jfk': 'JFK',
  'newark': 'EWR', 'laguardia': 'LGA', 'atlanta': 'ATL', 'charlotte': 'CLT',
  'dallas': 'DFW', 'houston': 'IAH', 'chicago': 'ORD', 'los angeles': 'LAX',
  'san francisco': 'SFO', 'boston': 'BOS', 'philadelphia': 'PHL',
  'washington': 'IAD', 'dc': 'IAD', 'orlando': 'MCO', 'tampa': 'TPA',
  'detroit': 'DTW', 'denver': 'DEN', 'seattle': 'SEA', 'toronto': 'YYZ',
  'london': 'LHR', 'nassau': 'NAS', 'freeport': 'FPO',
}

function resolveAirportCode(input: string): string | null {
  if (!input) return null
  const clean = input.trim()
  if (/^[A-Z]{3}$/i.test(clean)) return clean.toUpperCase()
  const lower = clean.toLowerCase()
  if (CITY_TO_IATA[lower]) return CITY_TO_IATA[lower]
  for (const [city, code] of Object.entries(CITY_TO_IATA)) {
    if (lower.includes(city) || city.includes(lower)) return code
  }
  return null
}

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Foggy', 51: 'Light drizzle', 53: 'Moderate drizzle',
  55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
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
  // detail page (/hotels/[id]). The renderer falls back to non-linking
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
    .gte('user_ratings_total', 5)
    .order('rating', { ascending: false })

  if (args.cuisine_type) {
    query = query.ilike('cuisine_type', `%${args.cuisine_type}%`)
  }
  if (args.price_range) {
    const levels = PRICE_LEVEL_MAP[args.price_range as string]
    if (levels) query = query.in('price_level', levels)
  }

  const limit = Math.min(Number(args.limit) || 5, 10)
  query = query.limit(limit)

  const { data, error } = await query

  if (error) {
    return { data: { error: `Restaurant search failed: ${error.message}`, results: [] } }
  }

  if (!data || data.length === 0) {
    return {
      data: {
        results: [],
        message: `No restaurants found on ${ISLAND_DISPLAY[args.island_id as string] ?? args.island_id} matching your criteria.`,
      },
    }
  }

  const placeIds = data.map(p => p.place_id as string).filter(Boolean)
  const reviewsByPlace = await fetchTopReviews(supabase, placeIds)

  const compact = data.map(p => ({
    place_id: p.place_id,
    name: p.name,
    island: p.island_id,
    cuisine: p.cuisine_type,
    rating: p.rating,
    price_level: p.price_level,
    description: p.description,
  }))

  const cards: CardData[] = data.map(p => {
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

  return { data: { results: compact, count: data.length }, cards }
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
  const DUFFEL_TOKEN = process.env.DUFFEL_API_TOKEN || process.env.DUFFEL_API_KEY
  if (!DUFFEL_TOKEN) {
    return {
      data: {
        error: 'Flight search is not configured on this environment yet. Tell the user you can describe typical routes and prices from your knowledge, but live booking isn\'t available right now.',
        results: [],
      },
    }
  }

  const originCode = resolveAirportCode((args.origin_city as string) || '')
  const destCode = ((args.destination as string) || 'NAS').toUpperCase()
  const passengers = Number(args.passengers) || 1
  const cabinClass = (args.cabin_class as string) || 'economy'

  if (!originCode) {
    return {
      data: {
        error: `Could not resolve airport code for "${args.origin_city}". Try a 3-letter IATA code like MIA, JFK, ATL.`,
        results: [],
      },
    }
  }

  const slices: Array<{ origin: string; destination: string; departure_date: string }> = [
    { origin: originCode, destination: destCode, departure_date: args.departure_date as string },
  ]
  if (args.return_date) {
    slices.push({ origin: destCode, destination: originCode, departure_date: args.return_date as string })
  }

  try {
    const response = await fetch('https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=15000', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DUFFEL_TOKEN}`,
        'Content-Type': 'application/json',
        'Duffel-Version': 'v2',
      },
      body: JSON.stringify({
        data: {
          slices,
          passengers: Array.from({ length: passengers }, () => ({ type: 'adult' })),
          cabin_class: cabinClass,
          max_connections: 2,
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[search_flights] Duffel ${response.status}:`, errText)
      return { data: { error: `Duffel API returned ${response.status}`, results: [] } }
    }

    const json = await response.json()
    const offers: Array<Record<string, unknown>> = json?.data?.offers ?? []

    if (offers.length === 0) {
      return {
        data: {
          results: [],
          message: `No flights found from ${originCode} to ${destCode} on ${args.departure_date}. Try different dates or another airport.`,
        },
      }
    }

    const sorted = offers
      .filter(o => o.total_amount)
      .sort((a, b) => parseFloat(a.total_amount as string) - parseFloat(b.total_amount as string))
      .slice(0, 5)

    const cards: CardData[] = []
    const compact: Array<Record<string, unknown>> = []

    for (const offer of sorted) {
      const sliceData = (offer.slices as Array<Record<string, unknown>>) ?? []
      const outbound = sliceData[0]
      const segments = (outbound?.segments as Array<Record<string, unknown>>) ?? []
      const firstSeg = segments[0] ?? {}
      const lastSeg = segments[segments.length - 1] ?? {}
      const airline =
        ((firstSeg.operating_carrier as Record<string, unknown> | undefined)?.name as string) ||
        ((firstSeg.marketing_carrier as Record<string, unknown> | undefined)?.name as string) ||
        'Airline'
      const stops = segments.length - 1
      const dep = (firstSeg.departing_at as string) ?? ''
      const arr = (lastSeg.arriving_at as string) ?? ''

      let duration = (outbound?.duration as string) ?? ''
      if (duration.startsWith('PT')) {
        const hMatch = duration.match(/(\d+)H/)
        const mMatch = duration.match(/(\d+)M/)
        const h = hMatch ? parseInt(hMatch[1]) : 0
        const m = mMatch ? parseInt(mMatch[1]) : 0
        duration = h > 0 ? `${h}h ${m}m` : `${m}m`
      }

      const depTime = dep
        ? new Date(dep).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        : ''
      const arrTime = arr
        ? new Date(arr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        : ''
      const originName = ((firstSeg.origin as Record<string, unknown> | undefined)?.iata_code as string) ?? originCode
      const destName = ((lastSeg.destination as Record<string, unknown> | undefined)?.iata_code as string) ?? destCode

      const price = Math.round(parseFloat(offer.total_amount as string))
      const stopsLabel = stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`
      const route = `${originName} → ${destName}`

      // ── Phase 5 enrichments: cabin class, layovers, baggage ────────────
      //
      // Duffel nests passenger-specific data (cabin, baggage) inside each
      // segment, not on the offer. We read from the first segment's first
      // passenger — same across passengers for the cards we render.
      const firstSegPassengers = (firstSeg.passengers as Array<Record<string, unknown>> | undefined) ?? []
      const firstPax = firstSegPassengers[0] ?? {}
      const cabinClassRaw =
        (firstPax.cabin_class_marketing_name as string | undefined) ||
        (firstPax.cabin_class as string | undefined) ||
        cabinClass
      const cabinClassDisplay = cabinClassRaw
        ? cabinClassRaw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : undefined

      // Layovers: the gap between segment[i].arriving_at and
      // segment[i+1].departing_at, located at segment[i].destination.
      // Skip when either timestamp is missing — a malformed offer
      // shouldn't take the whole card down.
      const layovers: { airport: string; duration: string }[] = []
      for (let i = 0; i < segments.length - 1; i++) {
        const cur = segments[i]
        const next = segments[i + 1]
        const arrAt = cur.arriving_at as string | undefined
        const depAt = next.departing_at as string | undefined
        const layoverAirport = ((cur.destination as Record<string, unknown> | undefined)?.iata_code as string | undefined)
        if (!arrAt || !depAt || !layoverAirport) continue
        const layoverMs = new Date(depAt).getTime() - new Date(arrAt).getTime()
        if (!isFinite(layoverMs) || layoverMs <= 0) continue
        const layoverMins = Math.round(layoverMs / 60_000)
        const h = Math.floor(layoverMins / 60)
        const m = layoverMins % 60
        layovers.push({
          airport: layoverAirport,
          duration: h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`,
        })
      }

      // Baggage allowance from the first segment, first passenger.
      // Carry-on is a boolean ("allowed?"). Checked is summed quantity
      // across all checked-bag entries.
      const baggagesRaw = (firstPax.baggages as Array<Record<string, unknown>> | undefined) ?? []
      const carryOn = baggagesRaw.some(b => b.type === 'carry_on' && Number(b.quantity ?? 0) > 0)
      const checkedCount = baggagesRaw
        .filter(b => b.type === 'checked')
        .reduce((sum, b) => sum + (Number(b.quantity ?? 0)), 0)
      const baggage = (baggagesRaw.length > 0)
        ? { carry_on: carryOn, checked: checkedCount }
        : undefined

      cards.push({
        card_type: 'flight',
        route,
        airline,
        departure: depTime,
        arrival: arrTime,
        duration,
        stops: stopsLabel,
        price,
        cabin_class: cabinClassDisplay,
        layovers: layovers.length > 0 ? layovers : undefined,
        baggage,
        duffel_offer_id: offer.id as string,
      })

      compact.push({
        duffel_offer_id: offer.id,
        route,
        airline,
        departure: depTime,
        arrival: arrTime,
        duration,
        stops: stopsLabel,
        price,
      })
    }

    return { data: { results: compact, count: compact.length }, cards }
  } catch (err) {
    console.error('Flight search error:', err)
    return { data: { error: `Flight search error: ${String(err)}`, results: [] } }
  }
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
  const coords = ISLAND_COORDS[islandId]
  if (!coords) return { data: { error: `Unknown island: ${islandId}` } }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=America/Nassau&forecast_days=7&temperature_unit=fahrenheit`
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return { data: { error: 'Weather service unavailable' } }
    const data = await response.json()

    return {
      data: {
        island: islandId,
        current: {
          temperature_f: data.current?.temperature_2m,
          humidity: data.current?.relative_humidity_2m,
          wind_speed_mph: data.current?.wind_speed_10m,
          condition: WEATHER_CODES[data.current?.weather_code as number] ?? 'Unknown',
        },
        forecast: (data.daily?.time as string[] | undefined)?.map((date, i) => ({
          date,
          high_f: data.daily.temperature_2m_max[i],
          low_f: data.daily.temperature_2m_min[i],
          rain_chance: data.daily.precipitation_probability_max[i],
          condition: WEATHER_CODES[data.daily.weather_code[i] as number] ?? 'Unknown',
        })),
      },
    }
  } catch (err) {
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
