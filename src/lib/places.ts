import "server-only";

import { isWithinCanonicalIslandBounds } from "@/lib/bahamas-island-bounds";
import { requestCache } from "@/lib/request-cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import type { PublicPlace } from "@/lib/place-types";
import type { TripAdvisorLocation } from "@/lib/tripadvisor/types";
import {
  isPermanentlyClosed,
  isPriceTier,
  parseTripStyles,
} from "@/lib/trip-styles";
import {
  BAHAMAS_COORDINATE_BOUNDS,
  CANONICAL_ATTRACTION_CATEGORIES,
  CANONICAL_PLACE_TABLE,
  activityBookingLabel,
  activityDurationLabel,
  activityPriceLabel,
  approvedActivityCard,
  approvedActivityDetailHref,
  canonicalAttractionCategory,
  factLabel,
  getActivitiesWithCanonicalFallback,
  isApprovedTourRow,
  sourceAsOfLabel,
  type ApprovedActivityRow,
  type CanonicalAttractionRow,
} from "@/lib/approved-activities";

interface CanonicalPlaceRow {
  id: string;
  slug: string | null;
  name: string;
  category: string;
  subcategory: string | null;
  island_id: string | null;
  island_name: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  short_description: string | null;
  primary_image_url: string | null;
  gallery_images: unknown[] | null;
  rating: number | string | null;
  review_count: number | null;
  price_level: string | null;
  opening_hours: Record<string, unknown> | null;
  amenities: unknown[] | null;
  tags: unknown[] | null;
  buddy_tips: unknown[] | null;
  is_verified: boolean | null;
  is_partner: boolean | null;
  source_priority: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
  trip_styles?: unknown[] | null;
  price_tier?: string | null;
  business_status?: string | null;
}

const CANONICAL_SELECT = [
  "id",
  "slug",
  "name",
  "category",
  "subcategory",
  "island_id",
  "island_name",
  "address",
  "latitude",
  "longitude",
  "phone",
  "website",
  "description",
  "short_description",
  "primary_image_url",
  "gallery_images",
  "rating",
  "review_count",
  "price_level",
  "opening_hours",
  "amenities",
  "tags",
  "buddy_tips",
  "is_verified",
  "is_partner",
  "source_priority",
  "metadata",
  "updated_at",
  "trip_styles",
  "price_tier",
  "business_status",
].join(", ");

/**
 * Narrow column list for list/card views (restaurant lists, island rails,
 * related places). Long text and unused JSON stay out of the payload; only
 * the metadata keys and first gallery image that cards read are selected.
 */
const CANONICAL_CARD_SELECT = [
  "id",
  "slug",
  "name",
  "category",
  "subcategory",
  "island_id",
  "island_name",
  "address",
  "latitude",
  "longitude",
  "website",
  "primary_image_url",
  "gallery_first:gallery_images->0",
  "rating",
  "review_count",
  "price_level",
  "amenities",
  "tags",
  "is_verified",
  "meta_image_attribution:metadata->image_attribution",
  "meta_tripadvisor_url:metadata->tripadvisor_url",
  "meta_tripadvisorUrl:metadata->tripadvisorUrl",
  "meta_amenities:metadata->amenities",
  "trip_styles",
  "price_tier",
  "business_status",
].join(", ");

type CanonicalColumns = "full" | "card";
/** Broad category pushed into the canonical query (a superset; the exact
 * category check still runs in JS). */
type CanonicalCategoryFilter = "dining" | "stay";

const CANONICAL_CATEGORY_TOKENS: Record<CanonicalCategoryFilter, string[]> = {
  dining: ["restaurant", "dining", "food"],
  stay: ["hotel", "resort", "stay", "villa"],
};

/** Row budget the restaurant lists have always used. */
const RESTAURANT_POOL_LIMIT = 320;
/** Per-filter candidate budget for the related-places rail. */
const RELATED_POOL_LIMIT = 60;

export async function getExplorePlaces(limit = 320): Promise<PublicPlace[]> {
  const [canonical, activities] = await Promise.all([
    getCanonicalPlaces(limit, "full", null, null),
    getApprovedActivityPlaces(limit, null),
  ]);

  const merged = mergePlaces([...canonical, ...activities]);
  return sortPlaces(merged).slice(0, limit);
}

