/**
 * Baha Buddy — Bahamas photography catalog.
 *
 * @deprecated for new code. Pull island imagery from
 *   `src/lib/islands.ts` (DB-driven, server-only) and place imagery
 *   from `src/lib/place-photos.ts` (resolves Supabase cached place photo
 *   references via Supabase Storage or the /api/place-photo proxy).
 *
 * This module remains in the codebase as a bridge — plenty of
 * Client Components still import `BahaImages.X` directly because
 * their server parents haven't been refactored to pass image URLs
 * as props. Island fallbacks now use captured tourism-partner originals
 * where their destination identity is unambiguous, then official tourism
 * photography. Approved Sanity assets take precedence in server projections.
 *
 * Sources of URLs:
 *   - travprocdn.imgix.net — supplied tourism-partner originals
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
  return `https://tempo.cdn.tambourine.com/windsong/media/${path}`;
}

/** Nassau Paradise Island tourism CDN URL. */
function npi(path: string): string {
  return `https://www.nassauparadiseisland.com/sites/default/files/${path}`;
}

/** Local marketplace imagery curated for public web surfaces. */
function marketplace(path: string): string {
  return `/assets/marketplace/${path}`;
}

/**
 * Approved tourism-source fallbacks used only when Sanity has no approved
 * channel-enabled image. Captured partnership photos take precedence where
 * the source package identifies a single destination; remaining entries use
 * official Bahamas tourism photography rather than generated artwork.
 */
export const DestinationFallbackImages = {
  islandFinderHero: tambourine("cache/bahamas-goombay-summer-1-62bdd276c186d-1500x643.png"),
  nassauParadiseIsland: "https://travprocdn.imgix.net/1839/1763488599-1763488599.jpg?quality=82&fm=webp",
  paradiseIsland: tambourine("bmot-nassau-islands-img-5f7655231dcf7.jpg"),
  exumas: "https://travprocdn.imgix.net/1839/1763488870-1763488870.jpg?quality=82&fm=webp",
  eleuthera: "https://travprocdn.imgix.net/1839/1763488736-1763488736.jpg?quality=82&fm=webp",
  harbourIsland: tambourine("bmot-eleuthera-islands-img-5f7654ecd18bf.jpg"),
  abacos: tambourine("bmot-the-abacos-islands-img-5f765543ac3d5.jpg"),
  bimini: "https://travprocdn.imgix.net/1839/1619894845-1619894845.jpg?quality=82&fm=webp",
  andros: tambourine("bmot-andros-islands-img-5f7654cd43acd.jpg"),
  grandBahama: "https://travprocdn.imgix.net/1839/1690388649-1690388649.jpg?quality=82&fm=webp",
  longIsland: "https://travprocdn.imgix.net/1839/1763489614-1763489614.jpg?quality=82&fm=webp",
  catIsland: tambourine("bmot-cat-island-islands-img-5f7654e4e23d5.jpg"),
  sanSalvador: tambourine("bmot-san-salvador-islands-img-5f76553c25e7a.jpg"),
  berryIslands: "https://travprocdn.imgix.net/1839/1763489090-1763489090.jpg?quality=82&fm=webp",
  inagua: tambourine("bmot-inagua-islands-img-5f7655086ab3b.jpg"),
} as const;

