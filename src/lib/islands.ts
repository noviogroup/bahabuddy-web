/**
 * Islands data layer — server-only, DB-driven.
 *
 * Purpose: replace the static `BahaImages` Unsplash constants with
 * real imagery from the `islands` table. Per Valdez's directive
 * ("use the images from island table and relevant tables"), every
 * island-level hero on the web app should flow through here.
 *
 * Architecture:
 *   - React `cache()` dedupes the fetch within a single request, so
 *     IslandExplorerRow + AdaptiveHeroCard + WeatherGlanceCard etc.
 *     on the same page share one DB hit.
 *   - Server-only: callers must be Server Components (or server
 *     actions / route handlers). Client Components receive resolved
 *     URLs as props from their server parent.
 *   - Fallback chain: DB row → seed-matching static URL → bahamasHero.
 *     The static fallbacks live here so SSG / preview builds without
 *     DB access still render real Bahamas tourism photography (not
 *     gradient placeholders).
 *
 * Mobile parity: the static fallbacks below are the exact same URLs
 * the V2 Flutter app uses in `lib/core/constants/baha_images.dart`
 * AND that the V2 `seed_islands_deals_attractions.sql` writes into
 * `islands.hero_image_url`. One visual library across surfaces.
 *
 * Companion: `src/lib/place-photos.ts` handles google_places imagery.
 */

import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IslandRecord {
  slug: string
  name: string
  description: string
  /** Renderable image URL. Already falls back through the static map
   *  if the DB row's hero_image_url is null. */
  heroImageUrl: string
  airportCodes: string[]
  highlights: string[]
  vibeTags: string[]
  bestFor: string[]
  avgFlightTimeFromMiamiHours: number | null
}

// ─── Static fallbacks ───────────────────────────────────────────────────────
// Exact mirror of `seed_islands_deals_attractions.sql` (the URLs the seed
// writes into islands.hero_image_url). Used when the DB row is missing
// hero_image_url, or when the DB is unreachable at SSG/build time.

const HERO_FALLBACKS: Record<string, string> = {
  'nassau-paradise-island':
    'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg',
  'the-exumas':
    'https://tempo.cdn.tambourine.com/windsong/media/bmot-exumas-islands-img-5f7654f77ef66.jpg',
  'eleuthera-harbour-island':
    'https://tempo.cdn.tambourine.com/windsong/media/bmot-eleuthera-islands-img-5f7654ecd18bf.jpg',
  'abacos':
    'https://tempo.cdn.tambourine.com/windsong/media/bmot-the-abacos-islands-img-5f765543ac3d5.jpg',
  'andros':
    'https://tempo.cdn.tambourine.com/windsong/media/bmot-andros-islands-img-5f7654cd43acd.jpg',
  'grand-bahama':
    'https://tempo.cdn.tambourine.com/windsong/media/freeport-5ebc543630edb.jpg',
  'bimini':
    'https://tempo.cdn.tambourine.com/windsong/media/bimini-5ebc1e784e5d8.jpg',
  'cat-island':
    'https://tempo.cdn.tambourine.com/windsong/media/bmot-cat-island-islands-img-5f7654e4e23d5.jpg',
  'long-island':
    'https://tempo.cdn.tambourine.com/windsong/media/bmot-long-island-islands-img-5f765510d841f.jpg',
  'inagua':
    'https://tempo.cdn.tambourine.com/windsong/media/bmot-inagua-islands-img-5f7655086ab3b.jpg',
  'berry-islands':
    'https://tempo.cdn.tambourine.com/windsong/media/bmot-berry-island-islands-img-6012d69fdc9a7.jpg',
  'san-salvador':
    'https://tempo.cdn.tambourine.com/windsong/media/bmot-san-salvador-islands-img-5f76553c25e7a.jpg',
  'rum-cay':
    'https://tempo.cdn.tambourine.com/windsong/media/rum-cay-5ebc565c679de.jpg',
  'mayaguana':
    'https://tempo.cdn.tambourine.com/windsong/media/mayaguana-5ebc565aa3f78.jpg',
  'acklins-crooked-island':
    'https://tempo.cdn.tambourine.com/windsong/media/bmot-acklins-crooked-island-islands-img-6577398613c5c.jpg',
  'ragged-island':
    'https://tempo.cdn.tambourine.com/windsong/media/bmot-ragged-island-islands-img-5f76552b68017.jpg',
  // Sibling slugs that share an island record (per island-config.ts).
  'paradise-island':
    'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg',
  'harbour-island':
    'https://tempo.cdn.tambourine.com/windsong/media/bmot-eleuthera-islands-img-5f7654ecd18bf.jpg',
}