export const getExplorePlaceById = requestCache(async (
  id: string,
): Promise<PublicPlace | null> => {
  const approvedActivity = await getApprovedActivityById(id);
  if (approvedActivity) return approvedActivity;

  const canonical = await getCanonicalPlaceByIdOrSlug(id);
  if (canonical) return canonical;

  return null;
});

export async function getPublishedRestaurantsByIsland(
  islandSlug: string,
  islandName: string,
  limit = 6,
): Promise<PublicPlace[]> {
  const places = await getCanonicalPlaces(
    RESTAURANT_POOL_LIMIT,
    "card",
    "dining",
    null,
  );
  const islandKeys = new Set([
    normalize(islandSlug),
    normalize(islandName),
    normalize(cachedIslandLabel(islandSlug) ?? ""),
  ]);

  return places
    .filter((place) => broadCategory(place.category) === "dining")
    .filter((place) => {
      const placeKeys = [place.island_id, place.island]
        .filter((value): value is string => Boolean(value))
        .map(normalize);
      return placeKeys.some((key) => islandKeys.has(key));
    })
    .slice(0, limit);
}

export async function getPublishedRestaurants(
  options: {
    island?: string;
    cuisine?: string;
    limit?: number;
  } = {},
): Promise<PublicPlace[]> {
  // Same pool as the island rail and the cuisine list, so one request
  // (e.g. /restaurants, which asks twice) runs the query once.
  const places = await getCanonicalPlaces(
    Math.max(options.limit ?? 100, RESTAURANT_POOL_LIMIT),
    "card",
    "dining",
    null,
  );
  const islandKey = normalize(options.island ?? "");
  const cuisineKey = normalize(options.cuisine ?? "");

  return places
    .filter((place) => broadCategory(place.category) === "dining")
    .filter((place) => {
      if (!islandKey) return true;
      return [
        place.island_id,
        place.island,
        cachedIslandLabel(place.island_id ?? ""),
      ]
        .filter((value): value is string => Boolean(value))
        .some(
          (value) =>
            normalize(value).includes(islandKey) ||
            islandKey.includes(normalize(value)),
        );
    })
    .filter((place) => {
      if (!cuisineKey) return true;
      return place.tags.some((tag) => normalize(tag) === cuisineKey);
    })
    .slice(0, options.limit ?? 100);
}

export async function getPublishedRestaurantById(
  id: string,
): Promise<PublicPlace | null> {
  const place = await getCanonicalPlaceByIdOrSlug(id);
  return place && broadCategory(place.category) === "dining" ? place : null;
}

/** Compatibility shape for the existing restaurant UI; data is canonical. */
export function publishedPlaceAsRestaurant(
  place: PublicPlace,
): TripAdvisorLocation {
  return {
    id: place.id,
    location_id: place.id,
    category: "restaurants",
    island_name: place.island,
    name: place.name,
    address: place.address
      ? { street1: place.address, city: place.island ?? undefined }
      : null,
    rating: place.rating,
    num_reviews: place.review_count,
    price_level: place.price_range,
    cuisine_types: place.tags,
    hotel_class: null,
    amenities: place.amenities,
    photos: place.image_url ? [{ url: place.image_url }] : null,
    image_attribution: place.image_attribution ?? null,
    reviews: null,
    website: place.website ?? null,
    tripadvisor_url: place.tripadvisor_url ?? null,
    latitude: place.latitude ?? null,
    longitude: place.longitude ?? null,
    ...(place.trip_styles?.length ? { trip_styles: place.trip_styles } : {}),
    ...(place.price_tier ? { price_tier: place.price_tier } : {}),
    ...(place.business_status
      ? { business_status: place.business_status }
      : {}),
  };
}

