/**
 * Baha Buddy — Bahamas photography catalog.
 *
 * @deprecated for new code. Pull island imagery from
 *   `src/lib/islands.ts` (DB-driven, server-only) and place imagery
 *   from `src/lib/place-photos.ts` (resolves google_places photo
 *   references via Supabase Storage or the /api/place-photo proxy).
 *
 * This module remains in the codebase as a bridge — plenty of
 * Client Components still import `BahaImages.X` directly because
 * their server parents haven't been refactored to pass image URLs
 * as props. Every URL below is now a real Bahamas tourism CDN URL
 * (matching the `islands.hero_image_url` seed and V2 Flutter's
 * `BahaImages` class), so consumers render correctly today even
 * before the migration is complete.
 *
 * Sources of URLs:
 *   - tempo.cdn.tambourine.com  — Bahamas Tourism Authority CDN
 *   - www.nassauparadiseisland.com  — Nassau Paradise Island
 *     official tourism site
 *
 * No more Unsplash hotlinking. Per Valdez (May 2026): "we don't
 * want to use Unsplash images anymore — use the images from the
 * island table and relevant tables."
 */

/** Tambourine CDN URL for one of the BTA island heroes. */
function tambourine(path: string): string {
  return `https://tempo.cdn.tambourine.com/windsong/media/${path}`
}

/** Nassau Paradise Island tourism CDN URL. */
function npi(path: string): string {
  return `https://www.nassauparadiseisland.com/sites/default/files/${path}`
}

export const BahaImages = {
  // ── Islands ──────────────────────────────────────────────────────────
  // Mirror of `seed_islands_deals_attractions.sql` and V2 Flutter
  // `BahaImages` — same URL for the same island across all surfaces.
  nassau:           tambourine('bmot-nassau-islands-img-5f7655231dcf7.jpg'),
  paradiseIsland:   tambourine('bmot-nassau-islands-img-5f7655231dcf7.jpg'),
  exumas:           tambourine('bmot-exumas-islands-img-5f7654f77ef66.jpg'),
  eleuthera:        tambourine('bmot-eleuthera-islands-img-5f7654ecd18bf.jpg'),
  harbourIsland:    tambourine('bmot-eleuthera-islands-img-5f7654ecd18bf.jpg'),
  abacos:           tambourine('bmot-the-abacos-islands-img-5f765543ac3d5.jpg'),
  bimini:           tambourine('bimini-5ebc1e784e5d8.jpg'),
  andros:           tambourine('bmot-andros-islands-img-5f7654cd43acd.jpg'),
  grandBahama:      tambourine('freeport-5ebc543630edb.jpg'),
  longIsland:       tambourine('bmot-long-island-islands-img-5f765510d841f.jpg'),

  // ── Experiences ──────────────────────────────────────────────────────
  // These don't map 1:1 to an island row — they're hand-picked
  // tourism CDN photos for specific experiences. Long-term these
  // should come from `bahamas_attractions` rows tagged by category
  // (snorkeling, sailing, swimming-pigs), but until that migration
  // ships these point at real BTA / NPI photos so the UI works.
  sunsetSailing:    tambourine('cache/bahamas-goombay-summer-1-62bdd276c186d-1500x643.png'),
  swimmingPigs:     tambourine('bmot-exumas-islands-img-5f7654f77ef66.jpg'),
  snorkeling:       npi('styles/portrait/public/images/2024-05/D80_6558%20%2B%206557_Hires.jpg'),
  beach:            npi('images/2025-04/people-relaxing.png'),
  bahamasLifestyle: tambourine('goombay-summer-2023-intro-64b04840c1ccc.png'),

  // ── Seasonal / editorial ─────────────────────────────────────────────
  junkanoo:         npi('styles/portrait/public/images/2025-04/250220_NPI_AQ1_9267.jpg'),
} as const

export type BahaImageKey = keyof typeof BahaImages

export const FALLBACK_IMAGE = BahaImages.nassau

/** Islands shown in the IslandExplorerRow on Home and the Discover tab. */
export interface IslandEntry {
  slug: string
  name: string
  imageKey: BahaImageKey
  /** Optional emoji shown on the explorer-row avatar. Some consumers
   *  (IslandExplorerRow) reference this; keep it on the type so
   *  TypeScript doesn't complain. */
  emoji?: string
}

export const ISLANDS: IslandEntry[] = [
  { slug: 'nassau-paradise-island', name: 'Nassau',           imageKey: 'nassau' },
  { slug: 'the-exumas',              name: 'Exumas',           imageKey: 'exumas' },
  { slug: 'eleuthera-harbour-island', name: 'Eleuthera',     imageKey: 'eleuthera' },
  { slug: 'andros',                  name: 'Andros',           imageKey: 'andros' },
  { slug: 'grand-bahama',            name: 'Grand Bahama',     imageKey: 'grandBahama' },
  { slug: 'bimini',                  name: 'Bimini',           imageKey: 'bimini' },
  { slug: 'long-island',             name: 'Long Island',      imageKey: 'longIsland' },
  { slug: 'abacos',                  name: 'Abacos',           imageKey: 'abacos' },
  { slug: 'paradise-island',         name: 'Paradise Island',  imageKey: 'paradiseIsland' },
]
