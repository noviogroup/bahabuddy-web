/**
 * chat-tools.ts — Claude tool definitions + executors + card transforms for the web.
 *
 * Mobile reference: /Baha-Buddy-V2/supabase/functions/claude-chat-proxy/tools.ts
 *
 * Architectural choices for the web port (intentional deviations from mobile,
 * all documented inline):
 *
 *   1. Hotels: read from the canonical Supabase `hotels` inventory table for
 *      browse/chat cards, then hand off to the LiteAPI-backed booking routes
 *      for live rates, prebook, and booking.
 *
 *   2. Restaurants/activities: web reads Supabase-backed canonical/cached
 *      place inventory for browse quality. Compatibility table names are
 *      storage details, not traveler-facing provider labels.
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
 *      carries a stable source id in `place_id`. For hotels this is the
 *      canonical `hotels.id`; for restaurants/activities it is the canonical
 *      or cached/source place id. Clicking the card opens /stays/[id],
 *      /restaurants/[id], or /activities/[id]. Flight cards carry LiteAPI
 *      offer IDs for direct booking at /flights/[offerId]/book.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardData } from "@/components/RichCards";
import { resolveAirlineLogoUrl } from "@/lib/airline-logos";
import { stayIslandFilterAliases } from "@/lib/stay-island-filters";
import { callTravelProvider } from "@/lib/travel-booking/provider";
import { fetchIslandWeather, WeatherProviderError } from "@/lib/weather";
import { inventoryGrounding } from "@/lib/buddy-inventory-contract";
import {
  BAHAMAS_COORDINATE_BOUNDS,
  CANONICAL_ATTRACTION_NOTE,
  MAX_BUDDY_ACTIVITY_OPTIONS,
  approvedActivityCard,
  approvedActivityEmptyMessage,
  canonicalAttractionCard,
  getApprovedActivities,
  getCanonicalAttractionActivities,
  isApprovedTourRow,
} from "@/lib/approved-activities";
import { normalizeCanonicalIslandSlug } from "@/lib/bahamas-island-bounds";

// Same canonical table the web and mobile catalog screens read, so Buddy can
// discuss every place the app shows (photo-less rows included).
const GROUNDED_PLACE_INVENTORY_TABLE = "places";

// ──────────────────────────────────────────────────────────────────────────
// TOOL DEFINITIONS (sent to Claude)
// ──────────────────────────────────────────────────────────────────────────

export const TOOL_DEFINITIONS = [
  {
    name: "get_hotels",
    description:
      "Search for hotels and accommodations on a specific Bahamas island. Use when the user asks about where to stay, accommodations, hotels, resorts, or villas. ALWAYS call this instead of making up hotel names. Returns curated Bahamas lodging from the database.",
    input_schema: {
      type: "object",
      properties: {
        island_id: {
          type: "string",
          description:
            "Canonical island slug or common alias. The backend validates it through the shared island resolver.",
        },
        price_range: {
          type: "string",
          enum: ["budget", "moderate", "upscale", "fine-dining"],
          description: "Price tier filter",
        },
        min_rating: {
          type: "number",
          description:
            "Minimum guest rating on a 0-5 scale (e.g. 4.0 for highly rated).",
        },
        limit: {
          type: "integer",
          description: "Max results (default 5, max 10)",
        },
      },
      required: ["island_id"],
    },
  },

  {
    name: "get_restaurants",
    description:
      "Search for quality restaurants and dining options on a specific Bahamas island. Use when the user asks about food, dining, restaurants, cafes, bars, where to eat, or cuisine. Results are filtered to avoid generic delis, convenience food spots, and chain-style low-signal records. ALWAYS call this instead of making up restaurant names.",
    input_schema: {
      type: "object",
      properties: {
        island_id: {
          type: "string",
          description:
            "Canonical island slug or common alias. The backend validates it through the shared island resolver.",
        },
        cuisine_type: {
          type: "string",
          description:
            "Cuisine filter: bahamian, seafood, italian, international, american, asian, caribbean",
        },
        price_range: {
          type: "string",
          enum: ["budget", "moderate", "upscale", "fine-dining"],
          description: "Price tier filter",
        },
        limit: {
          type: "integer",
          description: "Max results (default 5)",
        },
      },
      required: ["island_id"],
    },
  },

  {
    name: "get_activities",
    description:
      "Search for tours, activities, and experiences on a specific Bahamas island. Use when the user asks about what to do, tours, excursions, snorkeling, fishing, cultural experiences, nightlife, or any activity. ALWAYS call this instead of making up activity names.",
    input_schema: {
      type: "object",
      properties: {
        island_id: {
          type: "string",
          description:
            "Canonical island slug or common alias. The backend validates it through the shared island resolver.",
        },
        vibe_tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Filter by vibe: beach, adventure, culture, nightlife, romance, family, foodie, water-sports, luxury, fishing",
        },
        kid_friendly: {
          type: "boolean",
          description:
            "Only return kid-friendly activities. Set true when the user has children.",
        },
        limit: {
          type: "integer",
          description: "Max results (default 5)",
        },
      },
      required: ["island_id"],
    },
  },

  {
    name: "search_flights",
    description:
      "Search for flights to the Bahamas. Use when the user asks about flights, airfare, getting to the Bahamas, or travel from their home city. Queries LiteAPI for beta real-time pricing and offer IDs.",
    input_schema: {
      type: "object",
      properties: {
        origin_city: {
          type: "string",
          description:
            'Departure city or 3-letter IATA airport code (e.g. "Miami" or "MIA")',
        },
        destination: {
          type: "string",
          enum: ["NAS", "EXU", "ELH", "FPO", "GHB", "BIM", "ASD", "MHH"],
          description:
            "Bahamas airport code. NAS=Nassau, EXU=Exuma, ELH=Eleuthera, FPO=Freeport, GHB=Governors Harbour, BIM=Bimini, ASD=Andros, MHH=Abacos",
        },
        departure_date: {
          type: "string",
          description:
            "Departure date YYYY-MM-DD. Must be today or in the future.",
        },
        return_date: {
          type: "string",
          description: "Return date YYYY-MM-DD (omit for one-way)",
        },
        passengers: {
          type: "integer",
          description: "Number of passengers (default 1)",
        },
        cabin_class: {
          type: "string",
          enum: ["economy", "premium_economy", "business", "first"],
          description: "Cabin class preference",
        },
      },
      required: ["origin_city", "destination", "departure_date"],
    },
  },

  {
    name: "get_trip_details",
    description:
      'Retrieve the current trip state including accommodations, flights, activities, and budget. Use when the user asks about "my trip," wants to review their plan, or you need context about what has already been planned.',
    input_schema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description:
            "The trip UUID. Use the active trip from user context if not specified.",
        },
      },
      required: ["trip_id"],
    },
  },

  {
    name: "get_user_profile",
    description:
      "Retrieve detailed user preferences, travel history, and engagement data. Use when you need more context about the user beyond what is in the system context.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },

  {
    name: "create_itinerary_item",
    description:
      'Add an activity, restaurant, or experience to the user\'s trip timeline. Use when the user says "add this", "book this", "put this on day 3", or confirms they want something in their itinerary.',
    input_schema: {
      type: "object",
      properties: {
        trip_id: {
          type: "string",
          description: "The trip UUID",
        },
        day_number: {
          type: "integer",
          description: "Which day of the trip (1-indexed)",
        },
        time_slot: {
          type: "string",
          enum: ["morning", "afternoon", "evening"],
          description: "Time slot for the activity",
        },
        activity_type: {
          type: "string",
          enum: ["hotel", "restaurant", "activity", "flight", "transport"],
          description: "Type of itinerary item",
        },
        name: {
          type: "string",
          description: "Name of the place or activity",
        },
        notes: {
          type: "string",
          description: "Optional notes or special instructions",
        },
      },
      required: ["trip_id", "day_number", "time_slot", "activity_type", "name"],
    },
  },

  {
    name: "get_weather",
    description:
      "Get current weather and 7-day forecast for a Bahamas island. Use when the user asks about weather, temperature, rain, or what to pack.",
    input_schema: {
      type: "object",
      properties: {
        island_id: {
          type: "string",
          description:
            "Canonical island slug or common alias. The backend validates it through the shared island resolver.",
        },
      },
      required: ["island_id"],
    },
  },

  {
    name: "get_destination_context",
    description:
      "Search approved, source-backed Baha Buddy destination knowledge. Use before answering general island, culture, history, seasonality, access, safety, accessibility, or traveler-fit questions. Never fill a missing result from model memory.",
    input_schema: {
      type: "object",
      properties: {
        island_slug: {
          type: "string",
          description:
            "Canonical island slug or common alias. The backend resolves it through the shared island registry.",
        },
        query: {
          type: "string",
          description:
            "Traveler question or short description of the information needed.",
        },
        topic: {
          type: "string",
          enum: [
            "overview",
            "access",
            "stays",
            "food",
            "experiences",
            "nature",
            "culture",
            "seasonality",
            "safety",
            "accessibility",
          ],
          description: "Optional controlled topic used to narrow retrieval.",
        },
        limit: {
          type: "integer",
          description: "Maximum approved records (default 6, maximum 12).",
        },
      },
      required: ["island_slug", "query"],
    },
  },

  {
    name: "search_island_faq",
    description:
      "Search the admin-curated island knowledge base for current practical Bahamas guidance. Use for entry rules, customs, transportation, money, safety, connectivity, medical help, boating, accessibility, and local etiquette instead of relying on model memory.",
    input_schema: {
      type: "object",
      properties: {
        island_slug: {
          type: "string",
          description:
            "Canonical island slug or alias. The backend validates it through the shared island resolver.",
        },
        category: {
          type: "string",
          description: "Optional exact FAQ category.",
        },
        keyword: {
          type: "string",
          description: "Optional keyword to match in FAQ questions.",
        },
        limit: {
          type: "integer",
          description: "Max results (default 5, max 10).",
        },
      },
      required: ["island_slug"],
    },
  },
] as const;

const ISLAND_SCOPED_TOOLS = new Set([
  "get_hotels",
  "get_restaurants",
  "get_activities",
  "get_weather",
  "get_destination_context",
  "search_island_faq",
]);
const CANONICAL_INVENTORY_ISLAND_IDS: Record<string, string[]> = {
  "nassau-paradise-island": ["nassau", "paradise-island"],
  "the-exumas": ["exuma", "the-exumas"],
  "eleuthera-harbour-island": ["eleuthera", "harbour-island"],
  "grand-bahama": ["grand-bahama", "freeport"],
  abacos: ["abacos", "abaco"],
};

/** places.island_id stores the canonical slug ("nassau-paradise-island");
 * aliases such as "nassau" resolve to it, legacy ids are kept alongside. */
