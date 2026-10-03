/**
 * Conservative catalog bounds used to reject foreign homonyms and records
 * assigned to the wrong Bahamian island before they reach travelers.
 *
 * These are publication gates, not navigation polygons. Borderline records
 * belong in the catalog review queue instead of being made public by widening
 * a box enough to admit another country or island group.
 */
type IslandBounds = readonly [
  minLatitude: number,
  maxLatitude: number,
  minLongitude: number,
  maxLongitude: number,
]

const ISLAND_BOUNDS: Record<string, IslandBounds> = {
  'acklins-crooked-island': [21.8, 23.0, -74.7, -73.6],
  andros: [23.6, 25.3, -78.4, -76.8],
  'berry-islands': [25.2, 26.1, -78.4, -77.3],
  bimini: [25.5, 25.95, -79.5, -79.0],
  'cat-island': [24.0, 24.8, -75.9, -75.1],
  'eleuthera-harbour-island': [24.4, 25.8, -76.9, -74.9],
  'grand-bahama': [26.3, 27.1, -79.4, -77.5],
  inagua: [20.7, 21.8, -74.1, -72.7],
  'long-island': [22.6, 24.1, -75.7, -74.6],
  mayaguana: [22.1, 22.7, -73.3, -72.4],
  'nassau-paradise-island': [24.85, 25.25, -77.7, -76.9],
  'ragged-island': [21.9, 23.1, -77.0, -75.4],
  'rum-cay': [23.45, 23.85, -75.1, -74.6],
  'san-salvador': [23.9, 24.3, -74.8, -74.2],
  abacos: [25.7, 27.4, -78.2, -76.5],
  'the-exumas': [23.1, 25.2, -77.0, -75.0],
}

// Keyed by the slugified form of a traveler label, catalog island_name, or
// legacy slug. Values are the canonical slugs stored in `places.island_id`.
const ISLAND_SLUG_ALIASES: Record<string, string> = {
  abaco: 'abacos',
  'the-abacos': 'abacos',
  exuma: 'the-exumas',
  exumas: 'the-exumas',
  nassau: 'nassau-paradise-island',
  'new-providence': 'nassau-paradise-island',
  'nassau-new-providence': 'nassau-paradise-island',
  'paradise-island': 'nassau-paradise-island',
  'nassau-and-paradise-island': 'nassau-paradise-island',
  freeport: 'grand-bahama',
  'grand-bahama-island': 'grand-bahama',
  'freeport-grand-bahama': 'grand-bahama',
  'freeport-grand-bahama-island': 'grand-bahama',
  eleuthera: 'eleuthera-harbour-island',
  'harbour-island': 'eleuthera-harbour-island',
  'harbor-island': 'eleuthera-harbour-island',
  'eleuthera-and-harbour-island': 'eleuthera-harbour-island',
  'acklins-and-crooked-island': 'acklins-crooked-island',
  'the-berry-islands': 'berry-islands',
}

/**
 * The one island alias resolver for web catalog reads. Accepts canonical
 * slugs, legacy slugs ("nassau", "harbour-island") and display labels
 * ("Nassau & Paradise Island", "Freeport — Grand Bahama Island") and returns
 * the canonical slug. Unknown values come back slugified, never substituted.
 */
export function normalizeCanonicalIslandSlug(rawIsland: string | null | undefined): string {
  const slug = (rawIsland ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return ISLAND_SLUG_ALIASES[slug] ?? slug
}

// Longest phrases first so "nassau & paradise island" wins over "nassau".
const ISLAND_SEARCH_PHRASES = [
  'nassau & paradise island',
  'nassau and paradise island',
  'eleuthera & harbour island',
  'eleuthera and harbour island',
  'freeport — grand bahama island',
  'acklins & crooked island',
  'the berry islands',
  'paradise island',
  'new providence',
  'harbour island',
  'grand bahama',
  'berry islands',
  'san salvador',
  'long island',
  'cat island',
  'ragged island',
  'the abacos',
  'the exumas',
  'eleuthera',
  'mayaguana',
  'freeport',
  'rum cay',
  'nassau',
  'abacos',
  'exumas',
  'inagua',
  'andros',
  'bimini',
  'abaco',
  'exuma',
].sort((a, b) => b.length - a.length)

const SEARCH_STOP_WORDS = new Set(['the', 'and', 'in', 'on', 'at', 'for', 'to', 'of'])

/**
 * Splits "Nassau & Paradise Island boat tours" into the canonical island slug
 * and the keywords ["boat", "tour"] so catalog search matches descriptions
 * instead of a literal phrase. Mirrors the mobile
 * `splitIslandFromActivitySearch`.
 */
export function splitIslandFromActivitySearch(
  search: string | null | undefined,
): { islandSlug: string | null; keywords: string[] } {
  let text = (search ?? '').toLowerCase()
  let islandSlug: string | null = null
  for (const phrase of ISLAND_SEARCH_PHRASES) {
    if (!text.includes(phrase)) continue
    islandSlug ??= normalizeCanonicalIslandSlug(phrase)
    text = text.split(phrase).join(' ')
  }
  const keywords = text
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !SEARCH_STOP_WORDS.has(word))
    .map(singularSearchStem)
  return { islandSlug, keywords: Array.from(new Set(keywords)) }
}

/** Substring stem that matches both the singular and plural spelling:
 * "beaches" -> "beach", "activities" -> "activit", "tours" -> "tour". */
function singularSearchStem(word: string): string {
  if (word.length <= 4 || !word.endsWith('s') || word.endsWith('ss')) return word
  if (word.endsWith('ies') && word.length > 5) return word.slice(0, -3)
  if (/(?:ch|sh|x|ss)es$/.test(word)) return word.slice(0, -2)
  return word.slice(0, -1)
}

function finiteNumber(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function isWithinCanonicalIslandBounds(input: {
  island: string | null | undefined
  latitude: number | string | null | undefined
  longitude: number | string | null | undefined
}): boolean {
  const latitude = finiteNumber(input.latitude)
  const longitude = finiteNumber(input.longitude)
  if (latitude === null || longitude === null) return false

  const bounds = ISLAND_BOUNDS[normalizeCanonicalIslandSlug(input.island)]
  if (!bounds) return false
  const [minLatitude, maxLatitude, minLongitude, maxLongitude] = bounds
  return latitude >= minLatitude && latitude <= maxLatitude
    && longitude >= minLongitude && longitude <= maxLongitude
}
