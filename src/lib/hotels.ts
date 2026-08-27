import "server-only";
import { createClient } from "@/lib/supabase/server";
import { callTravelProvider } from "@/lib/travel-booking/provider";
import {
  getStayTypeFilterOptions,
  resolveStayPropertyTypeName,
  stayPropertyTypeAliases,
  stayPropertyTypeIds,
} from "@/lib/stay-property-types";
import {
  hotelMatchesTravelerType,
  type StayTravelerType,
} from "@/lib/stay-traveler-types";
import { CACHED_PLACE_REVIEW_TABLE } from "@/lib/place-inventory";
import {
  STAY_ISLAND_FILTERS,
  knownStayIslandFilterLabel,
  stayIslandFilterAliases,
  stayIslandFilterLabel,
} from "@/lib/stay-island-filters";

export interface Hotel {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  island: string | null;
  country_code: string;
  latitude: number | null;
  longitude: number | null;
  star_rating: number | null;
  review_score: number | null;
  review_count: number | null;
  description: string | null;
  main_photo_url: string | null;
  photos: Array<string | { url: string; caption?: string }> | null;
  amenities: string[];
  property_type_id: number | null;
  property_type_name: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HotelStartingRate {
  hotelId: string;
  currency: string;
  total: number;
  nightly: number;
  nights: number;
}

export type HotelPhoto = NonNullable<Hotel["photos"]>[number];

export interface HotelReview {
  authorName: string;
  rating: number;
  text: string;
  time: string | null;
}

export function hotelPhotoUrl(photo: HotelPhoto): string | null {
  if (!photo) return null;
  if (typeof photo === "string") return validImageUrl(photo);
  return validImageUrl(photo.url);
}

export function hotelPhotoCaption(photo: HotelPhoto): string | undefined {
  if (!photo || typeof photo === "string") return undefined;
  return photo.caption;
}

export function hotelPhotoUrls(
  hotel: Pick<Hotel, "main_photo_url" | "photos">,
): string[] {
  const urls = new Set<string>();
  const main = validImageUrl(hotel.main_photo_url);
  if (main) urls.add(main);
  for (const photo of hotel.photos ?? []) {
    const url = hotelPhotoUrl(photo);
    if (url) urls.add(url);
  }
  return Array.from(urls);
}

export function hotelHeroPhotoUrl(
  hotel: Pick<Hotel, "main_photo_url" | "photos">,
): string | null {
  return hotelPhotoUrls(hotel)[0] ?? null;
}

export function uniqueHotelPhotoUrls(
  ...groups: Array<readonly string[]>
): string[] {
  const urls = new Set<string>();
  for (const group of groups) {
    for (const value of group) {
      const url = validImageUrl(value);
      if (url) urls.add(url);
    }
  }
  return Array.from(urls);
}

function validImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

export function extractHotelImageUrls(value: unknown, limit = 40): string[] {
  const urls = new Set<string>();
  collectHotelImageUrls(value, urls);
  return Array.from(urls).slice(0, limit);
}

function collectHotelImageUrls(value: unknown, urls: Set<string>, depth = 0) {
  if (depth > 6 || value == null) return;

  if (typeof value === "string") {
    const url = validImageUrl(value);
    if (url && isProviderHotelImageUrl(url)) urls.add(url);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectHotelImageUrls(item, urls, depth + 1);
    return;
  }

  if (typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  for (const key of [
    "urlHd",
    "urlHD",
    "url",
    "imageUrl",
    "image_url",
    "photoUrl",
    "photo_url",
    "src",
    "main_photo",
    "thumbnail",
  ]) {
    collectHotelImageUrls(record[key], urls, depth + 1);
  }

  for (const [key, nested] of Object.entries(record)) {
    if (/image|photo|thumb|gallery|media/i.test(key)) {
      collectHotelImageUrls(nested, urls, depth + 1);
    }
  }
}

function isProviderHotelImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const target = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
    return (
      /\.(?:avif|jpe?g|png|webp)$/i.test(parsed.pathname) ||
      /(?:cupid\.travel|liteapi|giata|cloudfront|cloudinary|images?|photos?|media|cdn)/i.test(
        target,
      )
    );
  } catch {
    return false;
  }
}

function providerData(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  return record.data ?? value;
}

export async function getLiveHotelPhotoUrls(
  hotelId: string,
  limit = 30,
): Promise<string[]> {
  if (!hotelId) return [];

  try {
    const result = await callTravelProvider(
      `/data/hotel?hotelId=${encodeURIComponent(hotelId)}`,
      null,
      { method: "GET" },
    );

    return extractHotelImageUrls(providerData(result.data), limit);
  } catch {
    return [];
  }
}

