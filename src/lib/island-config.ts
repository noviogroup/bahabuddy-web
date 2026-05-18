/**
 * Island catalog — shared between the island-detail route
 * (`/explore/island/[id]`) and any other consumer that needs island
 * editorial metadata.
 *
 * The canonical slug system is mobile's: every `slug` here matches
 * the mobile `ISLANDS` array in `baha-images.ts` AND the
 * `bahamas_attractions.island` / `bahamas_deals.island` values in
 * Supabase. One slug space, no translation layer.
 *
 * Some islands share underlying Supabase records (Paradise Island
 * attractions are stored under `nassau-paradise-island`; Harbour
 * Island under `eleuthera-harbour-island`). The optional `dbSlug`
 * field lets a config override which slug is used for the Supabase
 * query without changing the URL slug. Defaults to `slug` when
 * omitted.
 *
 * Sanity `destination.islandId` should match the URL `slug` here, so
 * `/explore/island/[id]` can call `fetchDestinationByIsland(id)`
 * directly with no extra mapping.
 *
 * Imagery split (post-Unsplash-migration, May 2026):
 *   - This module stays SYNC. Both Server and Client Components can
 *     import `ISLAND_CONFIGS`, `getIslandConfig`, `getIslandDbSlug`,
 *     and `getIslandHeroImage` safely.
 *   - `getIslandHeroImage(config)` returns a real Bahamas tourism URL
 *     (via the now-deprecated `BahaImages` bridge in `baha-images.ts`).
 *     Kept for Client Components that haven't been migrated yet.
 *   - New code, and any Server Component that already does a Supabase
 *     fetch, should use `getIslandHero(slug)` from `@/lib/islands`
 *     instead — that one reads from the `islands` table directly.
 */

import { BahaImages, type BahaImageKey } from './baha-images'

export interface IslandConfig {
  /** Canonical URL slug. Matches mobile's `ISLANDS[].slug` AND
   *  Supabase's `bahamas_attractions.island` values for most islands.
   *  Used in route params: `/explore/island/[slug]`. */
  slug: string
  /** Display name. */
  name: string
  /** One-line marketing hook. */
  tagline: string
  /** Supabase query slug. Defaults to `slug`. Override for islands
   *  that share underlying records with a sibling (e.g.
   *  `paradise-island` queries `nassau-paradise-island`). */
  dbSlug?: string
  /** Reference into `BahaImages`. */
  heroImageKey: BahaImageKey
  bestTime: string
  vibe: string
  tripLength: string
  /** Plain prose fallback used when no Sanity `overview` is
   *  published for this island. */
  description: string
}