export function canonicalInventoryIslandIds(value: unknown): string[] {
  const canonical = normalizeCanonicalIslandSlug(
    typeof value === "string" ? value : "",
  );
  if (!canonical) return [];
  return Array.from(
    new Set([canonical, ...(CANONICAL_INVENTORY_ISLAND_IDS[canonical] ?? [])]),
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SHARED REFERENCE DATA
// ──────────────────────────────────────────────────────────────────────────

const ISLAND_DISPLAY: Record<string, string> = {
  nassau: "Nassau",
  "paradise-island": "Paradise Island",
  exuma: "Exuma",
  eleuthera: "Eleuthera",
  "harbour-island": "Harbour Island",
  andros: "Andros",
  "grand-bahama": "Grand Bahama",
  bimini: "Bimini",
  "long-island": "Long Island",
  abacos: "The Abacos",
  "nassau-paradise-island": "Nassau & Paradise Island",
  "the-exumas": "The Exumas",
  "eleuthera-harbour-island": "Eleuthera & Harbour Island",
  "cat-island": "Cat Island",
  inagua: "Inagua",
  "berry-islands": "The Berry Islands",
  "san-salvador": "San Salvador",
  "rum-cay": "Rum Cay",
  "acklins-crooked-island": "Acklins & Crooked Island",
  mayaguana: "Mayaguana",
  "ragged-island": "Ragged Island",
};

const HOTEL_ISLAND_ALIASES: Record<string, string[]> = {
  nassau: ["Nassau", "New Providence", "Paradise Island"],
  "paradise-island": ["Paradise Island", "New Providence", "Nassau"],
  exuma: ["Exuma", "The Exumas"],
  eleuthera: ["Eleuthera"],
  "harbour-island": ["Harbour Island", "Harbor Island", "Dunmore Town"],
  andros: ["Andros"],
  "grand-bahama": ["Grand Bahama", "Freeport"],
  bimini: ["Bimini"],
  "long-island": ["Long Island"],
  abacos: ["Abaco", "Abacos", "The Abacos"],
  "nassau-paradise-island": ["Nassau", "New Providence", "Paradise Island"],
  "the-exumas": ["Exuma", "The Exumas"],
  "eleuthera-harbour-island": ["Eleuthera", "Harbour Island", "Spanish Wells"],
  "cat-island": ["Cat Island"],
  inagua: ["Inagua", "Great Inagua"],
  "berry-islands": ["Berry Islands", "Great Harbour Cay", "Chub Cay"],
  "san-salvador": ["San Salvador"],
  "rum-cay": ["Rum Cay"],
  "acklins-crooked-island": ["Acklins", "Crooked Island", "Long Cay"],
  mayaguana: ["Mayaguana"],
  "ragged-island": ["Ragged Island"],
};

// places.price_level is "$" … "$$$$" text, sometimes a range ("$$ - $$$").
const PRICE_LEVEL_TEXT_MAP: Record<string, string[]> = {
  budget: ["$", "$ - $$"],
  moderate: ["$$", "$ - $$", "$$ - $$$"],
  upscale: ["$$$", "$$ - $$$", "$$$ - $$$$"],
  luxury: ["$$$$", "$$$ - $$$$"],
  "fine-dining": ["$$$", "$$$$", "$$$ - $$$$"],
};

/** Card glyph level (1-4) from a text or numeric price level; the upper bound
 * of a range wins. Unknown stays undefined so no price tier is invented. */
export function priceLevelNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.min(4, Math.round(value));
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.min(4, Math.round(numeric));
  }
  const upper = value.split(/[-–]/).pop() ?? "";
  const dollars = (upper.match(/\$/g) ?? []).length;
  return dollars > 0 ? Math.min(4, dollars) : undefined;
}