function liveReviewText(review: Record<string, unknown>): string {
  const parts = [
    review.headline,
    review.pros,
    review.cons ? `Heads up: ${review.cons}` : null,
    review.text,
    review.comment,
  ]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);

  return Array.from(new Set(parts)).join(" ");
}

async function getLiveHotelReviews(
  hotelId: string,
  limit = 4,
): Promise<HotelReview[]> {
  if (!hotelId) return [];

  try {
    const result = await callTravelProvider(
      `/data/reviews?hotelId=${encodeURIComponent(hotelId)}&limit=${Math.max(limit, 5)}`,
      null,
      { method: "GET" },
    );
    const data = providerData(result.data);
    const reviews = Array.isArray(data) ? data : [];

    return reviews
      .map((value) => {
        const review =
          value && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};
        const text = liveReviewText(review);
        const rawRating =
          typeof review.averageScore === "number"
            ? review.averageScore
            : Number(review.rating ?? review.score);

        return {
          authorName:
            typeof review.name === "string" && review.name.trim()
              ? review.name.trim()
              : "Guest",
          rating: Number.isFinite(rawRating) ? rawRating : 0,
          text,
          time: typeof review.date === "string" ? review.date : null,
        };
      })
      .filter((review) => review.rating > 0 && review.text.length > 18)
      .slice(0, limit);
  } catch {
    return [];
  }
}

const BROWSE_FIELDS =
  "id, name, city, island, star_rating, review_score, review_count, main_photo_url, photos, amenities, property_type_id, property_type_name, description" as const;
const HOTEL_RATE_LOOKUP_CHUNK_SIZE = 8;

function normalizeHotelPropertyTypes<
  T extends Pick<Hotel, "property_type_id" | "property_type_name">,
>(hotels: T[]): T[] {
  return hotels.map((hotel) => ({
    ...hotel,
    property_type_name: resolveStayPropertyTypeName(
      hotel.property_type_name,
      hotel.property_type_id,
    ),
  }));
}

export const FEATURED_STAY_ISLANDS = STAY_ISLAND_FILTERS;

function escapePostgrestFilterValue(value: string): string {
  return value.replace(/[(),]/g, " ").trim();
}

function islandAliasOrFilter(column: string, island: string): string {
  return stayIslandFilterAliases(island)
    .map((alias) => `${column}.ilike.%${escapePostgrestFilterValue(alias)}%`)
    .join(",");
}

export async function getHotels(filters?: {
  island?: string;
  city?: string;
  propertyType?: string;
  travelerType?: StayTravelerType;
  minStars?: number;
  minGuestRating?: number;
  amenities?: string[];
  sort?: "rating" | "stars";
}): Promise<Hotel[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("hotels")
      .select(BROWSE_FIELDS)
      .eq("is_active", true)
      .limit(200);

    if (filters?.island) {
      query = query.or(islandAliasOrFilter("island", filters.island));
    }
    if (filters?.city) {
      query = query.ilike("city", filters.city);
    }
    if (filters?.propertyType) {
      const aliases = stayPropertyTypeAliases(filters.propertyType);
      const typeIds = stayPropertyTypeIds(filters.propertyType);
      const orFilters = [
        ...aliases.map(
          (value) => `property_type_name.ilike.${value.replaceAll(",", "")}`,
        ),
        ...(typeIds.length > 0
          ? [`property_type_id.in.(${typeIds.join(",")})`]
          : []),
      ];

      if (orFilters.length > 0) {
        query = query.or(orFilters.join(","));
      }
    }
    if (filters?.minStars) {
      query = query.gte("star_rating", filters.minStars);
    }
    if (filters?.minGuestRating) {
      query = query.gte("review_score", filters.minGuestRating);
    }
    if (filters?.amenities && filters.amenities.length > 0) {
      query = query.contains("amenities", filters.amenities);
    }

    if (filters?.sort === "stars") {
      query = query
        .order("star_rating", { ascending: false, nullsFirst: false })
        .order("review_score", { ascending: false, nullsFirst: false })
        .order("review_count", { ascending: false, nullsFirst: false })
        .order("name", { ascending: true });
    } else {
      query = query
        .order("review_score", { ascending: false, nullsFirst: false })
        .order("review_count", { ascending: false, nullsFirst: false })
        .order("star_rating", { ascending: false, nullsFirst: false })
        .order("name", { ascending: true });
    }

    const { data, error } = await query;
    if (error || !data) return [];
    const hotels = normalizeHotelPropertyTypes(data as Hotel[]);
    return filters?.travelerType
      ? hotels.filter((hotel) =>
          hotelMatchesTravelerType(hotel, filters.travelerType),
        )
      : hotels;
  } catch {
    return [];
  }
}