export const ISLAND_CONFIGS: IslandConfig[] = [
  {
    slug: 'nassau-paradise-island',
    name: 'Nassau',
    tagline: 'The vibrant heart of the Bahamas — culture, beaches, and endless energy.',
    heroImageKey: 'nassau',
    bestTime: 'November – April',
    vibe: 'Culture & Beaches',
    tripLength: '3–5 days',
    description:
      'Nassau is the colorful capital city of the Bahamas, packed with colonial architecture, world-class dining, vibrant nightlife, and some of the most beautiful beaches in the Caribbean. Across the bridge sits Paradise Island, home to Atlantis and Cabbage Beach. From the historic forts to the buzzing Junkanoo scene, Nassau delivers an unforgettable island experience.',
  },
  {
    slug: 'paradise-island',
    name: 'Paradise Island',
    tagline: 'Atlantis, white-sand beaches, and resort island energy a short bridge from Nassau.',
    dbSlug: 'nassau-paradise-island',
    heroImageKey: 'paradiseIsland',
    bestTime: 'November – April',
    vibe: 'Resorts & Family',
    tripLength: '3–5 days',
    description:
      'Just across the bridge from Nassau, Paradise Island is home to the iconic Atlantis Resort, world-class beaches like Cabbage Beach, and a deeply manicured resort-island feel. It\'s the easiest way to combine city, beach, and family-friendly attractions in one short trip.',
  },
  {
    slug: 'the-exumas',
    name: 'The Exumas',
    tagline: 'Swimming pigs, turquoise sandbars, and the world\'s most pristine waters.',
    heroImageKey: 'exumas',
    bestTime: 'December – May',
    vibe: 'Adventure & Nature',
    tripLength: '4–7 days',
    description:
      'The Exumas are an archipelago of 365 cays stretching across breathtaking turquoise waters. Famous for the swimming pigs of Big Major Cay, pristine sandbars, and crystal-clear water that seems almost too perfect to be real. Snorkeling, kayaking, and island-hopping are the main events here.',
  },
  {
    slug: 'eleuthera-harbour-island',
    name: 'Eleuthera',
    tagline: 'Pink sand beaches, Glass Window Bridge, and unhurried island living.',
    heroImageKey: 'eleuthera',
    bestTime: 'November – May',
    vibe: 'Off-the-Beaten-Path',
    tripLength: '4–6 days',
    description:
      'Eleuthera is a slender, 100-mile-long island with a wild beauty that feels worlds away from the crowds. The famous pink sand beaches glow at sunrise, the Glass Window Bridge offers a dramatic divide between Atlantic and Caribbean, and the laid-back vibe invites you to truly slow down.',
  },
  {
    slug: 'harbour-island',
    name: 'Harbour Island',
    tagline: 'Golf carts, pink sand, and the most charming village in the Bahamas.',
    dbSlug: 'eleuthera-harbour-island',
    heroImageKey: 'harbourIsland',
    bestTime: 'November – April',
    vibe: 'Romantic & Boutique',
    tripLength: '3–5 days',
    description:
      'Harbour Island — affectionately called "Briland" by locals — is famous for its breathtaking 3-mile pink sand beach, colorful colonial cottages, and an intimate, upscale atmosphere. Golf carts rule the streets, and the village of Dunmore Town is filled with boutique shops, lovely restaurants, and a timeless island elegance.',
  },
  {
    slug: 'andros',
    name: 'Andros',
    tagline: 'The untamed wilderness — the Bahamas\' largest and most mysterious island.',
    heroImageKey: 'andros',
    bestTime: 'December – May',
    vibe: 'Wilderness & Diving',
    tripLength: '5–7 days',
    description:
      'Andros is the largest island in the Bahamas and one of the most biologically diverse places in the Caribbean. Bordering the Great Bahama Bank, the Andros Barrier Reef is the third-largest in the world. Blue holes, bonefishing flats, and vast unexplored forests make this the ultimate adventure destination.',
  },
  {
    slug: 'grand-bahama',
    name: 'Grand Bahama',
    tagline: 'Diving, nature trails, and a city vibe just minutes from Florida.',
    heroImageKey: 'grandBahama',
    bestTime: 'November – April',
    vibe: 'Diving & Nature',
    tripLength: '3–5 days',
    description:
      'Grand Bahama is home to Freeport, the Bahamas\' second-largest city, and offers a compelling mix of world-class diving, nature reserves, and city conveniences. The island\'s underwater caves and reefs are among the Caribbean\'s finest, and the Lucayan National Park is a natural wonder not to be missed.',
  },
  {
    slug: 'bimini',
    name: 'Bimini',
    tagline: 'Hemingway\'s old haunt — sport fishing, sunken roads, and the closest Bahamian island to Florida.',
    heroImageKey: 'bimini',
    bestTime: 'March – June',
    vibe: 'Fishing & Boating',
    tripLength: '2–4 days',
    description:
      'Bimini sits just 50 miles east of Miami and feels like a forgotten Hemingway novel. Big-game fishing, the mysterious "Bimini Road" rock formation, and an easy long-weekend feel make this the entry point to the Bahamas for many first-time visitors arriving by boat or seaplane.',
  },
  {
    slug: 'long-island',
    name: 'Long Island',
    tagline: 'The world\'s deepest blue hole, dramatic cliffs, and quiet, end-of-the-road beaches.',
    heroImageKey: 'longIsland',
    bestTime: 'December – May',
    vibe: 'Adventure & Quiet',
    tripLength: '4–6 days',
    description:
      'Long Island lives up to its name — a thin, 80-mile-long ribbon home to Dean\'s Blue Hole, the deepest known sea-water blue hole in the world. Empty pink and white beaches, dramatic coastal cliffs, and an off-grid pace make it a favorite for travelers who want the Bahamas without the crowds.',
  },
  {
    slug: 'abacos',
    name: 'The Abacos',
    tagline: 'Sailing capital of the Bahamas — pastel villages, reef-protected harbors, and easy island hopping.',
    heroImageKey: 'abacos',
    bestTime: 'November – June',
    vibe: 'Sailing & Boating',
    tripLength: '5–7 days',
    description:
      'The Abacos are a 120-mile chain of cays known as the "Sailing Capital of the World." Hope Town\'s candy-striped lighthouse, the loyalist-era pastel cottages of New Plymouth, and consistent trade winds make this the playground for sailors, divers, and travelers who like to wake up in a different harbor each morning.',
  },
]

/** Resolve a URL slug to its full config. Returns null when unknown. */
export function getIslandConfig(slug: string): IslandConfig | null {
  return ISLAND_CONFIGS.find(i => i.slug === slug) ?? null
}

/** Returns the Supabase query slug for an island. Falls back to the
 *  URL slug when no explicit override is set. */
export function getIslandDbSlug(config: IslandConfig): string {
  return config.dbSlug ?? config.slug
}

/** Resolve hero image URL from the config's BahaImages key.
 *
 *  @deprecated for Server Components — use
 *    `getIslandHero(slug)` from `@/lib/islands` instead (DB-driven).
 *    Kept here as a synchronous bridge for Client Components that
 *    haven't been migrated to receive image URLs as props from their
 *    server parent. */
export function getIslandHeroImage(config: IslandConfig): string {
  return BahaImages[config.heroImageKey]
}

// getIslandHeroSlides() moved to `@/lib/islands` — it's now async +
// DB-driven. Server Components await it and pass the result to
// Client Components as a prop (see HeroSection + app/page.tsx).