export async function getRelatedExplorePlaces(
  place: PublicPlace,
  limit = 4,
): Promise<PublicPlace[]> {
  const islandKey = normalize(place.island ?? place.island_id ?? "");
  const categoryKey = broadCategory(place.category);
  const places = sortPlaces(
    mergePlaces(await getRelatedCandidates(place, islandKey, categoryKey)),
  );

  return places
    .filter((candidate) => candidate.id !== place.id)
    .filter((candidate) => {
      const sameIsland =
        islandKey &&
        normalize(candidate.island ?? candidate.island_id ?? "") === islandKey;
      const sameCategory = broadCategory(candidate.category) === categoryKey;
      return categoryKey === "activity"
        ? Boolean(sameIsland)
        : sameIsland || sameCategory;
    })
    .slice(0, limit);
}

/**
 * Candidates for the related-places rail: only the rows that can pass its
 * same-island / same-category filter, instead of the whole explore catalog.
 * Categories without a SQL filter fall back to the broad catalog read.
 */
async function getRelatedCandidates(
  place: PublicPlace,
  islandKey: string,
  categoryKey: string,
): Promise<PublicPlace[]> {
  const islandFilter = islandKey ? canonicalIslandOrFilter(place, islandKey) : null;
  const islandSlug = place.island_id ?? place.island ?? null;
  const loads: Array<Promise<PublicPlace[]>> = [];

  if (islandFilter) {
    loads.push(
      getCanonicalPlaces(RELATED_POOL_LIMIT, "card", null, islandFilter),
      getApprovedActivityPlaces(RELATED_POOL_LIMIT, islandSlug),
    );
  }

  if (categoryKey !== "activity") {
    if (categoryKey === "dining" || categoryKey === "stay") {
      loads.push(
        getCanonicalPlaces(RELATED_POOL_LIMIT, "card", categoryKey, null),
      );
    } else {
      loads.push(
        getCanonicalPlaces(420, "card", null, null),
        getApprovedActivityPlaces(420, null),
      );
    }
  }

  return (await Promise.all(loads)).flat();
}

/** PostgREST `or` filter matching rows whose island normalises like the
 * place's island (a superset: the exact comparison still runs in JS). */
function canonicalIslandOrFilter(
  place: PublicPlace,
  islandKey: string,
): string {
  const keyPattern = islandKey.replace(/ /g, "_");
  const filters = [
    `island_name.ilike.${postgrestQuote(keyPattern)}`,
    `island_id.ilike.${postgrestQuote(keyPattern)}`,
  ];
  if (place.island) {
    filters.push(`island_name.ilike.${postgrestQuote(place.island)}`);
  }
  if (place.island_id) {
    filters.push(`island_id.eq.${postgrestQuote(place.island_id)}`);
  }
  return filters.join(",");
}

function postgrestQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function categoryOrFilter(category: CanonicalCategoryFilter): string {
  return CANONICAL_CATEGORY_TOKENS[category]
    .flatMap((token) => [
      `category.ilike.%${token}%`,
      `subcategory.ilike.%${token}%`,
    ])
    .join(",");
}

/**
 * Canonical (non-attraction) places, deduped per request: pages that ask for
 * the same slice more than once (generateMetadata + page, or two lists on
 * one page) share one query. Arguments are primitives so `cache()` can key
 * on them.
 */