export async function getFeaturedStayHotels(limit = 6): Promise<Hotel[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("hotels")
      .select(BROWSE_FIELDS)
      .eq("is_active", true)
      .gte("star_rating", 4)
      .limit(500);

    if (error || !data) return [];

    const candidates = normalizeHotelPropertyTypes(data as Hotel[])
      .filter((hotel) => featuredIslandLabel(hotel.island) != null)
      .sort(compareHotelsForFeatured);

    const imageReady = candidates.filter((hotel) => hotelHeroPhotoUrl(hotel));
    const pool =
      imageReady.length >= Math.min(limit, FEATURED_STAY_ISLANDS.length)
        ? imageReady
        : candidates;

    const selected = new Map<string, Hotel>();
    for (const island of FEATURED_STAY_ISLANDS) {
      const bestForIsland = pool.find(
        (hotel) => featuredIslandLabel(hotel.island) === island.label,
      );
      if (bestForIsland) selected.set(bestForIsland.id, bestForIsland);
    }

    for (const hotel of pool) {
      if (selected.size >= limit) break;
      selected.set(hotel.id, hotel);
    }

    return Array.from(selected.values()).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getStayStartingRates(input: {
  hotelIds: string[];
  checkin: string;
  checkout: string;
  adults?: number;
  children?: number;
  currency?: string;
  guestNationality?: string;
  limit?: number;
}): Promise<Map<string, HotelStartingRate>> {
  const nights = hotelRateNightsBetween(input.checkin, input.checkout);
  if (!nights) return new Map();

  const hotelIds = Array.from(
    new Set(input.hotelIds.map((id) => id.trim()).filter(Boolean)),
  ).slice(0, input.limit ?? 24);
  if (hotelIds.length === 0) return new Map();

  const rates = new Map<string, HotelStartingRate>();
  for (let i = 0; i < hotelIds.length; i += HOTEL_RATE_LOOKUP_CHUNK_SIZE) {
    const chunk = hotelIds.slice(i, i + HOTEL_RATE_LOOKUP_CHUNK_SIZE);
    try {
      const result = await callTravelProvider("/hotels/rates", {
        hotelIds: chunk,
        checkin: input.checkin,
        checkout: input.checkout,
        occupancies: [
          {
            adults: Math.max(1, input.adults ?? 2),
            ...(input.children && input.children > 0
              ? { children: Array.from({ length: input.children }, () => 10) }
              : {}),
          },
        ],
        currency: (input.currency ?? "USD").toUpperCase(),
        guestNationality: (input.guestNationality ?? "US").toUpperCase(),
      });

      for (const rate of shapeHotelStartingRates(result.data, nights)) {
        rates.set(rate.hotelId, rate);
      }
    } catch {
      continue;
    }
  }

  return rates;
}

function shapeHotelStartingRates(
  data: unknown,
  nights: number,
): HotelStartingRate[] {
  const record = hotelRateRecord(data);
  const hotels = Array.isArray(record.data)
    ? record.data.map(hotelRateRecord)
    : [];
  return hotels
    .map((hotel) => {
      const hotelId = hotelRateString(hotel.hotelId);
      const roomTypes = Array.isArray(hotel.roomTypes)
        ? hotel.roomTypes.map(hotelRateRecord)
        : [];
      let cheapestTotal: number | null = null;
      let currency = hotelRateString(hotel.currency, "USD");

      for (const room of roomTypes) {
        const offerRetail = hotelRateRecord(room.offerRetailRate);
        const total = hotelRateNumber(offerRetail.amount);
        if (total === null) continue;
        if (cheapestTotal === null || total < cheapestTotal) {
          cheapestTotal = total;
          currency = hotelRateString(offerRetail.currency, currency);
        }
      }

      if (!hotelId || cheapestTotal === null || cheapestTotal <= 0) return null;
      return {
        hotelId,
        currency,
        total: cheapestTotal,
        nightly: cheapestTotal / nights,
        nights,
      };
    })
    .filter((rate): rate is HotelStartingRate => Boolean(rate));
}

function hotelRateNightsBetween(
  checkin: string,
  checkout: string,
): number | null {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(checkin) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(checkout)
  )
    return null;
  const nights = Math.round(
    (new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000,
  );
  return nights > 0 ? nights : null;
}

function hotelRateRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hotelRateString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function hotelRateNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function featuredIslandLabel(value: string | null | undefined): string | null {
  const label = knownStayIslandFilterLabel(value);
  return label || null;
}

function compareHotelsForFeatured(a: Hotel, b: Hotel): number {
  return (
    (b.star_rating ?? 0) - (a.star_rating ?? 0) ||
    (b.review_score ?? 0) - (a.review_score ?? 0) ||
    (b.review_count ?? 0) - (a.review_count ?? 0) ||
    a.name.localeCompare(b.name)
  );
}

export async function getAmenityOptions(limit = 12): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("hotels")
      .select("amenities")
      .eq("is_active", true)
      .not("amenities", "is", null)
      .limit(500);
    if (error || !data) return [];

    const counts = new Map<string, { label: string; count: number }>();
    for (const row of data as Array<{ amenities: unknown }>) {
      if (!Array.isArray(row.amenities)) continue;
      for (const value of row.amenities) {
        if (typeof value !== "string") continue;
        const label = value.trim();
        if (!label) continue;
        const key = label.toLowerCase();
        const current = counts.get(key);
        if (current) {
          current.count += 1;
        } else {
          counts.set(key, { label, count: 1 });
        }
      }
    }

    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, limit)
      .map((item) => item.label);
  } catch {
    return [];
  }
}

