/**
 * Islands data layer — server-only, DB-driven.
 *
 * Purpose: provide one island-level image resolver for the web app.
 * Generated per-island assets now take precedence so marketing,
 * marketplace, and trip surfaces stay visually synced.
 *
 * Architecture:
 *   - React `cache()` dedupes the fetch within a single request, so
 *     IslandExplorerRow + AdaptiveHeroCard + WeatherGlanceCard etc.
 *     on the same page share one DB hit.
 *   - Server-only: callers must be Server Components (or server
 *     actions / route handlers). Client Components receive resolved
 *     URLs as props from their server parent.
 *   - Fallback chain: generated island asset → DB row → generic Bahamas hero.
 *     The generated fallbacks live here so SSG / preview builds without
 *     DB access still render real Bahamas tourism photography (not
 *     gradient placeholders).
 *
 * Keep this file aligned with `GeneratedIslandImages` in `baha-images.ts`.
 *
 * Companion: `src/lib/place-photos.ts` handles cached place imagery.
 */

import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IslandRecord {
  slug: string;
  name: string;
  description: string;
  /** Renderable image URL. Generated island assets take precedence so
   *  web surfaces stay visually synced. */
  heroImageUrl: string;
  airportCodes: string[];
  highlights: string[];
  vibeTags: string[];
  bestFor: string[];
  avgFlightTimeFromMiamiHours: number | null;
}

// ─── Generated fallbacks ────────────────────────────────────────────────────
function generatedIslandImage(path: string): string {
  return `/assets/destinations/generated/${path}`;
}

// Generated per-island images. These intentionally take precedence over
// DB-seeded hero_image_url values so all web surfaces stay visually synced.

const HERO_FALLBACKS: Record<string, string> = {
  "nassau-paradise-island": generatedIslandImage("nassau-paradise-island.png"),
  "the-exumas": generatedIslandImage("the-exumas.png"),
  "eleuthera-harbour-island": generatedIslandImage("eleuthera.png"),
  abacos: generatedIslandImage("the-abacos.png"),
  andros: generatedIslandImage("andros.png"),
  "grand-bahama": generatedIslandImage("grand-bahama.png"),
  bimini: generatedIslandImage("bimini.png"),
  "cat-island": generatedIslandImage("cat-island.png"),
  "long-island": generatedIslandImage("long-island.png"),
  inagua: generatedIslandImage("inagua.png"),
  "berry-islands": generatedIslandImage("berry-islands.png"),
  "san-salvador": generatedIslandImage("san-salvador.png"),
  "rum-cay":
    "https://tempo.cdn.tambourine.com/windsong/media/rum-cay-5ebc565c679de.jpg",
  mayaguana:
    "https://tempo.cdn.tambourine.com/windsong/media/mayaguana-5ebc565aa3f78.jpg",
  "acklins-crooked-island":
    "https://tempo.cdn.tambourine.com/windsong/media/bmot-acklins-crooked-island-islands-img-6577398613c5c.jpg",
  "ragged-island":
    "https://tempo.cdn.tambourine.com/windsong/media/bmot-ragged-island-islands-img-5f76552b68017.jpg",
  // Sibling slugs that share an island record (per island-config.ts).
  "paradise-island": generatedIslandImage("paradise-island.png"),
  "harbour-island": generatedIslandImage("harbour-island.png"),
};

/**
 * Generated display assets for large island hero contexts. Kept separate
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

/** Prefer full-size landing hero; fall back to DB / card thumbnail URL. */
export function resolveLandingHeroImageUrl(
  slug: string,
  fallback: string,
): string {
  return LANDING_HERO_DISPLAY[slug] ?? fallback;
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
    const { data, error } = await supabase
      .from("islands")
      .select(
        "slug, name, description, hero_image_url, airport_codes, highlights, vibe_tags, best_for, avg_flight_time_from_miami_hours",
      )
      .order("name", { ascending: true });

    if (error || !data) {
      if (error) console.warn("[islands] getIslands failed", error.message);
      return [];
    }

    return data.map((row) => ({
      slug: row.slug,
      name: row.name,
      description: row.description,
      heroImageUrl:
        HERO_FALLBACKS[row.slug] ?? row.hero_image_url ?? BAHAMAS_HERO_FALLBACK,
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
 *   1. Generated `HERO_FALLBACKS[slug]`
 *   2. DB row's `hero_image_url`
 *   3. `BAHAMAS_HERO_FALLBACK` (generic Bahamas photo)
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