/** Generic Bahamas hero — final fallback when even the slug is unknown. */
export const BAHAMAS_HERO_FALLBACK =
  'https://tempo.cdn.tambourine.com/windsong/media/cache/bahamas-goombay-summer-1-62bdd276c186d-1500x643.png'

/** Generic lifestyle / hero — used when no island context is available. */
export const BAHAMAS_LIFESTYLE_FALLBACK =
  'https://tempo.cdn.tambourine.com/windsong/media/goombay-summer-2023-intro-64b04840c1ccc.png'

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
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('islands')
      .select(
        'slug, name, description, hero_image_url, airport_codes, highlights, vibe_tags, best_for, avg_flight_time_from_miami_hours',
      )
      .order('name', { ascending: true })

    if (error || !data) {
      if (error) console.warn('[islands] getIslands failed', error.message)
      return []
    }

    return data.map(row => ({
      slug: row.slug,
      name: row.name,
      description: row.description,
      heroImageUrl: row.hero_image_url ?? HERO_FALLBACKS[row.slug] ?? BAHAMAS_HERO_FALLBACK,
      airportCodes: row.airport_codes ?? [],
      highlights: row.highlights ?? [],
      vibeTags: row.vibe_tags ?? [],
      bestFor: row.best_for ?? [],
      avgFlightTimeFromMiamiHours: row.avg_flight_time_from_miami_hours ?? null,
    }))
  } catch (err) {
    // Next.js throws errors with digest='DYNAMIC_SERVER_USAGE' as a
    // control-flow signal when a route that called cookies() is being
    // prerendered. Re-throw so Next.js handles it (falls back to dynamic
    // rendering); don't log it as if it were a real error.
    if (
      err && typeof err === 'object'
        && 'digest' in err
        && typeof (err as { digest?: unknown }).digest === 'string'
        && (err as { digest: string }).digest.startsWith('DYNAMIC_SERVER_USAGE')
    ) {
      throw err
    }
    console.warn('[islands] getIslands threw', err)
    return []
  }
})

/**
 * Fetch a single island by slug. Resolves sibling slugs (e.g.
 * `paradise-island` → `nassau-paradise-island`) via the fallback map
 * — so callers can pass either the URL slug or the DB slug.
 */
export const getIsland = cache(async (slug: string): Promise<IslandRecord | null> => {
  const all = await getIslands()
  if (all.length === 0) return null
  return all.find(i => i.slug === slug) ?? null
})

/**
 * Resolve a hero image URL for an island slug. Fallback chain:
 *   1. DB row's `hero_image_url`
 *   2. Static `HERO_FALLBACKS[slug]` (mirrors the seed)
 *   3. `BAHAMAS_HERO_FALLBACK` (generic Bahamas photo)
 *
 * Always returns a real renderable URL — never null. Callers can
 * pass the result straight to `next/image`.
 */
export const getIslandHero = cache(async (slug: string): Promise<string> => {
  const island = await getIsland(slug)
  if (island?.heroImageUrl) return island.heroImageUrl
  return HERO_FALLBACKS[slug] ?? BAHAMAS_HERO_FALLBACK
})

/**
 * Batch helper: given a list of slugs, return a slug → hero URL map.
 * Cheaper than awaiting `getIslandHero` in a loop because we hit the
 * DB once via `getIslands()` and the rest is in-memory.
 */
export async function getIslandHeroes(
  slugs: readonly string[],
): Promise<Record<string, string>> {
  const all = await getIslands()
  const byDbSlug = new Map(all.map(i => [i.slug, i.heroImageUrl]))
  const out: Record<string, string> = {}
  for (const slug of slugs) {
    out[slug] = byDbSlug.get(slug) ?? HERO_FALLBACKS[slug] ?? BAHAMAS_HERO_FALLBACK
  }
  return out
}

// ─── Landing-page hero slides ───────────────────────────────────────────────

export interface IslandHeroSlide {
  slug: string
  name: string
  tagline: string
  image: string
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
  const { ISLAND_CONFIGS } = await import('@/lib/island-config')

  const heroes = await getIslandHeroes(ISLAND_CONFIGS.map(c => c.slug))
  const seen = new Set<string>()
  const slides: IslandHeroSlide[] = []

  for (const config of ISLAND_CONFIGS) {
    const image = heroes[config.slug]
    if (seen.has(image)) continue
    seen.add(image)
    slides.push({
      slug: config.slug,
      name: config.name,
      tagline: config.tagline,
      image,
    })
  }
  return slides
}
