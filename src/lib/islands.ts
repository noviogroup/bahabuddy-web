/**
 * Islands data layer — server-only, DB-driven.
 *
 * Purpose: provide one island-level image resolver for the web app.
 * Approved Sanity destination imagery takes precedence so marketing,
 * marketplace, and trip surfaces stay visually synced without a release.
 *
 * Architecture:
 *   - React `cache()` dedupes the fetch within a single request, so
 *     IslandExplorerRow + AdaptiveHeroCard + WeatherGlanceCard etc.
 *     on the same page share one DB hit.
 *   - Server-only: callers must be Server Components (or server
 *     actions / route handlers). Client Components receive resolved
 *     URLs as props from their server parent.
 *   - Fallback chain: approved Sanity asset → approved partner/official
 *     tourism fallback → legacy canonical DB image → generic Bahamas hero.
 *
 * Keep the temporary fallback catalog aligned with
 * `DestinationFallbackImages` in `baha-images.ts`.
 *
 * Companion: `src/lib/place-photos.ts` handles cached place imagery.
 */

import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchDestinations } from "@/lib/sanity/queries";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IslandRecord {
  slug: string;
  name: string;
  description: string;
  /** Renderable image URL from approved editorial or canonical sources. */
  heroImageUrl: string;
  airportCodes: string[];
  highlights: string[];
  vibeTags: string[];
  bestFor: string[];
  avgFlightTimeFromMiamiHours: number | null;
}

// ─── Official tourism fallbacks ─────────────────────────────────────────────
const tourism = (path: string) =>
  `https://tempo.cdn.tambourine.com/windsong/media/${path}`;

const HERO_FALLBACKS: Record<string, string> = {
  "nassau-paradise-island": "https://travprocdn.imgix.net/1839/1763488599-1763488599.jpg?quality=82&fm=webp",
  "the-exumas": "https://travprocdn.imgix.net/1839/1763488870-1763488870.jpg?quality=82&fm=webp",
  "eleuthera-harbour-island": "https://travprocdn.imgix.net/1839/1763488736-1763488736.jpg?quality=82&fm=webp",
  abacos: tourism("bmot-the-abacos-islands-img-5f765543ac3d5.jpg"),
  andros: tourism("bmot-andros-islands-img-5f7654cd43acd.jpg"),
  "grand-bahama": "https://travprocdn.imgix.net/1839/1690388649-1690388649.jpg?quality=82&fm=webp",
  bimini: "https://travprocdn.imgix.net/1839/1619894845-1619894845.jpg?quality=82&fm=webp",
  "cat-island": tourism("bmot-cat-island-islands-img-5f7654e4e23d5.jpg"),
  "long-island": "https://travprocdn.imgix.net/1839/1763489614-1763489614.jpg?quality=82&fm=webp",
  inagua: tourism("bmot-inagua-islands-img-5f7655086ab3b.jpg"),
  "berry-islands": "https://travprocdn.imgix.net/1839/1763489090-1763489090.jpg?quality=82&fm=webp",
  "san-salvador": tourism("bmot-san-salvador-islands-img-5f76553c25e7a.jpg"),
  "rum-cay": tourism("rum-cay-5ebc565c679de.jpg"),
  mayaguana: tourism("mayaguana-5ebc565aa3f78.jpg"),
  "acklins-crooked-island": "https://travprocdn.imgix.net/1839/1763489907-1763489907.jpg?quality=82&fm=webp",
  "ragged-island": tourism("bmot-ragged-island-islands-img-5f76552b68017.jpg"),
  // Sibling slugs that share an island record (per island-config.ts).
  "paradise-island": tourism("bmot-nassau-islands-img-5f7655231dcf7.jpg"),
  "harbour-island": tourism("bmot-eleuthera-islands-img-5f7654ecd18bf.jpg"),
};

/**
 * Approved display assets for large island hero contexts. Kept separate
 * from HERO_FALLBACKS so callers can still ask for a landing-sized visual.
 */
const LANDING_HERO_DISPLAY: Record<string, string> = {
  "nassau-paradise-island": HERO_FALLBACKS["nassau-paradise-island"],
  "the-exumas": HERO_FALLBACKS["the-exumas"],
  "eleuthera-harbour-island": HERO_FALLBACKS["eleuthera-harbour-island"],
  "harbour-island": HERO_FALLBACKS["harbour-island"],
  andros: HERO_FALLBACKS.andros,
  "grand-bahama": HERO_FALLBACKS["grand-bahama"],
  bimini: HERO_FALLBACKS.bimini,
  "long-island": HERO_FALLBACKS["long-island"],
  abacos: HERO_FALLBACKS.abacos,
  "cat-island": HERO_FALLBACKS["cat-island"],
  inagua: HERO_FALLBACKS.inagua,
  "berry-islands": HERO_FALLBACKS["berry-islands"],
  "san-salvador": HERO_FALLBACKS["san-salvador"],
  "paradise-island": HERO_FALLBACKS["paradise-island"],
};

/** Preserve an approved/editorial URL; use the landing fallback only if empty. */
export function resolveLandingHeroImageUrl(
  slug: string,
  fallback: string,
): string {
  return fallback || LANDING_HERO_DISPLAY[slug] || BAHAMAS_HERO_FALLBACK;
}

/** Generic Bahamas hero — final fallback when even the slug is unknown. */
export const BAHAMAS_HERO_FALLBACK =
  "https://tempo.cdn.tambourine.com/windsong/media/cache/bahamas-goombay-summer-1-62bdd276c186d-1500x643.png";