export async function getHotelById(hotelId: string): Promise<Hotel | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("hotels")
      .select("*")
      .eq("id", hotelId)
      .single();
    if (error || !data) return null;
    return normalizeHotelPropertyTypes([data as Hotel])[0];
  } catch {
    return null;
  }
}

export async function getHotelReviews(
  hotelId: string,
  limit = 4,
): Promise<HotelReview[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(CACHED_PLACE_REVIEW_TABLE)
      .select("author_name, rating, text, time")
      .eq("place_id", hotelId)
      .gte("rating", 4)
      .not("text", "is", null)
      .order("time", { ascending: false })
      .limit(limit * 3);

    if (error || !data) return getLiveHotelReviews(hotelId, limit);

    const cachedReviews = data
      .map((row) => ({
        authorName:
          typeof row.author_name === "string" && row.author_name.trim()
            ? row.author_name.trim()
            : "Guest",
        rating: typeof row.rating === "number" ? row.rating * 2 : 10,
        text: typeof row.text === "string" ? row.text.trim() : "",
        time: typeof row.time === "string" ? row.time : null,
      }))
      .filter((review) => review.text.length > 30)
      .slice(0, limit);

    if (cachedReviews.length >= Math.min(2, limit)) return cachedReviews;

    const liveReviews = await getLiveHotelReviews(hotelId, limit);
    const seen = new Set(
      cachedReviews.map((review) => `${review.authorName}:${review.text}`),
    );
    const merged = [...cachedReviews];
    for (const review of liveReviews) {
      const key = `${review.authorName}:${review.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(review);
      if (merged.length >= limit) break;
    }

    return merged;
  } catch {
    return getLiveHotelReviews(hotelId, limit);
  }
}

export async function getSimilarHotels(
  hotel: Hotel,
  limit = 4,
): Promise<Hotel[]> {
  if (!hotel.island) return [];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("hotels")
      .select(BROWSE_FIELDS)
      .eq("is_active", true)
      .or(islandAliasOrFilter("island", hotel.island ?? ""))
      .neq("id", hotel.id)
      .order("review_score", { ascending: false, nullsFirst: false })
      .limit(limit);
    return normalizeHotelPropertyTypes((data as Hotel[]) ?? []);
  } catch {
    return [];
  }
}

export async function getIslandOptions(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("hotels")
      .select("island")
      .eq("is_active", true)
      .not("island", "is", null);
    if (!data) return [];
    const unique = Array.from(
      new Set(
        data
          .map((r) => stayIslandFilterLabel(r.island as string | null))
          .filter(Boolean),
      ),
    ).sort();
    return unique;
  } catch {
    return [];
  }
}

export async function getCityOptions(island?: string): Promise<string[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("hotels")
      .select("city")
      .eq("is_active", true)
      .not("city", "is", null);

    if (island) {
      query = query.or(islandAliasOrFilter("island", island));
    }

    const { data } = await query;
    if (!data) return [];
    return Array.from(
      new Set(
        data
          .map((r) => r.city as string)
          .map((city) => city.trim())
          .filter(Boolean),
      ),
    ).sort();
  } catch {
    return [];
  }
}

export async function getPropertyTypes(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("hotels")
      .select("property_type_id, property_type_name")
      .eq("is_active", true);
    if (!data) return [];
    const unique = Array.from(
      new Set(
        data
          .map((r) =>
            resolveStayPropertyTypeName(
              r.property_type_name as string | null,
              r.property_type_id as number | null,
            ),
          )
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort();
    return getStayTypeFilterOptions(unique);
  } catch {
    return getStayTypeFilterOptions([]);
  }
}