const RESTAURANT_MIN_REVIEW_COUNT = 15;
const RESTAURANT_MIN_RATING = 4.0;
const RESTAURANT_EXCLUDED_NAME_TERMS = [
  "brandon",
  "deli",
  "mini mart",
  "minimart",
  "convenience",
  "grocery",
  "supermarket",
  "liquor",
  "gas station",
  "service station",
  "food store",
  "wholesale",
  "pharmacy",
  "marco",
  "domino",
  "kfc",
  "mcdonald",
  "burger king",
  "wendy",
  "subway",
  "popeyes",
  "dunkin",
  "starbucks",
];

const RESTAURANT_EXCLUDED_CUISINE_TERMS = ["deli", "fast food", "convenience"];

function textValue(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

export function isQualityRestaurantCandidate(
  place: Record<string, unknown>,
): boolean {
  const name = textValue(place.name);
  if (!name) return false;
  if (RESTAURANT_EXCLUDED_NAME_TERMS.some((term) => name.includes(term))) {
    return false;
  }

  const cuisine = textValue(place.cuisine_type);
  if (
    RESTAURANT_EXCLUDED_CUISINE_TERMS.some((term) => cuisine.includes(term))
  ) {
    return false;
  }

  const rating =
    typeof place.rating === "number" ? place.rating : Number(place.rating ?? 0);
  if (!Number.isFinite(rating) || rating < RESTAURANT_MIN_RATING) {
    return false;
  }

  const reviewCount =
    typeof place.user_ratings_total === "number"
      ? place.user_ratings_total
      : Number(place.user_ratings_total ?? 0);
  if (
    !Number.isFinite(reviewCount) ||
    reviewCount < RESTAURANT_MIN_REVIEW_COUNT
  ) {
    return false;
  }

  // Photo-less restaurants stay eligible (cards show a placeholder), so
  // Buddy can recommend everything the catalog lists.
  return true;
}

const CITY_TO_IATA: Record<string, string> = {
  miami: "MIA",
  "fort lauderdale": "FLL",
  "west palm beach": "PBI",
  "palm beach": "PBI",
  "new york": "JFK",
  jfk: "JFK",
  newark: "EWR",
  laguardia: "LGA",
  atlanta: "ATL",
  charlotte: "CLT",
  raleigh: "RDU",
  "raleigh durham": "RDU",
  baltimore: "BWI",
  nashville: "BNA",
  dallas: "DFW",
  houston: "IAH",
  "houston hobby": "HOU",
  chicago: "ORD",
  "los angeles": "LAX",
  "san francisco": "SFO",
  boston: "BOS",
  philadelphia: "PHL",
  washington: "IAD",
  dc: "IAD",
  orlando: "MCO",
  tampa: "TPA",
  jacksonville: "JAX",
  "fort myers": "RSW",
  "new orleans": "MSY",
  detroit: "DTW",
  denver: "DEN",
  seattle: "SEA",
  minneapolis: "MSP",
  phoenix: "PHX",
  "las vegas": "LAS",
  "san diego": "SAN",
  portland: "PDX",
  toronto: "YYZ",
  montreal: "YUL",
  vancouver: "YVR",
  london: "LHR",
  nassau: "NAS",
  freeport: "FPO",
};

function resolveAirportCode(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();
  if (/^[A-Z]{3}$/i.test(clean)) return clean.toUpperCase();
  const lower = normalizeAirportLookup(clean);
  if (CITY_TO_IATA[lower]) return CITY_TO_IATA[lower];
  for (const [city, code] of Object.entries(CITY_TO_IATA)) {
    if (lower.includes(city) || city.includes(lower)) return code;
  }
  return null;
}

function normalizeAirportLookup(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[-/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ──────────────────────────────────────────────────────────────────────────
// TOOL EXECUTORS
// ──────────────────────────────────────────────────────────────────────────

export interface ToolResult {
  /** Tool result data passed back to Claude as tool_result content. */
  data: unknown;
  /** Optional concrete cards to emit to the UI via the `cards` SSE event. */
  cards?: CardData[];
}

/**
 * Shape of a single photo entry in the cached place inventory photos JSONB.
 * This mirrors the backend-enriched cached place details payload.
 */
/** Canonical gallery entries are owned/licensed URLs, never cached provider
 * references. Keep only explicit HTTP(S) URLs. */
function buildCanonicalPhotoGallery(
  primary: unknown,
  gallery: unknown,
): string[] {
  const urls = new Set<string>();
  const first = validHttpUrl(primary);
  if (first) urls.add(first);
  if (Array.isArray(gallery)) {
    for (const item of gallery) {
      const direct = validHttpUrl(item);
      const nested =
        item && typeof item === "object"
          ? validHttpUrl((item as Record<string, unknown>).url)
          : null;
      if (direct) urls.add(direct);
      if (nested) urls.add(nested);
    }
  }
  return Array.from(urls);
}

function validHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function buildHotelPhotoGallery(
  mainPhotoUrl: unknown,
  photos: unknown,
): string[] {
  const urls = new Set<string>();
  const main = validHttpUrl(mainPhotoUrl);
  if (main) urls.add(main);

  if (Array.isArray(photos)) {
    for (const photo of photos) {
      const direct = validHttpUrl(photo);
      if (direct) {
        urls.add(direct);
        continue;
      }

      if (photo && typeof photo === "object") {
        const record = photo as Record<string, unknown>;
        const url = validHttpUrl(record.url ?? record.image_url);
        if (url) {
          urls.add(url);
          continue;
        }
      }
    }
  }

  return Array.from(urls);
}

function escapePostgrestOrValue(value: string): string {
  return value.replace(/[(),]/g, " ");
}

function hotelIslandAliases(islandId: unknown): string[] {
  if (typeof islandId !== "string") return [];
  const displayOrRaw = ISLAND_DISPLAY[islandId] ?? islandId;
  const configured = HOTEL_ISLAND_ALIASES[islandId] ?? [displayOrRaw];
  return Array.from(
    new Set(
      [
        ...configured,
        ...stayIslandFilterAliases(islandId),
        ...stayIslandFilterAliases(displayOrRaw),
      ]
        .map((alias) => alias.trim())
        .filter(Boolean),
    ),
  );
}

type HotelInventoryRow = {
  id: string;
  name: string | null;
  city: string | null;
  island: string | null;
  address: string | null;
  star_rating: number | null;
  review_score: number | null;
  review_count: number | null;
  main_photo_url: string | null;
  photos: unknown;
  amenities: string[] | null;
  property_type_name: string | null;
  description: string | null;
};

export async function getHotels(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  let query = supabase
    .from("hotels")
    .select(
      "id, name, city, island, address, star_rating, review_score, review_count, main_photo_url, photos, amenities, property_type_name, description",
    )
    .eq("is_active", true)
    .order("star_rating", { ascending: false, nullsFirst: false })
    .order("review_score", { ascending: false, nullsFirst: false })
    .order("review_count", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });

  const aliases = hotelIslandAliases(args.island_id);
  if (aliases.length > 0) {
    query = query.or(
      aliases
        .map((value) => `island.ilike.%${escapePostgrestOrValue(value)}%`)
        .join(","),
    );
  }

  if (args.price_range) {
    const priceRange = args.price_range as string;
    if (priceRange === "budget") query = query.lte("star_rating", 3);
    if (priceRange === "moderate")
      query = query.gte("star_rating", 3).lte("star_rating", 4);
    if (priceRange === "upscale" || priceRange === "fine-dining")
      query = query.gte("star_rating", 4);
  }
  if (args.min_rating) {
    const minRating = Number(args.min_rating);
    if (Number.isFinite(minRating)) {
      query = query.gte(
        "review_score",
        minRating > 5 ? minRating : minRating * 2,
      );
    }
  }

  const limit = Math.min(Number(args.limit) || 5, 10);
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    return {
      data: { error: `Hotel search failed: ${error.message}`, results: [] },
    };
  }

  if (!data || data.length === 0) {
    return {
      data: {
        results: [],
        message: `No hotels found on ${ISLAND_DISPLAY[args.island_id as string] ?? args.island_id} matching your criteria. Try a different island or relax the filters.`,
      },
    };
  }

  const rows = data as HotelInventoryRow[];

  // Compact data for Claude
  const compact = rows.map((p) => ({
    place_id: p.id,
    provider_hotel_id: p.id,
    name: p.name,
    island: p.island,
    city: p.city,
    rating: p.review_score,
    stars: p.star_rating,
    review_count: p.review_count,
    property_type: p.property_type_name,
    amenities: p.amenities ?? [],
    description: p.description,
  }));

  // Cards for the UI: hotels use the canonical `hotels.id` as `place_id`,
  // so chat cards open the same /stays/[hotelId] detail route as the public
  // stays feed. Live rates still come from the LiteAPI booking routes.
  const cards: CardData[] = rows.map((p) => {
    const gallery = buildHotelPhotoGallery(p.main_photo_url, p.photos);
    return {
      card_type: "hotel" as const,
      place_id: p.id,
      name: p.name ?? "Hotel",
      island: p.island ?? p.city ?? undefined,
      island_id:
        typeof args.island_id === "string" ? args.island_id : undefined,
      rating: p.review_score ?? 0,
      stars: p.star_rating ?? undefined,
      review_count: p.review_count ?? 0,
      photo_url: gallery[0] ?? undefined,
      photos: gallery,
      amenities: p.amenities ?? [],
      full_address: p.address ?? undefined,
      description: p.description ?? undefined,
    };
  });

  return { data: { results: compact, count: rows.length }, cards };
}

async function getRestaurants(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  // Buddy reads the same canonical rows the web and mobile catalogs list.
  let query = supabase
    .from(GROUNDED_PLACE_INVENTORY_TABLE)
    .select(
      "place_id:id, name, category, type:category, island_id, rating, review_count, user_ratings_total:review_count, address, phone, website, price_level, primary_image_url, photo_url:primary_image_url, gallery_images, photos:gallery_images, opening_hours, description, short_description, subcategory, cuisine_type:subcategory, tags, updated_at",
    )
    .eq("is_active", true)
    .eq("status", "active")
    .eq("category", "restaurant")
    .in("island_id", canonicalInventoryIslandIds(args.island_id))
    .gte("latitude", BAHAMAS_COORDINATE_BOUNDS.minLatitude)
    .lte("latitude", BAHAMAS_COORDINATE_BOUNDS.maxLatitude)
    .gte("longitude", BAHAMAS_COORDINATE_BOUNDS.minLongitude)
    .lte("longitude", BAHAMAS_COORDINATE_BOUNDS.maxLongitude)
    .gte("rating", RESTAURANT_MIN_RATING)
    .gte("review_count", RESTAURANT_MIN_REVIEW_COUNT)
    .order("rating", { ascending: false });

  const cuisine =
    typeof args.cuisine_type === "string"
      ? args.cuisine_type.trim().replace(/[%_,()]/g, " ")
      : "";
  if (cuisine) {
    // cuisine_type is a select alias; filter on the real column.
    query = query.ilike("subcategory", `%${cuisine}%`);
  }
  if (args.price_range) {
    const levels = PRICE_LEVEL_TEXT_MAP[args.price_range as string];
    if (levels) query = query.in("price_level", levels);
  }

  const limit = Math.min(Number(args.limit) || 5, 10);
  query = query.limit(Math.min(limit * 4, 40));

  const { data, error } = await query;

  if (error) {
    return {
      data: {
        error: `Restaurant search failed: ${error.message}`,
        results: [],
        grounding: inventoryGrounding("provider_error"),
      },
    };
  }

  const filteredData = data
    ?.filter((p: Record<string, unknown>) => isQualityRestaurantCandidate(p))
    .slice(0, limit);

  if (!filteredData || filteredData.length === 0) {
    return {
      data: {
        results: [],
        message: `No restaurants found on ${ISLAND_DISPLAY[args.island_id as string] ?? args.island_id} matching your criteria.`,
        grounding: inventoryGrounding("no_evidence"),
      },
    };
  }

  const placeIds = filteredData
    .map((p) => p.place_id as string)
    .filter(Boolean);
  const compact = filteredData.map((p) => ({
    place_id: p.place_id,
    name: p.name,
    island: p.island_id,
    cuisine: p.cuisine_type,
    rating: p.rating,
    price_level: p.price_level,
    description: p.description ?? p.short_description,
  }));

  const cards: CardData[] = filteredData.map((p) => {
    const pid = p.place_id as string;
    const gallery = buildCanonicalPhotoGallery(p.photo_url, p.photos);
    const hours = Array.isArray(p.opening_hours)
      ? (p.opening_hours as string[])
      : undefined;
    return {
      card_type: "restaurant" as const,
      place_id: pid,
      name: p.name ?? "Restaurant",
      island: ISLAND_DISPLAY[p.island_id as string] ?? (p.island_id as string),
      island_id: p.island_id ?? undefined,
      cuisine: (p.cuisine_type as string | null) ?? "International",
      rating: p.rating ?? 0,
      review_count: p.user_ratings_total ?? 0,
      price_level: priceLevelNumber(p.price_level),
      photo_url: p.photo_url ?? gallery[0] ?? undefined,
      photos: gallery,
      phone: (p.phone as string | null) ?? undefined,
      website: (p.website as string | null) ?? undefined,
      full_address: (p.address as string | null) ?? undefined,
      opening_hours: hours,
    };
  });

  return {
    data: {
      results: compact,
      count: filteredData.length,
      grounding: inventoryGrounding("grounded", placeIds),
    },
    cards,
  };
}

async function getActivities(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const islandSlug =
    typeof args.island_id === "string" ? args.island_id.trim() : "";
  if (!islandSlug) {
    return {
      data: {
        error: "A canonical island is required.",
        results: [],
        grounding: inventoryGrounding("provider_error"),
      },
    };
  }
  try {
    const category =
      Array.isArray(args.vibe_tags) && args.vibe_tags.length === 1
        ? String(args.vibe_tags[0])
        : null;
    const rows = await getApprovedActivities(supabase, {
      islandSlug,
      category,
      limit: MAX_BUDDY_ACTIVITY_OPTIONS,
    });
    const eligible =
      args.kid_friendly === true
        ? rows.filter(
            (row) =>
              row.safety_access.kid_friendly === true ||
              row.safety_access.family_safe === true,
          )
        : rows;
    // Until reviewers approve non-tour activities, ground Buddy in the same
    // canonical attractions the site lists for this exact island; approved
    // self-guided tours fill any remaining slots.
    if (!eligible.some((row) => !isApprovedTourRow(row))) {
      const fallback = await canonicalAttractionFallback(
        supabase,
        islandSlug,
        eligible.map(approvedActivityCard),
        args,
      );
      if (fallback) return fallback;
    }
    const cards = eligible
      .slice(0, MAX_BUDDY_ACTIVITY_OPTIONS)
      .map(approvedActivityCard);
    if (cards.length === 0) {
      return {
        data: {
          results: [],
          message: approvedActivityEmptyMessage(islandSlug),
          exact_island_slug: islandSlug,
          grounding: inventoryGrounding("no_evidence"),
        },
      };
    }
    return {
      data: {
        results: cards,
        count: cards.length,
        exact_island_slug: islandSlug,
        grounding: inventoryGrounding(
          "grounded",
          cards.map((card) => card.activity_id),
        ),
      },
      cards,
    };
  } catch (error) {
    // The approved RPC may be undeployed or failing; canonical places still
    // ground the answer when they exist.
    const fallback = await canonicalAttractionFallback(
      supabase,
      islandSlug,
      [],
      args,
    );
    if (fallback) return fallback;
    return {
      data: {
        error:
          error instanceof Error
            ? error.message
            : "Approved activity inventory is unavailable.",
        results: [],
        grounding: inventoryGrounding("provider_error"),
      },
    };
  }
}

/** Search words per get_activities vibe; a canonical row matches a vibe when
 * any of its words appears in the listing's own text. */
const ACTIVITY_VIBE_KEYWORDS: Record<string, string[]> = {
  beach: ["beach", "sandbar"],
  adventure: ["adventure", "diving", "kayak", "shark", "cave", "eco"],
  culture: ["historic", "heritage", "culture", "cultural", "museum", "landmark"],
  nightlife: ["nightlife", "nightclub"],
  romance: ["romantic", "sunset", "honeymoon"],
  family: ["family", "families", "children", "kids"],
  foodie: ["food", "culinary", "conch"],
  "water-sports": ["snorkel", "diving", "scuba", "kayak", "sailing", "kiteboard", "paddle"],
  luxury: ["luxury", "yacht"],
  fishing: ["fishing", "bonefish"],
};

/** Transport, shopping and wellness services are catalog attractions but not
 * things to do; Buddy should not offer them as activities. */
const NON_ACTIVITY_SUBCATEGORY =
  /\b(taxi|shuttle|chauffeurs?|ferry|port gateway|grocery|provisioning|massage|wellness)\b/i;

const KID_FRIENDLY_UNVERIFIED_NOTE =
  "Kid suitability is not recorded for these listings: do not describe them as kid-friendly or family-safe.";

function activityVibeKeywords(args: Record<string, unknown>): string[] {
  const vibes = Array.isArray(args.vibe_tags)
    ? args.vibe_tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    : [];
  return vibes.flatMap(
    (vibe) => ACTIVITY_VIBE_KEYWORDS[vibe] ?? vibe.split(/[^a-z0-9]+/),
  );
}

/** Canonical attractions for the exact island (mobile parity: island-only,
 * review_count >= 5), narrowed to the requested vibes. Returns null when the
 * catalog has no match. */
async function canonicalAttractionFallback(
  supabase: SupabaseClient,
  islandSlug: string,
  approvedTourCards: ReturnType<typeof approvedActivityCard>[],
  args: Record<string, unknown> = {},
): Promise<ToolResult | null> {
  let rows: Awaited<ReturnType<typeof getCanonicalAttractionActivities>> = [];
  try {
    rows = await getCanonicalAttractionActivities(supabase, {
      islandSlug,
      anyKeywords: activityVibeKeywords(args),
      minReviewCount: 5,
      // Over-fetch: non-activity services are dropped below.
      limit: MAX_BUDDY_ACTIVITY_OPTIONS * 4,
    });
  } catch {
    rows = [];
  }
  rows = rows
    .filter((row) => !NON_ACTIVITY_SUBCATEGORY.test(row.subcategory ?? ""))
    .slice(0, MAX_BUDDY_ACTIVITY_OPTIONS);
  if (rows.length === 0) return null;
  // The catalog holds no kid-suitability facts, so that filter cannot apply.
  const kidFilterUnverified = args.kid_friendly === true;

  const canonicalCards = rows.map(canonicalAttractionCard);
  const cards = [...canonicalCards, ...approvedTourCards].slice(
    0,
    MAX_BUDDY_ACTIVITY_OPTIONS,
  );
  const results = cards.map((card) =>
    "activity_id" in card
      ? card
      : {
          place_id: card.place_id,
          name: card.name,
          type: "attraction",
          island: card.island_id,
          rating: card.rating,
          review_count: card.review_count,
          description: card.description,
          address: card.full_address,
          website: card.website,
          phone: card.phone,
          listing_type: "canonical_listing",
        },
  );
  return {
    data: {
      results,
      count: results.length,
      exact_island_slug: islandSlug,
      note: kidFilterUnverified
        ? `${CANONICAL_ATTRACTION_NOTE} ${KID_FRIENDLY_UNVERIFIED_NOTE}`
        : CANONICAL_ATTRACTION_NOTE,
      ...(kidFilterUnverified
        ? { filters_not_applied: ["kid_friendly"] }
        : {}),
      grounding: inventoryGrounding(
        "grounded",
        cards.map((card) => card.place_id),
      ),
    },
    cards,
  };
}

export async function searchFlights(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const originCode = resolveAirportCode((args.origin_city as string) || "");
  const destCode = ((args.destination as string) || "NAS").toUpperCase();
  const passengers = Number(args.passengers) || 1;
  const cabinClass = String(args.cabin_class ?? "economy").toUpperCase();
  const departureDate = String(args.departure_date ?? "").trim();
  const returnDate =
    typeof args.return_date === "string" ? args.return_date.trim() : "";

  if (!originCode) {
    return {
      data: {
        error: `Could not resolve airport code for "${args.origin_city}". Try a 3-letter IATA code like MIA, JFK, ATL.`,
        results: [],
      },
    };
  }

  if (!departureDate) {
    return {
      data: {
        error:
          "A future departure_date in YYYY-MM-DD format is required for live flight search.",
        results: [],
      },
    };
  }

  const legs = [
    {
      origin: originCode,
      destination: destCode,
      date: departureDate,
      direction: "OUTBOUND",
    },
    ...(returnDate
      ? [
          {
            origin: destCode,
            destination: originCode,
            date: returnDate,
            direction: "INBOUND",
          },
        ]
      : []),
  ];

  try {
    const result = await callTravelProvider("/flights/rates", {
      legs,
      adults: Math.max(1, passengers),
      cabinClass,
      currency: "USD",
      country: "US",
    });

    const cards = shapeLiteApiFlightCards(result.data);
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
      base_fare: card.base_fare,
      taxes: card.taxes,
      fees: card.fees,
      cabin_class: card.cabin_class,
      passengers: card.passengers,
    }));

    return {
      data: {
        results: compact,
        count: compact.length,
        message:
          compact.length === 0
            ? `No flights found from ${originCode} to ${destCode} on ${departureDate}. Try different dates or another airport.`
            : undefined,
      },
      cards,
    };
  } catch (err) {
    console.error("Flight search error:", err);
    return {
      data: { error: `Flight search error: ${String(err)}`, results: [] },
    };
  }
}

