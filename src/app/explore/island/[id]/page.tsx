/**
 * /explore/island/[id] — the canonical island detail page.
 *
 * This is where DestinationCard in chat lands (per the chat-vs-detail
 * page split, decision §26). Marketing surface (outside the dashboard
 * route group, decision §2) so it can be crawled, indexed, and
 * shared without auth.
 *
 * URL slug system: mobile-canonical (`the-exumas`,
 * `nassau-paradise-island`, etc.) — matches `bahamas_attractions.island`
 * AND `ISLANDS[].slug` in `baha-images.ts`. One slug space, no
 * translation layer needed when chat-tools or mobile pass an island_id.
 *
 * Data sources, in priority order:
 *
 *   1. Sanity `destination` (matched on `islandId === slug`) — editorial
 *      overview (Portable Text), tagline, highlights, gallery,
 *      bestTimeToVisit, gettingThere, hero image.
 *
 *   2. Hardcoded `ISLAND_CONFIGS` (in `src/lib/island-config.ts`) —
 *      tagline, hero, vibe, bestTime, tripLength, description.
 *
 *   3. Supabase `tripadvisor_locations` — enriched restaurant cards,
 *      matching the public restaurant directory.
 *
 *   4. Supabase `bahamas_attractions`, `self_tours`, and
 *      `historic_landmarks` — activity, tour, and landmark feeds.
 *
 *   5. Open-Meteo via `fetchIslandWeather` and LiteAPI flight search
 *      deep links — weather and flight intent.
 *
 *   6. Supabase `bahamas_deals` — current limited-time offers.
 *
 * Static generation: `generateStaticParams` emits the hardcoded
 * ISLAND_CONFIGS slugs at build time. Sanity-only slugs resolve
 * on-demand (Next.js `dynamicParams: true` is the default) and cache
 * for `revalidate` seconds.
 *
 * Revalidation: 300 seconds so newly-published Sanity content
 * surfaces quickly without a redeploy.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import Image from "next/image";

import { createClient } from "@/lib/supabase/server";
import {
  ISLAND_CONFIGS,
  getIslandConfig,
  getIslandDbSlug,
} from "@/lib/island-config";
import { getIslandHero } from "@/lib/islands";
import { fetchArticles, fetchDestinationByIsland } from "@/lib/sanity/queries";
import {
  ARTICLE_CATEGORY_LABEL,
  type SanityArticleCard,
  type SanityDestination,
} from "@/lib/sanity/types";
import { fetchIslandWeather, type IslandWeather } from "@/lib/weather";

import ChatWidget from "@/components/ChatWidget";
import Footer from "@/components/Footer";
import PortableTextBody from "@/components/PortableTextBody";
import TrackView from "@/components/TrackView";
import ImageWithSourcePolicy from "@/components/marketplace/ImageWithSourcePolicy";
import { dealActionLinks } from "@/lib/deal-actions";
import { islandFoodLinks } from "@/lib/island-context-links";
import {
  formatCuisineLabel,
  getRestaurantIslandQueryNames,
  type TripAdvisorLocation,
} from "@/lib/tripadvisor/types";
import { buddyChatHref } from "@/lib/buddy-chat";
import { getStayStartingRates, type HotelStartingRate } from "@/lib/hotels";
import { stayIslandFilterLabel } from "@/lib/stay-island-filters";
import {
  readStaySearchParams,
  stayDetailUrl,
  staySearchUrl,
  type StaySearchParams,
} from "@/lib/stay-search-params";
import type { FaqItem } from "@/components/island/FaqAccordion";
import ImageGallery from "@/components/island/ImageGallery";

export const revalidate = 300;

const ISLAND_STAY_RATE_CACHE_SECONDS = 60 * 60;
const ISLAND_STAY_RATE_LOOKAHEAD_DAYS = 30;
const ISLAND_STAY_RATE_NIGHTS = 3;
const ISLAND_STAY_RATE_ADULTS = 2;
const ISLAND_STAY_RATE_ROOMS = 1;

// ─── Types ──────────────────────────────────────────────────────────────────

interface Attraction {
  id: string;
  name: string;
  category: string;
  island: string | null;
  description: string;
  image_url: string | null;
  tags: string[];
  rating: number | null;
  review_count: number | null;
  amenities: string[] | null;
  short_description: string | null;
  enriched_at: string | null;
}

interface Deal {
  id: string;
  title: string;
  deal_type: string;
  island: string | null;
  resort_name: string | null;
  description: string;
  price_from_usd: number | null;
  price_unit: string | null;
  image_url: string | null;
  highlights: string[];
  tags: string[];
  valid_through: string | null;
}

interface Landmark {
  id: string;
  name: string;
  landmark_type: string | null;
  location_area: string | null;
  short_description: string | null;
  why_it_matters: string | null;
  visitor_tips: string | null;
  opening_hours: string | null;
  entry_fee: string | null;
}

interface SelfTour {
  id: string;
  title: string;
  island: string;
  theme: string | null;
  estimated_duration: number | null;
  difficulty: string | null;
  cover_image_url: string | null;
  cruise_friendly: boolean;
  featured: boolean;
}

function portableTextToPlainText(value: unknown): string {
  const parts: string[] = [];
  const visit = (node: unknown) => {
    if (typeof node === "string") {
      const text = node.trim();
      if (text) parts.push(text);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node && typeof node === "object") {
      const record = node as Record<string, unknown>;
      if (typeof record.text === "string") visit(record.text);
      else if (record.children) visit(record.children);
    }
  };
  visit(value);
  return parts.join(" ");
}

interface FlightAccess {
  code: string;
  label: string;
  note: string;
}

interface StayPreview {
  id: string;
  name: string;
  island: string | null;
  city: string | null;
  star_rating: number | null;
  review_score: number | null;
  review_count: number | null;
  main_photo_url: string | null;
  photos: Array<
    string | { url?: string | null; caption?: string | null }
  > | null;
  property_type_name: string | null;
  description: string | null;
}

// ─── Supabase fetchers ──────────────────────────────────────────────────────

async function getIslandGalleryImages(slug: string): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("islands")
      .select("gallery_images")
      .eq("slug", slug)
      .single();
    if (!data?.gallery_images) return [];
    const imgs = data.gallery_images as unknown;
    return Array.isArray(imgs) ? (imgs as string[]).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function getIslandLandmarks(slug: string): Promise<Landmark[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("historic_landmarks")
      .select(
        "id, name, landmark_type, location_area, short_description, why_it_matters, visitor_tips, opening_hours, entry_fee",
      )
      .eq("island_slug", slug)
      .eq("status", "active")
      .limit(20);
    return (data as Landmark[]) ?? [];
  } catch {
    return [];
  }
}

async function getIslandTours(island: string): Promise<SelfTour[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("self_tours")
      .select(
        "id, title, island, theme, estimated_duration, difficulty, cover_image_url, cruise_friendly, featured",
      )
      .eq("island", island)
      .eq("is_active", true)
      .order("featured", { ascending: false })
      .limit(8);
    return (data as SelfTour[]) ?? [];
  } catch {
    return [];
  }
}

async function getIslandFaqs(slug: string): Promise<FaqItem[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("island_faq")
      .select("id, category, question, answer, traveller_type")
      .eq("island_slug", slug)
      .eq("status", "active")
      .order("category");
    return (data as FaqItem[]) ?? [];
  } catch {
    return [];
  }
}

async function getIslandAttractions(dbSlug: string): Promise<Attraction[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("bahamas_attractions")
      .select(
        "id, name, category, island, description, image_url, tags, rating, review_count, amenities, short_description, enriched_at",
      )
      .eq("island", dbSlug)
      .limit(24);
    return (data as Attraction[]) ?? [];
  } catch {
    return [];
  }
}

async function getIslandDeals(dbSlug: string): Promise<Deal[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("bahamas_deals")
      .select(
        "id, title, deal_type, island, resort_name, description, price_from_usd, price_unit, image_url, highlights, tags, valid_through",
      )
      .eq("island", dbSlug)
      .eq("is_active", true)
      .limit(6);
    return (data as Deal[]) ?? [];
  } catch {
    return [];
  }
}

async function getIslandRestaurants(
  islandName: string,
): Promise<TripAdvisorLocation[]> {
  try {
    const supabase = await createClient();
    const islandNames = getRestaurantIslandQueryNames(islandName);
    let query = supabase
      .from("tripadvisor_locations")
      .select("*")
      .eq("category", "restaurants")
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(6);

    query =
      typeof (query as { in?: unknown }).in === "function"
        ? (
            query as typeof query & {
              in: (column: string, values: string[]) => typeof query;
            }
          ).in("island_name", islandNames)
        : query.eq("island_name", islandName);

    const { data, error } = await query;
    if (error || !data) return [];
    return data as TripAdvisorLocation[];
  } catch {
    return [];
  }
}

async function getIslandStays(
  slug: string,
  islandName: string,
): Promise<StayPreview[]> {
  try {
    const supabase = await createClient();
    const aliases = stayIslandAliases(slug, islandName);
    let query = supabase
      .from("hotels")
      .select(
        "id, name, island, city, star_rating, review_score, review_count, main_photo_url, photos, property_type_name, description",
      )
      .eq("is_active", true)
      .order("star_rating", { ascending: false, nullsFirst: false })
      .order("review_score", { ascending: false, nullsFirst: false })
      .order("review_count", { ascending: false, nullsFirst: false })
      .limit(4);

    if (aliases.length > 0) {
      query = query.or(
        aliases
          .map((alias) => `island.ilike.%${escapePostgrestValue(alias)}%`)
          .join(","),
      );
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data as StayPreview[];
  } catch {
    return [];
  }
}

type IslandStayRateWindow = {
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
};

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultIslandStayRateWindow(now = new Date()): IslandStayRateWindow {
  const checkin = addUtcDays(now, ISLAND_STAY_RATE_LOOKAHEAD_DAYS);
  const checkout = addUtcDays(checkin, ISLAND_STAY_RATE_NIGHTS);
  return {
    checkin: isoDateOnly(checkin),
    checkout: isoDateOnly(checkout),
    adults: ISLAND_STAY_RATE_ADULTS,
    rooms: ISLAND_STAY_RATE_ROOMS,
  };
}

const getCachedIslandStayRates = unstable_cache(
  async ({
    hotelIds,
    checkin,
    checkout,
    adults,
  }: {
    hotelIds: string[];
    checkin: string;
    checkout: string;
    adults: number;
  }): Promise<HotelStartingRate[]> => {
    const rates = await getStayStartingRates({
      hotelIds,
      checkin,
      checkout,
      adults,
      currency: "USD",
      guestNationality: "US",
      limit: 4,
    });
    return Array.from(rates.values());
  },
  ["island-stay-preview-rates-v1"],
  { revalidate: ISLAND_STAY_RATE_CACHE_SECONDS },
);

async function getSafeIslandWeather(
  slug: string,
): Promise<IslandWeather | null> {
  try {
    return await fetchIslandWeather(slug, { fallbackToNassau: false });
  } catch {
    return null;
  }
}

async function getIslandGuides(
  slug: string,
  islandName: string,
): Promise<SanityArticleCard[]> {
  const articles = await fetchArticles();
  if (!articles || articles.length === 0) return [];

  const islandTokens = new Set(
    [
      slug,
      islandName,
      islandName.replace(/^The\s+/i, ""),
      ...islandName.split(/\s+/).filter((word) => word.length > 4),
    ]
      .map(normalizeSearchText)
      .filter(Boolean),
  );

  const matching = articles.filter((article) => {
    const haystack = normalizeSearchText(
      `${article.title} ${article.excerpt} ${article.category}`,
    );
    return Array.from(islandTokens).some(
      (token) => token && haystack.includes(token),
    );
  });

  return (matching.length > 0 ? matching : articles).slice(0, 3);
}

function groupAttractionsByCategory(
  attractions: Attraction[],
): Map<string, Attraction[]> {
  const groups = new Map<string, Attraction[]>();
  for (const a of attractions) {
    const cat = a.category || "other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(a);
  }
  return groups;
}

function formatPrice(price: number | null, unit: string | null): string {
  if (!price) return "Contact for price";
  const units: Record<string, string> = {
    per_night: "/night",
    per_person: "/person",
    per_day: "/day",
    per_charter: "/charter",
    total: " total",
  };
  return `From $${price.toLocaleString()}${unit ? (units[unit] ?? "") : ""}`;
}

function formatStayMoney(currency: string, amount: number): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${Math.round(amount).toLocaleString()}`;
  }
}

const COMPACT_STAY_MONTH_DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const COMPACT_STAY_DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  timeZone: "UTC",
});

function compactStayDateRangeLabel(
  params: Pick<StaySearchParams, "checkin" | "checkout">,
): string {
  if (params.checkin && params.checkout) {
    const start = new Date(`${params.checkin}T00:00:00Z`);
    const end = new Date(`${params.checkout}T00:00:00Z`);
    const startYear = start.getUTCFullYear();
    const endYear = end.getUTCFullYear();
    const sameYear = startYear === endYear;
    const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();

    if (sameMonth) {
      return `${COMPACT_STAY_MONTH_DAY_FORMAT.format(start)}-${COMPACT_STAY_DAY_FORMAT.format(end)}, ${startYear}`;
    }

    if (sameYear) {
      return `${COMPACT_STAY_MONTH_DAY_FORMAT.format(start)}-${COMPACT_STAY_MONTH_DAY_FORMAT.format(end)}, ${startYear}`;
    }

    return `${COMPACT_STAY_MONTH_DAY_FORMAT.format(start)}, ${startYear}-${COMPACT_STAY_MONTH_DAY_FORMAT.format(end)}, ${endYear}`;
  }

  if (params.checkin) return `From ${params.checkin}`;
  if (params.checkout) return `Until ${params.checkout}`;
  return "";
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePostgrestValue(value: string): string {
  return value.replace(/[(),]/g, " ");
}

function stayIslandAliases(slug: string, islandName: string): string[] {
  const aliases: Record<string, string[]> = {
    "nassau-paradise-island": ["Nassau", "New Providence", "Paradise Island"],
    "paradise-island": ["Paradise Island", "New Providence", "Nassau"],
    "the-exumas": ["Exuma", "The Exumas"],
    "eleuthera-harbour-island": ["Eleuthera", "Harbour Island"],
    "harbour-island": ["Harbour Island", "Eleuthera"],
    andros: ["Andros"],
    "grand-bahama": ["Grand Bahama", "Freeport"],
    bimini: ["Bimini"],
    "long-island": ["Long Island"],
    abacos: ["Abaco", "Abacos", "The Abacos"],
    "cat-island": ["Cat Island"],
    "san-salvador": ["San Salvador"],
    "berry-islands": ["Berry Islands", "Great Harbour Cay", "Chub Cay"],
    inagua: ["Inagua", "Great Inagua", "Matthew Town"],
  };
  return Array.from(
    new Set(
      [
        ...(aliases[slug] ?? []),
        islandName,
        islandName.replace(/^The\s+/i, ""),
      ].filter(Boolean),
    ),
  );
}

function validImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function stayPhotoUrl(stay: StayPreview): string | null {
  const main = validImageUrl(stay.main_photo_url);
  if (main) return main;
  for (const photo of stay.photos ?? []) {
    if (typeof photo === "string") {
      const url = validImageUrl(photo);
      if (url) return url;
      continue;
    }
    const url = validImageUrl(photo?.url);
    if (url) return url;
  }
  return null;
}

// ─── Visual maps ────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  attraction: "Attractions",
  beach: "Beaches",
  beach_bar: "Beach Bars",
  cultural: "Culture",
  diving: "Diving",
  event: "Events",
  fishing: "Fishing",
  food_culture: "Food & Drink",
  landmark: "Landmarks",
  national_park: "National Parks",
  natural_wonder: "Natural Wonders",
  snorkeling: "Snorkeling",
  wildlife: "Wildlife",
  other: "More to See",
};

const ISLAND_FLIGHT_ACCESS: Record<string, FlightAccess> = {
  "nassau-paradise-island": {
    code: "NAS",
    label: "Nassau",
    note: "Primary gateway for Nassau, Paradise Island, and New Providence trips.",
  },
  "paradise-island": {
    code: "NAS",
    label: "Nassau",
    note: "Fly into Nassau, then cross the bridge to Paradise Island.",
  },
  "the-exumas": {
    code: "EXU",
    label: "Exuma",
    note: "Best first search for Great Exuma and Exuma Cays itineraries.",
  },
  "eleuthera-harbour-island": {
    code: "ELH",
    label: "North Eleuthera",
    note: "Most useful for North Eleuthera, Harbour Island, and Spanish Wells access.",
  },
  "harbour-island": {
    code: "ELH",
    label: "North Eleuthera",
    note: "Fly into North Eleuthera, then connect by taxi and water taxi.",
  },
  andros: {
    code: "ASD",
    label: "Andros",
    note: "Use Andros Town as the first airport search, then confirm ground timing.",
  },
  "grand-bahama": {
    code: "FPO",
    label: "Freeport / Grand Bahama",
    note: "Primary commercial airport for Freeport and Grand Bahama stays.",
  },
  bimini: {
    code: "BIM",
    label: "Bimini",
    note: "Direct Bimini flights are date-sensitive, so verify before building boat days.",
  },
  "long-island": {
    code: "NAS",
    label: "Nassau gateway",
    note: "Start with Nassau, then ask Buddy to plan the Long Island onward connection.",
  },
  abacos: {
    code: "MHH",
    label: "Marsh Harbour / Abacos",
    note: "Best first search for Abaco island-hopping and sailing trips.",
  },
  "cat-island": {
    code: "TBI",
    label: "New Bight / Cat Island",
    note: "Start with New Bight, then confirm whether Arthur's Town works better for the stay.",
  },
  "san-salvador": {
    code: "ZSA",
    label: "San Salvador",
    note: "Best first search for San Salvador diving and quiet beach stays.",
  },
  "berry-islands": {
    code: "GHC",
    label: "Great Harbour Cay / Berry Islands",
    note: "Start with Great Harbour Cay, then ask Buddy to confirm cay-specific transfer timing.",
  },
  inagua: {
    code: "IGA",
    label: "Matthew Town / Inagua",
    note: "Remote schedules are limited, so confirm Inagua flights before building the trip plan.",
  },
};

// ─── Static params + metadata ───────────────────────────────────────────────

export async function generateStaticParams() {
  return ISLAND_CONFIGS.map((i) => ({ id: i.slug }));
}

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const config = getIslandConfig(params.id);
  const [sanity, dbHero] = await Promise.all([
    fetchDestinationByIsland(params.id),
    config ? getIslandHero(config.slug) : Promise.resolve(undefined),
  ]);

  if (!config && !sanity) return {};

  const name = sanity?.name ?? config?.name ?? params.id;
  const tagline = sanity?.tagline ?? config?.tagline ?? "";
  // Sanity hero wins when published; otherwise the DB-sourced URL from
  // `islands.hero_image_url`. We no longer fall back to BahaImages here.
  const heroUrl = sanity ? sanity.imageUrl : dbHero;

  return {
    title: `${name} — Bahamas Travel Guide | Baha Buddy`,
    description: `Plan the perfect trip to ${name}, Bahamas. ${tagline} Attractions, deals, and local tips.`,
    alternates: {
      canonical: `/explore/island/${params.id}`,
    },
    openGraph: {
      title: `${name} Travel Guide | Baha Buddy`,
      description: `Plan your ${name} trip — ${tagline}`,
      images: heroUrl ? [{ url: heroUrl }] : undefined,
    },
  };
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function IslandDetailPage({ params }: PageProps) {
  const config = getIslandConfig(params.id);
  // Supabase query slug. Configs override when shared with a sibling
  // (e.g. paradise-island queries nassau-paradise-island). Sanity-only
  // islands without a config fall back to the URL id directly.
  const dbSlug = config ? getIslandDbSlug(config) : params.id;

  // Sanity + Supabase/provider-backed fetches in parallel.
  const [
    sanity,
    attractions,
    deals,
    dbHero,
    galleryImages,
    landmarks,
    tours,
    faqs,
    restaurants,
    weather,
    guides,
    stays,
  ] = await Promise.all([
    fetchDestinationByIsland(params.id),
    getIslandAttractions(dbSlug),
    getIslandDeals(dbSlug),
    config ? getIslandHero(config.slug) : Promise.resolve(""),
    getIslandGalleryImages(dbSlug),
    getIslandLandmarks(dbSlug),
    getIslandTours(dbSlug),
    getIslandFaqs(dbSlug),
    getIslandRestaurants(config?.name ?? params.id),
    getSafeIslandWeather(params.id),
    getIslandGuides(params.id, config?.name ?? params.id),
    getIslandStays(params.id, config?.name ?? params.id),
  ]);

  // Neither hardcoded nor Sanity knows this slug, so render a 404.
  if (!config && !sanity) notFound();

  // Derived display fields (Sanity wins where present, config fills gaps).
  // Hero priority: Sanity image > islands table (DB) > empty (gradient placeholder).
  const name = sanity?.name ?? config!.name;
  const tagline = sanity?.tagline ?? config?.tagline ?? "";
  const heroUrl = sanity ? sanity.imageUrl : dbHero;
  const bestTime = sanity?.bestTimeToVisit ?? config?.bestTime ?? "Year-round";
  const overviewPortable = sanity?.overview;
  const overviewProse = config?.description ?? "";
  const sanityGallery = sanity?.gallery ?? [];
  const gallery = sanity
    ? sanityGallery
    : Array.from(new Set(galleryImages));
  const gettingThere = sanity?.gettingThere ?? null;
  const destinationFaqs: FaqItem[] = (sanity?.faqs ?? [])
    .map((faq, index) => ({
      id: `${sanity?._id ?? params.id}-faq-${index}`,
      category: "destination",
      question: faq.question,
      answer: portableTextToPlainText(faq.answer),
      traveller_type: null,
    }))
    .filter((faq) => faq.question.trim() && faq.answer.trim());
  const approvedFaqs = destinationFaqs.length > 0 ? destinationFaqs : faqs;
  const primaryImageUrl = heroUrl || gallery[0] || null;

  const attractionsByCategory = groupAttractionsByCategory(attractions);
  const flightAccess = ISLAND_FLIGHT_ACCESS[params.id] ?? {
    code: "NAS",
    label: "Nassau gateway",
    note: "Start with Nassau, then ask Buddy to plan the right island connection.",
  };

  const islandPath = `/explore/island/${params.id}`;
  const foodLinks = islandFoodLinks({
    islandName: name,
    islandSlug: params.id,
    returnPath: islandPath,
  });
  const islandPlacesHref = `/explore/places?island=${encodeURIComponent(name)}`;
  const stayIsland =
    stayIslandFilterLabel(name) || stayIslandFilterLabel(params.id) || name;
  const stayRateWindow = defaultIslandStayRateWindow();
  const staySearchContext = readStaySearchParams({
    island: stayIsland,
    sort: "stars",
    checkin: stayRateWindow.checkin,
    checkout: stayRateWindow.checkout,
    adults: String(stayRateWindow.adults),
    rooms: String(stayRateWindow.rooms),
  });
  const islandStaysHref = staySearchUrl(staySearchContext, {});
  const islandFlightsHref = `/flights?destination=${encodeURIComponent(flightAccess.code)}`;
  const islandGuidesHref = "/guides";
  const askBuddyHref = buddyChatHref(
    `Help me plan a trip to ${name}. Include flights, where to stay, restaurants, activities, weather, and realistic timing.`,
  );
  const stayRateList =
    stays.length > 0
      ? await getCachedIslandStayRates({
          hotelIds: stays.map((stay) => stay.id),
          checkin: stayRateWindow.checkin,
          checkout: stayRateWindow.checkout,
          adults: stayRateWindow.adults,
        })
      : [];
  const stayRateMap = new Map(stayRateList.map((rate) => [rate.hotelId, rate]));
  const stayRateDateLabel = compactStayDateRangeLabel(staySearchContext);
  const previewStays = [...stays]
    .sort(
      (a, b) => Number(stayRateMap.has(b.id)) - Number(stayRateMap.has(a.id)),
    )
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-[#f7faff] text-night">
      <TrackView
        event="island_viewed"
        props={{ island_id: params.id, island_name: name }}
      />

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <header className="mb-5">
          <nav
            aria-label="Breadcrumb"
            className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-500"
          >
            <Link href="/" className="hover:text-night">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/explore" className="hover:text-night">
              Islands
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-night">{name}</span>
          </nav>
          <h1 className="text-5xl font-bold leading-none text-night ">
            {name}
          </h1>
          <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-charcoal">
            {tagline ||
              "Plan where to stay, what to do, and how this island fits your Bahamas trip."}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PrimaryAction
              href={foodLinks.startTripHref}
              label="Start island trip"
              icon="spark"
            />
            <SecondaryAction
              href={islandFlightsHref}
              label="Search flights"
              icon="plane"
            />
            <SecondaryAction
              href={islandStaysHref}
              label="Browse stays"
              icon="bed"
            />
            <SecondaryAction
              href={islandPlacesHref}
              label="Things to do"
              icon="pin"
            />
          </div>
          <LiveFeedsPanel
            islandName={name}
            flightsHref={islandFlightsHref}
            staysHref={islandStaysHref}
            restaurantsHref={foodLinks.restaurantsHref}
            placesHref={islandPlacesHref}
            guidesHref={islandGuidesHref}
            askBuddyHref={askBuddyHref}
            flightAccess={flightAccess}
            weather={weather}
            stayCount={previewStays.length}
            stayRateCount={stayRateMap.size}
            restaurantCount={restaurants.length}
            attractionCount={attractions.length}
            guideCount={guides.length}
            tourCount={tours.length}
            landmarkCount={landmarks.length}
          />
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <ImageWithSourcePolicy
              src={primaryImageUrl}
              alt={name}
              title={name}
              eyebrow="Island guide"
              tone="island"
              className="h-64 rounded-baha-lg border border-gray-200 shadow-sm sm:aspect-[16/5] sm:h-auto sm:min-h-[300px]"
              imageClassName="object-cover"
              sizes="(max-width: 768px) 100vw, 900px"
              priority
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <AboutPanel
                name={name}
                overviewPortable={overviewPortable}
                overviewProse={overviewProse}
                imageUrl={gallery[0] ?? primaryImageUrl}
                href={askBuddyHref}
              />
              <FlightRoutesPanel
                islandName={name}
                flightAccess={flightAccess}
                flightsHref={islandFlightsHref}
                gettingThere={gettingThere}
              />
            </div>

            {sanity && <DestinationPlanningDetails destination={sanity} />}

            <div className="grid gap-4 lg:grid-cols-2">
              <CompactSection
                title="Top restaurants"
                actionLabel="View all restaurants"
                actionHref={foodLinks.restaurantsHref}
              >
                {restaurants.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {restaurants.slice(0, 4).map((restaurant) => (
                      <RestaurantTile
                        key={restaurant.id}
                        restaurant={restaurant}
                      />
                    ))}
                  </div>
                ) : (
                  <CompactEmpty
                    title="Restaurant feed is being enriched"
                    href={foodLinks.restaurantsHref}
                    actionLabel="Browse dining"
                  />
                )}
              </CompactSection>

              <CompactSection
                title="Things to do"
                actionLabel="View all activities"
                actionHref={islandPlacesHref}
              >
                {attractionsByCategory.size > 0 ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {Array.from(attractionsByCategory.entries())
                      .slice(0, 4)
                      .map(([category, items]) => (
                        <ActivityCategoryTile
                          key={category}
                          category={category}
                          count={items.length}
                          sample={items[0]}
                        />
                      ))}
                  </div>
                ) : (
                  <CompactEmpty
                    title="Activity feed is being enriched"
                    href={islandPlacesHref}
                    actionLabel="Browse places"
                  />
                )}
              </CompactSection>
            </div>

            <CompactSection
              title="Where to stay"
              actionLabel="View all stays"
              actionHref={islandStaysHref}
            >
              {previewStays.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {previewStays.map((stay) => (
                    <StayTile
                      key={stay.id}
                      stay={stay}
                      rate={stayRateMap.get(stay.id)}
                      rateDateLabel={stayRateDateLabel}
                      searchContext={staySearchContext}
                    />
                  ))}
                </div>
              ) : (
                <CompactEmpty
                  title="Stay inventory is being enriched"
                  href={islandStaysHref}
                  actionLabel="Search stays"
                />
              )}
            </CompactSection>

            <div className="grid gap-4 lg:grid-cols-2">
              <CompactSection
                title="Guided tours"
                actionLabel="View all tours"
                actionHref={islandPlacesHref}
              >
                {tours.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {tours.slice(0, 4).map((tour) => (
                      <TourTile key={tour.id} tour={tour} />
                    ))}
                  </div>
                ) : (
                  <CompactEmpty
                    title="Tour feed is being curated"
                    href={islandPlacesHref}
                    actionLabel="Browse activities"
                  />
                )}
              </CompactSection>

              <CompactSection
                title="Historic landmarks"
                actionLabel="View all sites"
                actionHref={islandPlacesHref}
              >
                {landmarks.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {landmarks.slice(0, 4).map((landmark) => (
                      <LandmarkTile key={landmark.id} landmark={landmark} />
                    ))}
                  </div>
                ) : (
                  <CompactEmpty
                    title="Historic site feed is being curated"
                    href={askBuddyHref}
                    actionLabel="Ask Buddy"
                  />
                )}
              </CompactSection>
            </div>

            {gallery.length > 1 && (
              <CompactSection
                title="Island gallery"
                actionLabel="Open gallery"
                actionHref={islandPlacesHref}
              >
                <ImageGallery images={gallery.slice(0, 6)} alt={name} />
              </CompactSection>
            )}

            {guides.length > 0 && (
              <CompactSection
                title="Planning guides"
                actionLabel="Browse guides"
                actionHref="/guides"
              >
                <div className="grid gap-3 md:grid-cols-3">
                  {guides.slice(0, 3).map((guide) => (
                    <GuideTile key={guide._id} guide={guide} />
                  ))}
                </div>
              </CompactSection>
            )}

            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.35fr]">
              <FaqPreview name={name} faqs={approvedFaqs} askBuddyHref={askBuddyHref} />
              <IslandBuddyBanner name={name} href={foodLinks.startTripHref} />
            </div>

            <TrustStrip />
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <WeatherSideCard
              islandName={name}
              weather={weather}
              bestTime={bestTime}
            />
            <DealsSideCard deals={deals} returnPath={islandPath} />
          </aside>
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase text-gray-500">
            Explore other islands
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {ISLAND_CONFIGS.filter((i) => i.slug !== params.id).map(
              (island) => (
                <Link
                  key={island.slug}
                  href={`/explore/island/${island.slug}`}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-charcoal transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-night"
                >
                  {island.name}
                </Link>
              ),
            )}
          </div>
        </div>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function LiveFeedsPanel({
  islandName,
  flightsHref,
  staysHref,
  restaurantsHref,
  placesHref,
  guidesHref,
  askBuddyHref,
  flightAccess,
  weather,
  stayCount,
  stayRateCount,
  restaurantCount,
  attractionCount,
  guideCount,
  tourCount,
  landmarkCount,
}: {
  islandName: string;
  flightsHref: string;
  staysHref: string;
  restaurantsHref: string;
  placesHref: string;
  guidesHref: string;
  askBuddyHref: string;
  flightAccess: FlightAccess;
  weather: IslandWeather | null;
  stayCount: number;
  stayRateCount: number;
  restaurantCount: number;
  attractionCount: number;
  guideCount: number;
  tourCount: number;
  landmarkCount: number;
}) {
  const primaryFeeds = [
    {
      label: "Flights",
      value: `To ${flightAccess.code}`,
      helper: "Check live routes",
      href: flightsHref,
      icon: "plane",
    },
    {
      label: "Weather",
      value:
        weather?.tempF != null ? `${Math.round(weather.tempF)}°F` : "Forecast",
      helper: "This week",
      href: "#weather",
      icon: "sun",
    },
    {
      label: "Stays",
      value: stayCount > 0 ? `${stayCount} featured` : "Search live",
      helper:
        stayRateCount > 0
          ? `${stayRateCount} cached rates`
          : "Live rates loading",
      href: staysHref,
      icon: "bed",
    },
  ];
  const exploreFeeds = [
    {
      label: "Restaurants",
      value: restaurantCount > 0 ? `${restaurantCount} loaded` : "Browse feed",
      href: restaurantsHref,
      icon: "dining",
    },
    {
      label: "Activities",
      value:
        attractionCount > 0 ? `${attractionCount} experiences` : "Browse feed",
      href: placesHref,
      icon: "activity",
    },
    {
      label: "Guides",
      value: guideCount > 0 ? `${guideCount} available` : "Available",
      href: guidesHref,
      icon: "guide",
    },
    {
      label: "Tours",
      value: tourCount > 0 ? `${tourCount} upcoming` : "Plan routes",
      href: placesHref,
      icon: "tour",
    },
    {
      label: "Historic sites",
      value: landmarkCount > 0 ? `${landmarkCount} to explore` : "Ask Buddy",
      href: placesHref,
      icon: "landmark",
    },
  ];

  return (
    <section
      data-testid="island-live-feeds"
      className="mt-5 rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-gray-500">
            Live planning snapshot
          </p>
          <p className="mt-0.5 text-sm font-semibold text-charcoal">
            {islandName} trip signals, grouped by user intent.
          </p>
        </div>
        <Link
          href={askBuddyHref}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-gold-400 px-3 text-sm font-bold text-night transition-colors hover:bg-gold-500"
        >
          <IslandIcon type="chat" />
          Ask Buddy
        </Link>
      </div>
      <nav aria-label={`${islandName} live feeds`}>
        <div className="grid gap-2 md:grid-cols-3">
          {primaryFeeds.map((feed) => (
            <Link
              key={feed.label}
              href={feed.href}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/70 px-3 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm [&>svg]:h-4 [&>svg]:w-4">
                <IslandIcon type={feed.icon} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold uppercase text-gray-500">
                  {feed.label}
                </span>
                <span className="block truncate text-base font-bold text-night">
                  {feed.value}
                </span>
                <span className="block truncate text-xs font-semibold text-charcoal">
                  {feed.helper}
                </span>
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center">
          <span className="shrink-0 text-xs font-bold uppercase text-gray-500">
            Explore next
          </span>
          <div className="flex min-w-0 flex-wrap gap-2">
            {exploreFeeds.map((feed) => (
              <Link
                key={feed.label}
                href={feed.href}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-xs font-bold text-night transition-colors hover:border-brand-200 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <span className="text-brand-600 [&>svg]:h-3.5 [&>svg]:w-3.5">
                  <IslandIcon type={feed.icon} />
                </span>
                <span>{feed.label}</span>
                <span className="font-semibold text-gray-500">
                  {feed.value}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </section>
  );
}

function PrimaryAction({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
    >
      <IslandIcon type={icon} />
      {label}
    </Link>
  );
}

function SecondaryAction({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-bold text-brand-600 transition-colors hover:border-brand-300 hover:bg-brand-50"
    >
      <IslandIcon type={icon} />
      {label}
    </Link>
  );
}

function IslandIcon({ type }: { type: string }) {
  const common = {
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };
  if (type === "plane") {
    return (
      <svg {...common}>
        <path d="M3 12 21 4l-6 16-4-7-8-1Z" />
        <path d="m11 13 4-4" />
      </svg>
    );
  }
  if (type === "sun") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    );
  }
  if (type === "bed") {
    return (
      <svg {...common}>
        <path d="M4 11V5" />
        <path d="M20 13v6" />
        <path d="M4 19v-8" />
        <path d="M4 13h16" />
        <path d="M7 11h4" />
        <path d="M11 11V7H7v4" />
      </svg>
    );
  }
  if (type === "pin") {
    return (
      <svg {...common}>
        <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" />
        <circle cx="12" cy="11" r="2" />
      </svg>
    );
  }
  if (type === "dining") {
    return (
      <svg {...common}>
        <path d="M7 3v8" />
        <path d="M4 3v8" />
        <path d="M10 3v8" />
        <path d="M4 8h6" />
        <path d="M7 11v10" />
        <path d="M17 3v18" />
        <path d="M14 3h3a3 3 0 0 1 3 3v5h-6V3Z" />
      </svg>
    );
  }
  if (type === "activity") {
    return (
      <svg {...common}>
        <path d="M4 17c4-5 8-5 16-1" />
        <path d="M4 12c3-3 6-3 10-1" />
        <path d="M12 4v4" />
        <path d="m9 6 3-3 3 3" />
      </svg>
    );
  }
  if (type === "guide") {
    return (
      <svg {...common}>
        <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
        <path d="M8 4v13a3 3 0 0 0 3 3" />
        <path d="M9 8h6" />
        <path d="M9 12h5" />
      </svg>
    );
  }
  if (type === "tour") {
    return (
      <svg {...common}>
        <path d="M6 17h12l1-5H5l1 5Z" />
        <path d="M8 17v2" />
        <path d="M16 17v2" />
        <path d="M7 12V7h10v5" />
        <path d="M9 9h6" />
      </svg>
    );
  }
  if (type === "landmark") {
    return (
      <svg {...common}>
        <path d="M4 20h16" />
        <path d="M6 20V10" />
        <path d="M18 20V10" />
        <path d="M4 10h16" />
        <path d="m12 4 8 6H4l8-6Z" />
        <path d="M10 20v-6" />
        <path d="M14 20v-6" />
      </svg>
    );
  }
  if (type === "chat") {
    return (
      <svg {...common}>
        <path d="M5 18 3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5Z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </svg>
    );
  }
  if (type === "spark") {
    return (
      <svg {...common}>
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3v18" />
      <path d="M3 12h18" />
    </svg>
  );
}

function AboutPanel({
  name,
  overviewPortable,
  overviewProse,
  imageUrl,
  href,
}: {
  name: string;
  overviewPortable: unknown[] | null | undefined;
  overviewProse: string;
  imageUrl: string | null;
  href: string;
}) {
  return (
    <section className="grid min-h-[190px] overflow-hidden rounded-baha-lg border border-gray-200 bg-white shadow-sm md:grid-cols-[1fr_140px] 2xl:grid-cols-[1fr_180px]">
      <div className="p-5">
        <h2 className="text-lg font-bold text-night">About {name}</h2>
        <div className="mt-3 line-clamp-5 text-sm font-medium leading-6 text-charcoal">
          {overviewPortable && overviewPortable.length > 0 ? (
            <PortableTextBody body={overviewPortable} />
          ) : (
            <p>{overviewProse}</p>
          )}
        </div>
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-600"
        >
          Plan around {name}
          <span aria-hidden="true">›</span>
        </Link>
      </div>
      <ImageWithSourcePolicy
        src={imageUrl}
        alt={`${name} detail`}
        title={name}
        eyebrow="Island"
        tone="island"
        className="hidden h-full min-h-[190px] rounded-none border-l border-gray-200 md:block"
        imageClassName="object-cover"
      />
    </section>
  );
}

function FlightRoutesPanel({
  islandName,
  flightAccess,
  flightsHref,
  gettingThere,
}: {
  islandName: string;
  flightAccess: FlightAccess;
  flightsHref: string;
  gettingThere: string | null;
}) {
  const sampleRoutes = [
    { carrier: "JetBlue", origin: "New York", code: "JFK" },
    { carrier: "Delta", origin: "Atlanta", code: "ATL" },
    { carrier: "American", origin: "Miami", code: "MIA" },
  ];
  return (
    <section className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-night">
          Getting there / Flights
        </h2>
        <Link href={flightsHref} className="text-xs font-bold text-brand-600">
          View all flights
        </Link>
      </div>
      <div className="mt-4 divide-y divide-gray-100">
        {sampleRoutes.map((route) => (
          <div
            key={`${route.carrier}-${route.code}`}
            className="grid grid-cols-[72px_minmax(0,1fr)_22px_32px_auto] items-center gap-1.5 py-2.5 text-sm"
          >
            <p className="truncate font-bold text-night">
              {route.carrier}
            </p>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-night ">
                {route.origin} ({route.code})
              </p>
              <p className="truncate text-xs font-semibold text-gray-500">
                Nonstop when available
              </p>
            </div>
            <span className="text-center text-gray-400" aria-hidden="true">
              ›
            </span>
            <span className="text-xs font-bold text-gray-500">
              {flightAccess.code}
            </span>
            <span className="whitespace-nowrap text-xs font-bold text-brand-600">
              Search live
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-charcoal">
        {gettingThere ||
          `${flightAccess.note} Search live fares before locking the ${islandName} itinerary.`}
      </p>
    </section>
  );
}

function DestinationPlanningDetails({
  destination,
}: {
  destination: SanityDestination;
}) {
  const tripFit = destination.tripFit;
  const tripFitRows = ([
    ["Vibe", tripFit?.vibe],
    ["Pace", tripFit?.pace],
    ["Recommended stay", tripFit?.recommendedStay],
    ["Best for", tripFit?.bestFor?.join(", ")],
    ["Not ideal for", tripFit?.notIdealFor],
  ] as Array<[string, string | null | undefined]>)
    .filter((row): row is [string, string] => Boolean(row[1]?.trim()));
  const hasPracticalNotes = Boolean(destination.practicalNotes?.length);
  const hasContent =
    destination.highlights.length > 0 ||
    destination.gateways.length > 0 ||
    tripFitRows.length > 0 ||
    hasPracticalNotes;

  if (!hasContent) return null;

  return (
    <section className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-night">Plan the right island stay</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {destination.highlights.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-night">Highlights</h3>
            <div className="mt-2 space-y-3">
              {destination.highlights.map((highlight, index) => (
                <div key={`${highlight.label}-${index}`}>
                  <p className="text-sm font-bold text-night">{highlight.label}</p>
                  {highlight.description && (
                    <p className="mt-1 text-sm font-medium leading-6 text-charcoal">
                      {highlight.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tripFitRows.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-night">Trip fit</h3>
            <dl className="mt-2 space-y-2">
              {tripFitRows.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[120px_1fr] gap-3 text-sm">
                  <dt className="font-bold text-gray-500">{label}</dt>
                  <dd className="font-medium text-charcoal">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {destination.gateways.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-night">Airports, ferries and ports</h3>
            <div className="mt-2 space-y-3">
              {destination.gateways.map((gateway, index) => (
                <div key={`${gateway.name}-${index}`}>
                  <p className="text-sm font-bold text-night">
                    {gateway.name}{gateway.code ? ` · ${gateway.code}` : ""}
                  </p>
                  {gateway.note && (
                    <p className="mt-1 text-sm font-medium leading-6 text-charcoal">
                      {gateway.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasPracticalNotes && (
          <div>
            <h3 className="text-sm font-bold text-night">Practical notes</h3>
            <div className="mt-2 text-sm font-medium leading-6 text-charcoal">
              <PortableTextBody body={destination.practicalNotes ?? []} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function CompactSection({
  title,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  actionLabel: string;
  actionHref: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-night">{title}</h2>
        <Link href={actionHref} className="text-xs font-bold text-brand-600">
          {actionLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

function CompactEmpty({
  title,
  href,
  actionLabel,
}: {
  title: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
      <p className="text-sm font-bold text-night">{title}</p>
      <Link
        href={href}
        className="mt-2 inline-flex text-xs font-bold text-brand-600"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function RestaurantTile({ restaurant }: { restaurant: TripAdvisorLocation }) {
  const heroPhoto = restaurant.photos?.[0]?.url ?? null;
  const detailHref = `/restaurants/${restaurant.location_id || restaurant.id}`;
  return (
    <Link href={detailHref} className="group block">
      {heroPhoto ? (
        <ImageWithSourcePolicy
          src={heroPhoto}
          alt={restaurant.name}
          title={restaurant.name}
          eyebrow="Dining"
          className="aspect-[4/2.7] rounded-lg"
          imageClassName="object-cover transition-transform duration-500 group-hover:scale-105"
          tone="neutral"
        />
      ) : (
        <div className="flex aspect-[4/2.7] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-brand-600">
          <IslandIcon type="dining" />
        </div>
      )}
      <p className="mt-2 truncate text-xs font-bold text-night">
        {restaurant.name}
      </p>
      <p className="text-xs font-semibold text-gray-500">
        {restaurant.cuisine_types?.[0]
          ? formatCuisineLabel(restaurant.cuisine_types[0])
          : "Dining"}
        {restaurant.rating ? ` · ${restaurant.rating.toFixed(1)}` : ""}
      </p>
    </Link>
  );
}

function StayTile({
  stay,
  rate,
  rateDateLabel,
  searchContext,
}: {
  stay: StayPreview;
  rate: HotelStartingRate | undefined;
  rateDateLabel: string;
  searchContext: StaySearchParams;
}) {
  const photo = stayPhotoUrl(stay);
  const detailHref = stayDetailUrl(stay.id, searchContext);
  return (
    <Link href={detailHref} className="group block">
      {photo ? (
        <ImageWithSourcePolicy
          src={photo}
          alt={stay.name}
          title={stay.name}
          eyebrow={stay.property_type_name ?? "Stay"}
          className="aspect-[4/2.7] rounded-lg"
          imageClassName="object-cover transition-transform duration-500 group-hover:scale-105"
          tone="stay"
        />
      ) : (
        <div className="flex aspect-[4/2.7] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-brand-600">
          <IslandIcon type="bed" />
        </div>
      )}
      <p className="mt-2 truncate text-xs font-bold text-night">{stay.name}</p>
      <p className="text-xs font-semibold text-gray-500">
        {stay.star_rating
          ? `${Math.floor(stay.star_rating)} star`
          : (stay.property_type_name ?? "Stay")}
        {stay.review_score ? ` · ${stay.review_score.toFixed(1)}` : ""}
      </p>
      <div className="mt-2 rounded-lg border border-brand-100 bg-brand-50/60 px-2 py-1.5">
        <p className="text-xs font-bold uppercase text-gray-500">
          Starting nightly rate
        </p>
        {rate ? (
          <>
            <p className="text-sm font-bold text-night">
              {formatStayMoney(rate.currency, rate.nightly)}
              <span className="text-xs font-semibold text-gray-500">
                {" "}
                / night
              </span>
            </p>
            <p className="truncate text-xs font-semibold text-gray-500">
              {rateDateLabel} · {rate.nights} night
              {rate.nights === 1 ? "" : "s"}
            </p>
          </>
        ) : (
          <p className="text-xs font-bold text-night">Check live rate</p>
        )}
      </div>
    </Link>
  );
}

function ActivityCategoryTile({
  category,
  count,
  sample,
}: {
  category: string;
  count: number;
  sample: Attraction;
}) {
  const label = CATEGORY_LABELS[category] ?? category;
  return (
    <Link
      href={`/explore/places?category=${encodeURIComponent(category)}&island=${encodeURIComponent(sample.island ?? "")}`}
      className="group block"
    >
      {sample.image_url ? (
        <ImageWithSourcePolicy
          src={sample.image_url}
          alt={label}
          title={label}
          eyebrow="Activity"
          className="aspect-[4/2.7] rounded-lg"
          imageClassName="object-cover transition-transform duration-500 group-hover:scale-105"
          tone="activity"
        />
      ) : (
        <div className="flex aspect-[4/2.7] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-brand-600">
          <IslandIcon type="activity" />
        </div>
      )}
      <p className="mt-2 truncate text-xs font-bold text-night">{label}</p>
      <p className="text-xs font-semibold text-gray-500">
        {count} {count === 1 ? "experience" : "experiences"}
      </p>
    </Link>
  );
}

function TourTile({ tour }: { tour: SelfTour }) {
  return (
    <Link href={`/tours/${tour.id}`} className="group block">
      {tour.cover_image_url ? (
        <ImageWithSourcePolicy
          src={tour.cover_image_url}
          alt={tour.title}
          title={tour.title}
          eyebrow={tour.theme ?? "Tour"}
          className="aspect-[4/2.7] rounded-lg"
          imageClassName="object-cover transition-transform duration-500 group-hover:scale-105"
          tone="activity"
        />
      ) : (
        <div className="flex aspect-[4/2.7] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-brand-600">
          <IslandIcon type="tour" />
        </div>
      )}
      <p className="mt-2 truncate text-xs font-bold text-night">{tour.title}</p>
      <p className="text-xs font-semibold text-gray-500">
        {tour.theme ?? "Self-guided"}
      </p>
    </Link>
  );
}

function LandmarkTile({ landmark }: { landmark: Landmark }) {
  return (
    <div className="block">
      <div className="flex aspect-[4/2.7] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-brand-600">
        <LandmarkIcon type={landmark.landmark_type} />
      </div>
      <p className="mt-2 truncate text-xs font-bold text-night">
        {landmark.name}
      </p>
      <p className="text-xs font-semibold text-gray-500">
        {landmark.landmark_type?.replace(/_/g, " ") ?? "Historic site"}
      </p>
    </div>
  );
}

function GuideTile({ guide }: { guide: SanityArticleCard }) {
  const categoryLabel =
    ARTICLE_CATEGORY_LABEL[guide.category] ?? guide.category;
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="block rounded-xl border border-gray-200 p-3 transition-colors hover:bg-gray-50"
    >
      <p className="text-xs font-bold uppercase text-gray-500">
        {categoryLabel}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-bold text-night">
        {guide.title}
      </p>
      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-charcoal">
        {guide.excerpt}
      </p>
    </Link>
  );
}

function FaqPreview({
  name,
  faqs,
  askBuddyHref,
}: {
  name: string;
  faqs: FaqItem[];
  askBuddyHref: string;
}) {
  const shown = faqs.slice(0, 4);
  return (
    <section className="rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-night">FAQ</h2>
        <Link href={askBuddyHref} className="text-xs font-bold text-brand-600">
          Ask Buddy
        </Link>
      </div>
      {shown.length > 0 ? (
        shown.map((faq) => (
          <details
            key={faq.id}
            className="border-t border-gray-100 py-2 first:border-t-0"
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-night [&::-webkit-details-marker]:hidden">
              {faq.question}
            </summary>
            <p className="mt-2 text-sm font-medium leading-6 text-charcoal">
              {faq.answer}
            </p>
          </details>
        ))
      ) : (
        <p className="text-sm font-medium leading-6 text-charcoal">
          Ask Buddy about passports, weather, getting around, and where {name}{" "}
          fits your trip.
        </p>
      )}
    </section>
  );
}

function IslandBuddyBanner({ name, href }: { name: string; href: string }) {
  return (
    <section className="relative overflow-hidden rounded-baha-lg border border-brand-200 bg-white p-5 shadow-sm">
      <div className="max-w-[70%]">
        <h2 className="text-2xl font-bold text-night">
          Plan your perfect {name} trip with Buddy
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-charcoal">
          Get a personalized itinerary, smart recommendations, and real-time
          updates in one place.
        </p>
        <Link
          href={href}
          className="mt-4 inline-flex rounded-md bg-gold-400 px-5 py-3 text-sm font-bold text-night transition-colors hover:bg-gold-500"
        >
          Plan with Buddy
        </Link>
      </div>
      <Image
        src="/brand/buddy-avatar.png"
        alt=""
        width={160}
        height={160}
        className="absolute bottom-0 right-3 hidden h-32 w-32 object-contain sm:block"
      />
    </section>
  );
}

function TrustStrip() {
  const items = [
    ["Personalized island itineraries", "Built around your travel style"],
    ["Real-time local insights", "Weather, deals, and more"],
    ["Book with confidence", "Top-rated stays, tours, and more"],
    ["24/7 AI trip support", "Buddy is here to help"],
  ];
  return (
    <section className="grid gap-3 rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-4">
      {items.map(([title, body]) => (
        <div key={title} className="flex gap-3">
          <span className="mt-0.5 text-brand-600">
            <IslandIcon type="spark" />
          </span>
          <div>
            <p className="text-sm font-bold text-night">{title}</p>
            <p className="text-xs font-semibold text-gray-500">{body}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function WeatherSideCard({
  islandName,
  weather,
  bestTime,
}: {
  islandName: string;
  weather: IslandWeather | null;
  bestTime: string;
}) {
  return (
    <section
      id="weather"
      className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-night">Weather this week</h2>
        <span className="text-xs font-bold text-brand-600">Live forecast</span>
      </div>
      {weather ? (
        <>
          <div
            data-testid="weather-forecast-strip"
            className="grid grid-cols-7 gap-1.5"
          >
            {weather.forecast.slice(0, 7).map((day, index) => (
              <div
                key={day.date}
                className="rounded-lg bg-gray-50 px-1.5 py-2 text-center"
              >
                <p className="truncate text-xs font-bold text-night">
                  {index === 0 ? "Today" : formatForecastDate(day.date)}
                </p>
                <div className="mt-1 flex items-center justify-center gap-1 text-gold-500 [&>svg]:h-3.5 [&>svg]:w-3.5">
                  <IslandIcon type="sun" />
                  <span className="text-xs font-bold text-night">
                    {day.highF != null ? `${Math.round(day.highF)}°` : "--"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-semibold text-gray-500">
                  {day.lowF != null ? `${Math.round(day.lowF)}°` : "--"}
                </p>
              </div>
            ))}
          </div>
          <dl className="mt-4 grid gap-2 border-t border-gray-100 pt-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs font-bold uppercase text-gray-500">
                Condition
              </dt>
              <dd className="mt-0.5 truncate font-bold text-night">
                {weather.condition}
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs font-bold uppercase text-gray-500">
                Wind
              </dt>
              <dd className="mt-0.5 font-bold text-night">
                {weather.windMph != null
                  ? `${Math.round(weather.windMph)} mph`
                  : "Updating"}
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs font-bold uppercase text-gray-500">
                Best time
              </dt>
              <dd className="mt-0.5 truncate font-bold text-night">
                {bestTime}
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="text-sm font-medium leading-6 text-charcoal">
          Weather for {islandName} is temporarily unavailable. Buddy can still
          plan with seasonal guidance.
        </p>
      )}
    </section>
  );
}

function DealsSideCard({
  deals,
  returnPath,
}: {
  deals: Deal[];
  returnPath: string;
}) {
  return (
    <section className="rounded-baha-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-night">Current deals</h2>
        <Link href="/deals" className="text-xs font-bold text-brand-600">
          View all deals
        </Link>
      </div>
      {deals.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {deals.slice(0, 3).map((deal) => {
            const action = dealActionLinks(deal, returnPath);
            return (
              <Link
                key={deal.id}
                href={action.primaryHref}
                className="grid grid-cols-[104px_1fr] gap-3 py-3 first:pt-0"
              >
                <ImageWithSourcePolicy
                  src={deal.image_url}
                  alt={deal.title}
                  title={deal.title}
                  eyebrow="Deal"
                  className="h-20 rounded-lg"
                  imageClassName="object-cover"
                  tone="deal"
                />
                <div>
                  <p className="line-clamp-1 text-sm font-bold text-night">
                    {deal.title}
                  </p>
                  <p className="mt-1 text-xs font-bold text-gold-600">
                    {formatPrice(deal.price_from_usd, deal.price_unit)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-charcoal">
                    {deal.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-sm font-medium leading-6 text-charcoal">
          No active island deals are loaded right now.
        </p>
      )}
      <Link
        href="/deals"
        className="mt-4 inline-flex text-sm font-bold text-brand-600"
      >
        More deals and packages
      </Link>
    </section>
  );
}

function formatForecastDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function LandmarkIcon({ type }: { type: string | null }) {
  const normalized = type ?? "landmark";
  return (
    <span
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-night"
      aria-label={normalized.replace(/_/g, " ")}
      role="img"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {normalized === "lighthouse" ? (
          <>
            <path d="M10 21h4" />
            <path d="M9 21l1.5-12h3L15 21" />
            <path d="M9.5 9h5" />
            <path d="M10 6h4l-1-3h-2l-1 3Z" />
            <path d="M5 6h3" />
            <path d="M16 6h3" />
          </>
        ) : normalized === "church" ? (
          <>
            <path d="M12 3v5" />
            <path d="M10 5h4" />
            <path d="M5 21V10l7-4 7 4v11" />
            <path d="M9 21v-6a3 3 0 0 1 6 0v6" />
          </>
        ) : normalized === "fort" ||
          normalized === "government" ||
          normalized === "museum" ? (
          <>
            <path d="M4 21h16" />
            <path d="M6 21V10" />
            <path d="M18 21V10" />
            <path d="M4 10h16" />
            <path d="M12 4 4 10" />
            <path d="m12 4 8 6" />
            <path d="M9 21v-7" />
            <path d="M15 21v-7" />
          </>
        ) : (
          <>
            <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
            <path d="M12 10.5h.01" />
          </>
        )}
      </svg>
    </span>
  );
}