export const BahaImages = {
  // ── Islands ──────────────────────────────────────────────────────────
  // Authentic partner/official fallbacks. Keep these unique so the site
  // does not reuse one island's image for a different island.
  nassau: DestinationFallbackImages.nassauParadiseIsland,
  paradiseIsland: DestinationFallbackImages.paradiseIsland,
  exumas: DestinationFallbackImages.exumas,
  eleuthera: DestinationFallbackImages.eleuthera,
  harbourIsland: DestinationFallbackImages.harbourIsland,
  abacos: DestinationFallbackImages.abacos,
  bimini: DestinationFallbackImages.bimini,
  andros: DestinationFallbackImages.andros,
  grandBahama: DestinationFallbackImages.grandBahama,
  longIsland: DestinationFallbackImages.longIsland,
  catIsland: DestinationFallbackImages.catIsland,
  sanSalvador: DestinationFallbackImages.sanSalvador,
  berryIslands: DestinationFallbackImages.berryIslands,
  inagua: DestinationFallbackImages.inagua,

  // ── Experiences ──────────────────────────────────────────────────────
  // These don't map 1:1 to an island row — they're hand-picked
  // tourism CDN photos for specific experiences. Long-term these
  // should come from `bahamas_attractions` rows tagged by category
  // (snorkeling, sailing, swimming-pigs), but until that migration
  // ships these point at real BTA / NPI photos so the UI works.
  sunsetSailing: tambourine(
    "cache/bahamas-goombay-summer-1-62bdd276c186d-1500x643.png",
  ),
  swimmingPigs: tambourine("bmot-exumas-islands-img-5f7654f77ef66.jpg"),
  snorkeling: npi(
    "styles/portrait/public/images/2024-05/D80_6558%20%2B%206557_Hires.jpg",
  ),
  beach: npi("images/2025-04/people-relaxing.png"),
  bahamasLifestyle: tambourine("goombay-summer-2023-intro-64b04840c1ccc.png"),
  flight: tambourine(
    "cache/screenshot-2026-04-28-200148-69f14af22b990-1500x643.png",
  ),

  // ── Marketplace categories ──────────────────────────────────────────
  staysPool: marketplace("bahamas-stays-pool.jpg"),
  flightAerial: marketplace("bahamas-flight-aerial.jpg"),
  cruisePort: marketplace("nassau-cruise-port.jpg"),
  travelerPlanning: "https://travprocdn.imgix.net/1839/1763489614-1763489614.jpg?quality=82&fm=webp",
  travelerHere: "https://travprocdn.imgix.net/1839/1763488599-1763488599.jpg?quality=82&fm=webp",
  travelerCruise: marketplace("nassau-cruise-port.jpg"),
  categoryStays: tambourine("bmot-windsong-mega-resorts-bahamar-hero-5f57a7c8df27f.jpg"),
  categoryFlights: tambourine("cache/screenshot-2026-04-28-200148-69f14af22b990-1500x643.png"),
  categoryThingsToDo: tambourine("cache/bmot-discover-your-adventure-you-and-me-5fd2779b1b3a7-424x389.jpg"),
  categoryTransport: tambourine("cache/eleuthera-islandhopping-5fd15a0ee2b16-424x389.jpg"),
  categoryRestaurants: tambourine("cache/nassau-conchshack-5fd15ae592ebe-424x389.jpg"),
  categoryBoatCharters: tambourine("cache/bmot-stories-square10-boating-tips-5fb5a4a40ab5b-424x389.jpg"),
  categoryIslandGuides: "https://travprocdn.imgix.net/1839/1763488870-1763488870.jpg?quality=82&fm=webp",
  categoryEvents: tambourine("cache/discover-slider-junkanoo-5e41bffad44e5-optimized-424x389.jpg"),
  categoryFamily: npi("images/2025-04/people-relaxing.png"),
  categoryLuxury: tambourine("cache/bahamas-goombay-summer-1-62bdd276c186d-1500x643.png"),
  resortPool: tambourine(
    "bmot-windsong-mega-resorts-bahamar-hero-5f57a7c8df27f.jpg",
  ),
  conchShack: tambourine("cache/nassau-conchshack-5fd15ae592ebe-424x389.jpg"),
  junkanooParade: tambourine(
    "cache/discover-slider-junkanoo-5e41bffad44e5-optimized-424x389.jpg",
  ),
  boatCharter: tambourine(
    "cache/bmot-stories-square10-boating-tips-5fb5a4a40ab5b-424x389.jpg",
  ),
  waterAdventure: tambourine(
    "cache/bmot-discover-your-adventure-you-and-me-5fd2779b1b3a7-424x389.jpg",
  ),
  coastalRoad: tambourine(
    "cache/eleuthera-queenhighway-5fd15a45afb96-424x389.jpg",
  ),
  islandHopping: tambourine(
    "cache/eleuthera-islandhopping-5fd15a0ee2b16-424x389.jpg",
  ),

  // ── Seasonal / editorial ─────────────────────────────────────────────
  junkanoo: npi(
    "styles/portrait/public/images/2025-04/250220_NPI_AQ1_9267.jpg",
  ),
} as const;

export type BahaImageKey = keyof typeof BahaImages;

export const FALLBACK_IMAGE = BahaImages.nassau;

/** Islands shown in the IslandExplorerRow on Home and the Discover tab. */
export interface IslandEntry {
  slug: string;
  name: string;
  imageKey: BahaImageKey;
  /** Optional emoji shown on the explorer-row avatar. Some consumers
   *  (IslandExplorerRow) reference this; keep it on the type so
   *  TypeScript doesn't complain. */
  emoji?: string;
}

export const ISLANDS: IslandEntry[] = [
  { slug: "nassau-paradise-island", name: "Nassau", imageKey: "nassau" },
  { slug: "the-exumas", name: "Exumas", imageKey: "exumas" },
  {
    slug: "eleuthera-harbour-island",
    name: "Eleuthera",
    imageKey: "eleuthera",
  },
  { slug: "andros", name: "Andros", imageKey: "andros" },
  { slug: "grand-bahama", name: "Grand Bahama", imageKey: "grandBahama" },
  { slug: "bimini", name: "Bimini", imageKey: "bimini" },
  { slug: "long-island", name: "Long Island", imageKey: "longIsland" },
  { slug: "abacos", name: "Abacos", imageKey: "abacos" },
  { slug: "cat-island", name: "Cat Island", imageKey: "catIsland" },
  { slug: "san-salvador", name: "San Salvador", imageKey: "sanSalvador" },
  { slug: "berry-islands", name: "Berry Islands", imageKey: "berryIslands" },
  { slug: "inagua", name: "Inagua", imageKey: "inagua" },
  {
    slug: "paradise-island",
    name: "Paradise Island",
    imageKey: "paradiseIsland",
  },
];