const getCanonicalPlaces = requestCache(async (
  limit: number,
  columns: CanonicalColumns,
  category: CanonicalCategoryFilter | null,
  islandFilter: string | null,
): Promise<PublicPlace[]> => {
  try {
    const supabase = createAdminClient() ?? createPublicClient();
    // Canonical `places` rows are the published catalog; photo-less rows are
    // kept and ranked after rows with a photo.
    // Attractions are read through the activity path; excluding them in SQL
    // keeps them from using up the row budget before the JS filter below.
    let query = supabase
      .from(CANONICAL_PLACE_TABLE)
      .select(columns === "card" ? CANONICAL_CARD_SELECT : CANONICAL_SELECT)
      .eq("is_active", true)
      .eq("status", "active")
      .not("category", "in", `(${CANONICAL_ATTRACTION_CATEGORIES.join(",")})`)
      .gte("latitude", BAHAMAS_COORDINATE_BOUNDS.minLatitude)
      .lte("latitude", BAHAMAS_COORDINATE_BOUNDS.maxLatitude)
      .gte("longitude", BAHAMAS_COORDINATE_BOUNDS.minLongitude)
      .lte("longitude", BAHAMAS_COORDINATE_BOUNDS.maxLongitude);
    if (category) query = query.or(categoryOrFilter(category));
    if (islandFilter) query = query.or(islandFilter);
    const { data, error } = await query
      .order("rating", { ascending: false, nullsFirst: false })
      .order("review_count", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error || !data) return [];
    return (data as unknown as Array<CanonicalPlaceRow | CanonicalCardRow>)
      .map(canonicalRowFromSelection)
      // Guard: closed-for-good places should already be inactive.
      .filter((row) => !isPermanentlyClosed(row.business_status))
      .filter((row) => !isActivityCategory(row.category, row.subcategory))
      .filter((row) =>
        isWithinCanonicalIslandBounds({
          island: row.island_id ?? row.island_name,
          latitude: row.latitude,
          longitude: row.longitude,
        }),
      )
      .map(mapCanonicalPlace)
      .map((place, index) => ({ place, index }))
      .sort(
        (a, b) =>
          Number(Boolean(b.place.image_url)) -
            Number(Boolean(a.place.image_url)) || a.index - b.index,
      )
      .map(({ place }) => place);
  } catch {
    return [];
  }
});

/** Full-row columns a card selection leaves out. */
type CanonicalCardOmitted =
  | "phone"
  | "description"
  | "short_description"
  | "opening_hours"
  | "buddy_tips"
  | "is_partner"
  | "source_priority"
  | "updated_at";

/** Columns a card selection returns in place of the full metadata/gallery. */
interface CanonicalCardRow
  extends Omit<
      CanonicalPlaceRow,
      "metadata" | "gallery_images" | CanonicalCardOmitted
    >,
    Partial<Pick<CanonicalPlaceRow, CanonicalCardOmitted>> {
  gallery_first?: unknown;
  meta_image_attribution?: unknown;
  meta_tripadvisor_url?: unknown;
  meta_tripadvisorUrl?: unknown;
  meta_amenities?: unknown;
}

/** Rebuilds the full-row shape from a card selection so one mapper serves
 * both; missing text columns map to null. */
function canonicalRowFromSelection(
  row: CanonicalPlaceRow | CanonicalCardRow,
): CanonicalPlaceRow {
  if ("metadata" in row) return row as CanonicalPlaceRow;
  const card = row as CanonicalCardRow;
  const metadata: Record<string, unknown> = {};
  if (card.meta_image_attribution != null)
    metadata.image_attribution = card.meta_image_attribution;
  if (card.meta_tripadvisor_url != null)
    metadata.tripadvisor_url = card.meta_tripadvisor_url;
  if (card.meta_tripadvisorUrl != null)
    metadata.tripadvisorUrl = card.meta_tripadvisorUrl;
  if (card.meta_amenities != null) metadata.amenities = card.meta_amenities;
  return {
    phone: null,
    description: null,
    short_description: null,
    opening_hours: null,
    buddy_tips: null,
    is_partner: null,
    source_priority: null,
    updated_at: null,
    ...card,
    gallery_images: card.gallery_first != null ? [card.gallery_first] : null,
    metadata,
  };
}

const getCanonicalPlaceByIdOrSlug = requestCache(async (
  id: string,
): Promise<PublicPlace | null> => {
  const bySlug = await getCanonicalPlace("slug", id);
  if (bySlug) return bySlug;
  if (!isUuid(id)) return null;
  return getCanonicalPlace("id", id);
});

async function getCanonicalPlace(
  column: "id" | "slug",
  value: string,
): Promise<PublicPlace | null> {
  try {
    const supabase = createAdminClient() ?? createPublicClient();
    const { data, error } = await supabase
      .from(CANONICAL_PLACE_TABLE)
      .select(CANONICAL_SELECT)
      .eq("is_active", true)
      .eq("status", "active")
      .gte("latitude", BAHAMAS_COORDINATE_BOUNDS.minLatitude)
      .lte("latitude", BAHAMAS_COORDINATE_BOUNDS.maxLatitude)
      .gte("longitude", BAHAMAS_COORDINATE_BOUNDS.minLongitude)
      .lte("longitude", BAHAMAS_COORDINATE_BOUNDS.maxLongitude)
      .eq(column, value)
      .single();

    if (error || !data) return null;
    const row = data as unknown as CanonicalPlaceRow;
    if (
      !isWithinCanonicalIslandBounds({
        island: row.island_id ?? row.island_name,
        latitude: row.latitude,
        longitude: row.longitude,
      })
    )
      return null;
    // Attractions resolve here too: canonical attraction cards link to this
    // detail page while no reviewed activity offer exists for them.
    return isActivityCategory(row.category, row.subcategory)
      ? mapCanonicalAttraction(row)
      : mapCanonicalPlace(row);
  } catch {
    return null;
  }
}

