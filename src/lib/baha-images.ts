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
 * as props. Island images now point to the generated per-island set
 * under `/assets/destinations/generated`; non-island imagery remains
 * a mix of tourism CDN and curated local marketplace assets.
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

/** Generated island imagery shared across web surfaces. */
function generatedIsland(path: string): string {
  return `/assets/destinations/generated/${path}`;
}

export const GeneratedIslandImages = {
  islandFinderHero: generatedIsland("island-finder-hero.png"),
  nassauParadiseIsland: generatedIsland("nassau-paradise-island.png"),
  paradiseIsland: generatedIsland("paradise-island.png"),
  exumas: generatedIsland("the-exumas.png"),
  eleuthera: generatedIsland("eleuthera.png"),
  harbourIsland: generatedIsland("harbour-island.png"),
  abacos: generatedIsland("the-abacos.png"),
  bimini: generatedIsland("bimini.png"),
  andros: generatedIsland("andros.png"),
  grandBahama: generatedIsland("grand-bahama.png"),
  longIsland: generatedIsland("long-island.png"),
  catIsland: generatedIsland("cat-island.png"),
  sanSalvador: generatedIsland("san-salvador.png"),
  berryIslands: generatedIsland("berry-islands.png"),
  inagua: generatedIsland("inagua.png"),
} as const;

export const BahaImages = {
  // ── Islands ──────────────────────────────────────────────────────────
  // Generated per-island set. Keep these unique so the site does not
  // reuse one island's image for a different island.
  nassau: GeneratedIslandImages.nassauParadiseIsland,
  paradiseIsland: GeneratedIslandImages.paradiseIsland,
  exumas: GeneratedIslandImages.exumas,
  eleuthera: GeneratedIslandImages.eleuthera,
  harbourIsland: GeneratedIslandImages.harbourIsland,
  abacos: GeneratedIslandImages.abacos,
  bimini: GeneratedIslandImages.bimini,
  andros: GeneratedIslandImages.andros,
  grandBahama: GeneratedIslandImages.grandBahama,
  longIsland: GeneratedIslandImages.longIsland,
  catIsland: GeneratedIslandImages.catIsland,
  sanSalvador: GeneratedIslandImages.sanSalvador,
  berryIslands: GeneratedIslandImages.berryIslands,
  inagua: GeneratedIslandImages.inagua,

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
  travelerPlanning: home("traveler-modes/planning-beach-phone.png"),
  travelerHere: home("traveler-modes/already-here-nassau.png"),
  travelerCruise: home("traveler-modes/cruise-port-day.png"),
  categoryStays: home("trip-categories/stays-resort-terrace.jpg"),
  categoryFlights: home("trip-categories/flights-island-hopper.jpg"),
  categoryThingsToDo: home("trip-categories/things-to-do-snorkeling.jpg"),
  categoryTransport: home("trip-categories/transportation-water-taxi.jpg"),
  categoryRestaurants: home("trip-categories/restaurants-conch-shack.jpg"),
  categoryBoatCharters: home("trip-categories/boat-charters-sandbar.jpg"),
  categoryIslandGuides: home("trip-categories/island-guides-overlook.jpg"),
  categoryEvents: home("trip-categories/events-junkanoo-street.jpg"),
  categoryFamily: home("trip-categories/family-activities-beach.jpg"),
  categoryLuxury: home("trip-categories/luxury-experiences-cabana.jpg"),
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
/** Local homepage imagery generated/curated for homepage product moments. */
function home(path: string): string {
  return `/assets/home/${path}`;
}