function shapeLiteApiFlightCards(response: unknown): CardData[] {
  const batches = Array.isArray(recordValue(response).data)
    ? (recordValue(response).data as unknown[])
    : [];
  const cards: CardData[] = [];

  for (const batchValue of batches) {
    const batch = recordValue(batchValue);
    const journeys = Array.isArray(batch.journeys) ? batch.journeys : [];
    for (const journeyValue of journeys) {
      const journey = recordValue(journeyValue);
      const segments = recordListValue(journey.segments);
      const outbound = segments.filter(
        (segment) => segment.direction !== "INBOUND",
      );
      const shownSegments = outbound.length > 0 ? outbound : segments;
      const first = shownSegments[0] ?? {};
      const last = shownSegments[shownSegments.length - 1] ?? first;
      const carrier = recordValue(first.carrier);
      const duration = recordValue(journey.totalDuration);
      const offers = recordListValue(journey.offers);
      const passengerCounts = recordValue(journey.parameters);
      const passengerTotal =
        numericValue(passengerCounts.adults, 1) +
        numericValue(passengerCounts.children) +
        numericValue(passengerCounts.infants);

      for (const offer of offers) {
        const display = recordValue(recordValue(offer.pricing).display);
        const fare = recordValue(offer.fare);
        const terms = recordValue(offer.terms);
        const offerId = liteTextValue(offer.offerId);
        const airlineName = liteTextValue(
          carrier.marketingName,
          liteTextValue(carrier.operatingName, "Airline"),
        );
        const airlineCode = liteTextValue(
          carrier.marketingCode,
          liteTextValue(carrier.operatingCode, liteTextValue(carrier.iataCode)),
        );
        const providerLogoUrl = liteTextValue(
          carrier.logoUrl,
          liteTextValue(carrier.logo_url),
        );
        cards.push({
          card_type: "flight",
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
          stops:
            shownSegments.length <= 1
              ? "Direct"
              : `${shownSegments.length - 1} stop${shownSegments.length > 2 ? "s" : ""}`,
          price: numericValue(display.total),
          base_fare: optionalNumericValue(display.base),
          taxes: optionalNumericValue(display.taxes),
          fees: optionalNumericValue(display.fees),
          currency: liteTextValue(display.currency, "USD"),
          cabin_class: liteTextValue(fare.family, "Economy"),
          fare_brand: liteTextValue(
            fare.brandName,
            liteTextValue(fare.name, liteTextValue(fare.family)),
          ),
          passengers: Math.max(1, passengerTotal),
          baggage: { checked: liteApiBaggageCount(offer.baggage) },
          refundable: terms.refundable === true,
          expiration: liteTextValue(
            offer.expiresAt,
            liteTextValue(offer.expires_at, liteTextValue(offer.expiration)),
          ),
          description:
            terms.refundable === true ? "Refundable fare" : undefined,
        });
      }
    }
  }

  return cards
    .filter(
      (card) =>
        card.offer_id && typeof card.price === "number" && card.price > 0,
    )
    .sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0))
    .slice(0, 5);
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function recordListValue(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(recordValue) : [];
}

function liteTextValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numericValue(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function optionalNumericValue(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function formatLiteApiFlightTime(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatLiteApiDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function liteApiBaggageCount(value: unknown): number {
  const included = recordListValue(recordValue(value).included);
  return included.filter((bag) =>
    /checked/i.test(liteTextValue(bag.description)),
  ).length;
}

async function getTripDetails(
  supabase: SupabaseClient,
  tripId: string,
): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("trips")
    .select(
      `
      *,
      trip_accommodations(*),
      trip_flights(*),
      trip_activities(*)
    `,
    )
    .eq("id", tripId)
    .single();

  if (error)
    return { data: { error: `Could not load trip: ${error.message}` } };
  return { data };
}

async function getUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, display_name, email, country, city, party_type, party_size, children_count, children_ages, interest_tags, engagement_score, dietary_needs, accessibility_needs",
    )
    .eq("id", userId)
    .single();
  if (error)
    return { data: { error: `Could not load profile: ${error.message}` } };
  return { data };
}

async function createItineraryItem(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("trip_activities")
    .insert({
      trip_id: args.trip_id,
      day_number: args.day_number,
      time_slot: args.time_slot,
      activity_type: args.activity_type,
      activity_name: args.name,
      notes: args.notes ?? null,
    })
    .select()
    .single();

  if (error)
    return { data: { error: `Could not add to itinerary: ${error.message}` } };

  return {
    data: {
      success: true,
      message: `Added "${args.name}" to Day ${args.day_number} (${args.time_slot})`,
      item: data,
    },
  };
}