const getApprovedActivityPlaces = requestCache(async (
  limit: number,
  islandSlug: string | null,
): Promise<PublicPlace[]> => {
  try {
    const supabase = createPublicClient();
    const { approved, canonical } = await getActivitiesWithCanonicalFallback(
      supabase,
      { limit, islandSlug },
    );
    return [
      ...approved.map(mapApprovedActivity),
      ...canonical.map(mapCanonicalAttraction),
    ];
  } catch {
    return [];
  }
});

async function getApprovedActivityById(
  id: string,
): Promise<PublicPlace | null> {
  if (!isUuid(id)) return null;
  try {
    const supabase = createPublicClient();
    const { approved, canonical } = await getActivitiesWithCanonicalFallback(
      supabase,
      { activityId: id, limit: 1 },
    );
    if (approved[0]) return mapApprovedActivity(approved[0]);
    return canonical[0] ? mapCanonicalAttraction(canonical[0]) : null;
  } catch {
    return null;
  }
}

function mapCanonicalPlace(row: CanonicalPlaceRow): PublicPlace {
  const category = displayCategory(row.category, row.subcategory);
  const slugOrId = row.slug ?? row.id;
  const metadata = row.metadata ?? {};
  const sourceUrl =
    stringOrNull(metadata.sourceUrl) ?? stringOrNull(metadata.source_url);
  const tripadvisorUrl =
    stringOrNull(metadata.tripadvisorUrl) ??
    stringOrNull(metadata.tripadvisor_url);
  const tripStyles = parseTripStyles(row.trip_styles);
  const businessStatus = stringOrNull(row.business_status);

  return {
    id: row.id,
    name: row.name,
    category,
    island: row.island_name,
    island_id: row.island_id,
    description:
      row.description ??
      row.short_description ??
      `Details for ${row.name} are being reviewed by Baha Buddy.`,
    image_url: row.primary_image_url ?? firstImageUrl(row.gallery_images),
    image_attribution: stringOrNull(metadata.image_attribution),
    tags: compactStrings([...(stringArray(row.tags) ?? []), row.subcategory]),
    rating: numberOrNull(row.rating),
    review_count: row.review_count ?? null,
    amenities: stringArray(row.amenities) ?? stringArray(metadata.amenities),
    price_range: row.price_level,
    short_description:
      row.short_description ??
      stringOrNull(metadata.short_description) ??
      row.description,
    enriched_at: row.updated_at,
    source_type: "canonical",
    source_id: row.id,
    source_label: row.is_verified
      ? "Verified by Baha Buddy"
      : "Baha Buddy data",
    source_url: sourceUrl,
    tripadvisor_url: tripadvisorUrl,
    tripadvisor_rating: numberOrNull(metadata.tripadvisor_rating),
    tripadvisor_num_reviews: integerOrNull(metadata.tripadvisor_num_reviews),
    phone: row.phone,
    website: row.website,
    address: row.address,
    hours: recordOrNull(row.opening_hours) ?? recordOrNull(metadata.hours),
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    pros: stringArray(metadata.pros),
    cons: stringArray(metadata.cons),
    is_verified: Boolean(row.is_verified),
    is_partner: Boolean(row.is_partner),
    detail_href: `/explore/places/${encodeURIComponent(slugOrId)}`,
    // Personalization + status fields, omitted when empty to keep card
    // payloads slim (OPERATIONAL is the default and is not sent).
    ...(tripStyles.length > 0 ? { trip_styles: tripStyles } : {}),
    ...(isPriceTier(row.price_tier) ? { price_tier: row.price_tier } : {}),
    ...(businessStatus && businessStatus !== "OPERATIONAL"
      ? { business_status: businessStatus }
      : {}),
  };
}