/** Generic lifestyle / hero — used when no island context is available. */
export const BAHAMAS_LIFESTYLE_FALLBACK =
  "https://tempo.cdn.tambourine.com/windsong/media/goombay-summer-2023-intro-64b04840c1ccc.png";

// ─── DB fetchers ────────────────────────────────────────────────────────────

/**
 * Fetch all rows from `islands`. Cached at the React request level so
 * multiple consumers on the same page share one query.
 *
 * Returns an empty array when the DB is unreachable — callers should
 * treat that as "use the static fallback map".
 */
export const getIslands = cache(async (): Promise<IslandRecord[]> => {
  try {
    const supabase = await createClient();
    const [{ data, error }, destinations] = await Promise.all([
      supabase
        .from("islands")
        .select(
          "slug, name, description, hero_image_url, airport_codes, highlights, vibe_tags, best_for, avg_flight_time_from_miami_hours",
        )
        .order("name", { ascending: true }),
      fetchDestinations().catch(() => null),
    ]);

    if (error || !data) {
      if (error) console.warn("[islands] getIslands failed", error.message);
      return [];
    }

    const approvedByIsland = new Map(
      (destinations ?? [])
        .filter((destination) => destination.islandId && destination.imageUrl)
        .map((destination) => [destination.islandId as string, destination.imageUrl as string]),
    );

    return data.map((row) => ({
      slug: row.slug,
      name: row.name,
      description: row.description,
      heroImageUrl:
        approvedByIsland.get(row.slug) ??
        HERO_FALLBACKS[row.slug] ??
        row.hero_image_url ??
        BAHAMAS_HERO_FALLBACK,
      airportCodes: row.airport_codes ?? [],
      highlights: row.highlights ?? [],
      vibeTags: row.vibe_tags ?? [],
      bestFor: row.best_for ?? [],
      avgFlightTimeFromMiamiHours: row.avg_flight_time_from_miami_hours ?? null,
    }));
  } catch (err) {
    // Next.js throws errors with digest='DYNAMIC_SERVER_USAGE' as a
    // control-flow signal when a route that called cookies() is being
    // prerendered. Re-throw so Next.js handles it (falls back to dynamic
    // rendering); don't log it as if it were a real error.
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: unknown }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("DYNAMIC_SERVER_USAGE")
    ) {
      throw err;
    }
    console.warn("[islands] getIslands threw", err);
    return [];
  }
});

/**
 * Fetch a single island by slug. Resolves sibling slugs (e.g.
 * `paradise-island` → `nassau-paradise-island`) via the fallback map
 * — so callers can pass either the URL slug or the DB slug.
 */
export const getIsland = cache(
  async (slug: string): Promise<IslandRecord | null> => {
    const all = await getIslands();
    if (all.length === 0) return null;
    return all.find((i) => i.slug === slug) ?? null;
  },
);

/**
 * Resolve a hero image URL for an island slug. Fallback chain:
 *   1. Approved Sanity destination image
 *   2. Approved partner/official tourism `HERO_FALLBACKS[slug]`
 *   3. Legacy DB row's `hero_image_url`
 *   4. `BAHAMAS_HERO_FALLBACK` (generic Bahamas photo)
 *
 * Always returns a real renderable URL — never null. Callers can
 * pass the result straight to `next/image`.
 */
export const getIslandHero = cache(async (slug: string): Promise<string> => {
  const island = await getIsland(slug);
  if (island?.heroImageUrl) return island.heroImageUrl;
  return HERO_FALLBACKS[slug] ?? BAHAMAS_HERO_FALLBACK;
});

/**
 * Batch helper: given a list of slugs, return a slug → hero URL map.
 * Cheaper than awaiting `getIslandHero` in a loop because we hit the
 * DB once via `getIslands()` and the rest is in-memory.
 */
export async function getIslandHeroes(
  slugs: readonly string[],
): Promise<Record<string, string>> {
  const all = await getIslands();
  const byDbSlug = new Map(all.map((i) => [i.slug, i.heroImageUrl]));
  const out: Record<string, string> = {};
  for (const slug of slugs) {
    out[slug] =
      byDbSlug.get(slug) ?? HERO_FALLBACKS[slug] ?? BAHAMAS_HERO_FALLBACK;
  }
  return out;
}

// ─── Landing-page hero slides ───────────────────────────────────────────────

export interface IslandHeroSlide {
  slug: string;
  name: string;
  tagline: string;
  image: string;
}

/**
 * Build the rotating-hero slide list used on the marketing landing
 * page. DB-driven: hero URLs come from `islands.hero_image_url`,
 * the curated order and editorial taglines come from
 * `ISLAND_CONFIGS`. Dedupes by hero URL so islands that share a
 * record (Nassau / Paradise Island) don't render twice.
 *
 * Server-only — callers should await this in a Server Component or
 * route handler and pass the result down to Client Components as a
 * prop.
 */
export async function getIslandHeroSlides(): Promise<IslandHeroSlide[]> {
  // Lazy import to avoid pulling island-config (and its BahaImages
  // dependency tree) into the cached module graph eagerly. island-config
  // is sync metadata; we just want the curated order and taglines.
  const { ISLAND_CONFIGS } = await import("@/lib/island-config");

  const heroes = await getIslandHeroes(ISLAND_CONFIGS.map((c) => c.slug));
  const seen = new Set<string>();
  const slides: IslandHeroSlide[] = [];

  for (const config of ISLAND_CONFIGS) {
    const image = resolveLandingHeroImageUrl(config.slug, heroes[config.slug]);
    if (seen.has(image)) continue;
    seen.add(image);
    slides.push({
      slug: config.slug,
      name: config.name,
      tagline: config.tagline,
      image,
    });
  }
  return slides;
}