async function getWeather(islandId: string): Promise<ToolResult> {
  try {
    const weather = await fetchIslandWeather(islandId, {
      fallbackToNassau: false,
    });

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
    };
  } catch (err) {
    if (err instanceof WeatherProviderError && err.status === 400) {
      return { data: { error: err.message } };
    }
    return { data: { error: `Weather fetch failed: ${String(err)}` } };
  }
}

async function searchDestinationContext(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const islandInput =
    typeof args.island_slug === "string" ? args.island_slug.trim() : "";
  const query = typeof args.query === "string" ? args.query.trim() : "";
  const topic = typeof args.topic === "string" ? args.topic.trim() : null;
  const limit = Math.max(1, Math.min(Number(args.limit) || 6, 12));
  if (!islandInput || !query) {
    return {
      data: {
        error: `${!islandInput ? "island_slug" : "query"} is required`,
        grounding: {
          answer_status: "no_evidence",
          source_ids: [],
          knowledge_ids: [],
        },
      },
    };
  }

  const startedAt = Date.now();
  const { data, error } = await supabase.rpc("search_destination_knowledge", {
    p_island: islandInput,
    p_query: query,
    p_topic: topic,
    p_limit: limit,
  });
  const retrievalLatencyMs = Date.now() - startedAt;
  if (error) {
    return {
      data: {
        error: "Approved destination knowledge is unavailable right now.",
        message:
          "Do not answer from memory. Tell the traveler that verified information is unavailable.",
        grounding: {
          answer_status: "provider_error",
          source_ids: [],
          knowledge_ids: [],
          retrieval_latency_ms: retrievalLatencyMs,
        },
      },
    };
  }

  const rows = Array.isArray(data)
    ? (data as Array<Record<string, unknown>>)
    : [];
  const sourceIds = Array.from(
    new Set(
      rows.flatMap((row) =>
        Array.isArray(row.source_ids) ? row.source_ids.map(String) : [],
      ),
    ),
  );
  const knowledgeIds = rows
    .map((row) =>
      typeof row.knowledge_id === "string" ? row.knowledge_id : null,
    )
    .filter((value): value is string => value !== null);
  const contentVersions = Array.from(
    new Set(
      rows
        .map((row) =>
          typeof row.content_version === "string" ? row.content_version : null,
        )
        .filter((value): value is string => value !== null),
    ),
  );

  let noEvidenceIsland = islandInput;
  let staleContentBlocked = false;
  if (rows.length === 0) {
    const { data: availability } = await supabase.rpc(
      "destination_knowledge_availability",
      {
        p_island: islandInput,
        p_topic: topic,
      },
    );
    const availabilityRow =
      Array.isArray(availability) && availability.length > 0
        ? (availability[0] as Record<string, unknown>)
        : null;
    if (typeof availabilityRow?.resolved_island_slug === "string") {
      noEvidenceIsland = availabilityRow.resolved_island_slug;
    }
    staleContentBlocked = Number(availabilityRow?.expired_count ?? 0) > 0;
  }

  return {
    data:
      rows.length === 0
        ? {
            island_slug: noEvidenceIsland,
            island_input: islandInput,
            results: [],
            message: `No current approved destination knowledge matched "${query}" for ${islandInput}. Do not fill the gap from model memory.`,
            grounding: {
              answer_status: "no_evidence",
              source_ids: [],
              knowledge_ids: [],
              stale_content_blocked: staleContentBlocked,
              retrieval_latency_ms: retrievalLatencyMs,
            },
          }
        : {
            island_slug: rows[0].island_slug,
            results: rows.map((row) => ({
              knowledge_id: row.knowledge_id,
              topic: row.topic,
              title: row.title,
              claim: row.claim,
              traveler_guidance: row.traveler_guidance,
              traveler_fit_tags: row.traveler_fit_tags,
              checked_at: row.checked_at,
              next_review_at: row.next_review_at,
              volatility: row.volatility,
              confidence: row.confidence,
            })),
            count: rows.length,
            grounding: {
              answer_status: "grounded",
              source_ids: sourceIds,
              knowledge_ids: knowledgeIds,
              content_versions: contentVersions,
              retrieval_latency_ms: retrievalLatencyMs,
            },
          },
  };
}