/** A canonical attraction shown while no reviewed activity offer exists for
 * it: catalog facts only, no price, duration or booking claims. */
function mapCanonicalAttraction(
  row: CanonicalAttractionRow | CanonicalPlaceRow,
): PublicPlace {
  return {
    ...mapCanonicalPlace(row as CanonicalPlaceRow),
    category: canonicalAttractionCategory(row),
    source_type: "canonical_attraction",
  };
}

function mapApprovedActivity(row: ApprovedActivityRow): PublicPlace {
  const card = approvedActivityCard(row);
  const contact = row.contact ?? {};
  const isTour = isApprovedTourRow(row);
  const category = isTour ? "Guided Tour" : "Activity";
  const priceLabel = activityPriceLabel(
    row.price_basis,
    row.booking_quote_state,
  );
  return {
    id: row.activity_id,
    name: row.name,
    category,
    island: cachedIslandLabel(row.island_slug),
    island_id: row.island_slug,
    description: row.description,
    image_url: card.photo_url ?? null,
    tags: row.category_tags,
    rating: null,
    review_count: null,
    amenities: null,
    // No price badge when the offer carries no amount or quote state.
    price_range: priceLabel === "Price N/A" ? null : priceLabel,
    short_description: row.description,
    enriched_at: row.source_checked_at,
    source_type: "approved_activity",
    source_id: row.source_record_id,
    // Traveler label; source_class is an internal enum.
    source_label: isTour ? "Baha Buddy guide" : row.source_owner,
    source_url: row.source_url,
    phone: stringOrNull(contact.phone),
    website: stringOrNull(contact.website),
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    detail_href: approvedActivityDetailHref(row.activity_id),
    duration_label: activityDurationLabel(row.duration),
    price_basis_label: priceLabel,
    booking_state_label: activityBookingLabel(row.booking_quote_state),
    meeting_pickup_label: factLabel(row.meeting_pickup),
    group_age_label: factLabel(row.group_age_limits),
    safety_access_label: factLabel(row.safety_access),
    cancellation_label: factLabel(row.cancellation),
    source_as_of_label: sourceAsOfLabel(
      row.source_checked_at,
      row.source_recheck_at,
    ),
    live_availability_state: row.live_availability_state,
  };
}

function mergePlaces(places: PublicPlace[]): PublicPlace[] {
  const byKey = new Map<string, PublicPlace>();

  for (const place of places) {
    const key = dedupeKey(place);
    if (!byKey.has(key)) {
      byKey.set(key, place);
      continue;
    }

    const existing = byKey.get(key)!;
    if (placeRank(place) > placeRank(existing)) {
      byKey.set(key, place);
    }
  }

  return Array.from(byKey.values());
}

function sortPlaces(places: PublicPlace[]): PublicPlace[] {
  return [...places].sort((a, b) => {
    const rank = placeRank(b) - placeRank(a);
    if (rank !== 0) return rank;
    const rating = (b.rating ?? 0) - (a.rating ?? 0);
    if (rating !== 0) return rating;
    const reviews = (b.review_count ?? 0) - (a.review_count ?? 0);
    if (reviews !== 0) return reviews;
    return a.name.localeCompare(b.name);
  });
}

function placeRank(place: PublicPlace): number {
  if (place.source_type === "approved_activity")
    return 50 + (place.image_url ? 2 : 0);
  if (
    place.source_type === "canonical" ||
    place.source_type === "canonical_attraction"
  )
    return 40 + (place.is_verified ? 5 : 0) + (place.image_url ? 2 : 0);
  if (place.source_type === "tripadvisor_restaurant")
    return 30 + (place.image_url ? 2 : 0);
  if (place.source_type === "cached_place")
    return 10 + (place.image_url ? 2 : 0);
  return 1;
}

function dedupeKey(place: PublicPlace): string {
  return [
    normalize(place.name),
    normalize(place.island ?? place.island_id ?? ""),
    broadCategory(place.category),
  ].join("|");
}

function broadCategory(category: string): string {
  const value = normalize(category);
  if (
    value.includes("restaurant") ||
    value.includes("dining") ||
    value.includes("food")
  )
    return "dining";
  if (
    value.includes("hotel") ||
    value.includes("resort") ||
    value.includes("stay") ||
    value.includes("villa")
  )
    return "stay";
  if (value.includes("beach")) return "beach";
  if (
    value.includes("water") ||
    value.includes("tour") ||
    value.includes("activity") ||
    value.includes("attraction")
  )
    return "activity";
  return value;
}

function isActivityCategory(
  category: string | null | undefined,
  subcategory?: string | null,
): boolean {
  // The canonical category is authoritative: a "beach bar and grill"
  // restaurant or a "beachfront villa resort" hotel is not an attraction.
  const primary = normalize(category ?? "");
  if (primary === "restaurant" || primary === "hotel") return false;
  if (primary === "attraction" || primary === "activity") return true;
  const value = normalize(`${category ?? ""} ${subcategory ?? ""}`);
  return [
    "activity",
    "attraction",
    "tour",
    "excursion",
    "beach",
    "water sport",
    "diving",
    "snorkel",
    "fishing",
    "culture",
    "landmark",
    "historic",
    "museum",
    "park",
  ].some((token) => value.includes(token));
}

function displayCategory(
  category: string,
  subcategory?: string | null,
): string {
  const primary = normalize(category ?? "");
  if (primary === "restaurant") return "Dining";
  if (primary === "hotel") return "Hotel";
  const source = (subcategory || category || "").trim();
  const normalized = normalize(source);
  if (
    normalized.includes("restaurant") ||
    normalized.includes("dining") ||
    normalized.includes("food")
  )
    return "Dining";
  if (
    normalized.includes("hotel") ||
    normalized.includes("resort") ||
    normalized.includes("stay") ||
    normalized.includes("villa")
  )
    return "Hotel";
  if (normalized.includes("beach")) return "Beach";
  if (
    normalized.includes("culture") ||
    normalized.includes("landmark") ||
    normalized.includes("historic")
  )
    return "Culture";
  if (
    normalized.includes("water") ||
    normalized.includes("diving") ||
    normalized.includes("snorkel") ||
    normalized.includes("fishing")
  )
    return "Water Activity";
  if (
    normalized.includes("tour") ||
    normalized.includes("activity") ||
    normalized.includes("attraction")
  )
    return "Activity";
  if (!source) return "Activity";
  return source
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function cachedIslandLabel(value: string | null): string | null {
  if (!value) return null;
  const labels: Record<string, string> = {
    abacos: "The Abacos",
    "the-abacos": "The Abacos",
    exuma: "The Exumas",
    exumas: "The Exumas",
    "the-exumas": "The Exumas",
    nassau: "Nassau & Paradise Island",
    "nassau-paradise-island": "Nassau & Paradise Island",
    "paradise-island": "Nassau & Paradise Island",
    "eleuthera-harbour-island": "Eleuthera & Harbour Island",
    "freeport-grand-bahama": "Grand Bahama",
    "grand-bahama": "Grand Bahama",
  };
  if (labels[value]) return labels[value];
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function numberOrNull(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function integerOrNull(value: unknown): number | null {
  const n = numberOrNull(value);
  return n === null ? null : Math.trunc(n);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const strings = value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object" || Array.isArray(item)) return "";
      const record = item as Record<string, unknown>;
      return stringOrNull(record.name) ?? stringOrNull(record.label) ?? "";
    })
    .filter(Boolean);
  return strings.length > 0 ? strings : null;
}

function firstImageUrl(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const item of value) {
    if (typeof item === "string" && item.trim()) return item.trim();
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const url = stringOrNull((item as Record<string, unknown>).url);
    if (url) return url;
  }
  return null;
}

function compactStrings(values: unknown[]): string[] {
  return values.map((value) => String(value ?? "").trim()).filter(Boolean);
}

function recordOrNull(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw.trim()) out[key] = raw.trim();
  }
  return Object.keys(out).length > 0 ? out : null;
}