async function searchIslandFaq(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const islandSlug =
    typeof args.island_slug === "string" ? args.island_slug.trim() : "";
  if (!islandSlug)
    return { data: { error: "island_slug is required", faqs: [] } };

  const limit = Math.max(1, Math.min(Number(args.limit) || 5, 10));
  const keyword =
    typeof args.keyword === "string"
      ? args.keyword.trim().replace(/[%_]/g, "")
      : "";
  const category =
    typeof args.category === "string" ? args.category.trim() : "";

  let query = supabase
    .from("island_faq")
    .select("island_name,category,question,answer,traveller_type,priority")
    .eq("island_slug", islandSlug)
    .eq("status", "active")
    .limit(limit);
  if (category) query = query.eq("category", category);
  if (keyword) query = query.ilike("question", `%${keyword}%`);

  const { data, error } = await query;
  if (error) return { data: { error: error.message, faqs: [] } };
  return {
    data: {
      island_slug: islandSlug,
      faqs: data || [],
      count: data?.length || 0,
    },
  };
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
  knowledgeSupabase: SupabaseClient = supabase,
): Promise<ToolResult> {
  try {
    if (ISLAND_SCOPED_TOOLS.has(toolName)) {
      const islandValue = toolInput.island_slug ?? toolInput.island_id;
      if (typeof islandValue === "string" && islandValue.trim()) {
        const { data: resolvedIsland, error: resolutionError } =
          await knowledgeSupabase.rpc("resolve_island_slug", {
            p_value: islandValue,
          });
        if (
          resolutionError ||
          typeof resolvedIsland !== "string" ||
          !resolvedIsland
        ) {
          return {
            data: {
              error: `Unknown Bahamas island: ${islandValue}`,
              message:
                "Use a canonical island from the shared registry. Do not guess or substitute another island.",
            },
          };
        }
        toolInput = {
          ...toolInput,
          ...(toolInput.island_id !== undefined
            ? { island_id: resolvedIsland }
            : {}),
          ...(toolInput.island_slug !== undefined
            ? { island_slug: resolvedIsland }
            : {}),
        };
      }
    }
    switch (toolName) {
      case "get_hotels":
        return await getHotels(supabase, toolInput);
      case "get_restaurants":
        return await getRestaurants(knowledgeSupabase, toolInput);
      case "get_activities":
        return await getActivities(knowledgeSupabase, toolInput);
      case "search_flights":
        return await searchFlights(toolInput);
      case "get_trip_details":
        return await getTripDetails(supabase, toolInput.trip_id as string);
      case "get_user_profile": {
        if (!userId)
          return {
            data: { error: "No authenticated user — cannot load profile." },
          };
        return await getUserProfile(supabase, userId);
      }
      case "create_itinerary_item":
        return await createItineraryItem(supabase, toolInput);
      case "get_weather":
        return await getWeather(toolInput.island_id as string);
      case "get_destination_context":
        return await searchDestinationContext(knowledgeSupabase, toolInput);
      case "search_island_faq":
        return await searchIslandFaq(supabase, toolInput);
      default:
        return { data: { error: `Unknown tool: ${toolName}` } };
    }
  } catch (err) {
    console.error(`[executeTool ${toolName}]`, err);
    return { data: { error: `Tool execution failed: ${String(err)}` } };
  }
}

/**
 * Human-readable progress label sent to the UI when a tool starts. Mobile
 * shows these inline with the Buddy avatar's "thinking" state.
 */
export function toolProgressLabel(toolName: string): string {
  switch (toolName) {
    case "get_hotels":
      return "Searching hotels…";
    case "get_restaurants":
      return "Finding restaurants…";
    case "get_activities":
      return "Browsing activities…";
    case "search_flights":
      return "Checking flights…";
    case "get_trip_details":
      return "Pulling up your trip…";
    case "get_user_profile":
      return "Reviewing your preferences…";
    case "create_itinerary_item":
      return "Adding to your itinerary…";
    case "get_weather":
      return "Checking the weather…";
    case "get_destination_context":
      return "Looking up island details…";
    case "search_island_faq":
      return "Searching current island guidance…";
    default:
      return "Working on it…";
  }
}
