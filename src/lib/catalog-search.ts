export const CATALOG_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'places', label: 'Places' },
  { value: 'food', label: 'Food' },
  { value: 'beaches', label: 'Beaches' },
  { value: 'things_to_do', label: 'Things to do' },
  { value: 'stays', label: 'Stays' },
  { value: 'tours', label: 'Tours' },
  { value: 'deals', label: 'Deals' },
] as const

export type CatalogFilter = Exclude<(typeof CATALOG_FILTERS)[number]['value'], 'all'>

export const CATALOG_ISLANDS = [
  { value: 'nassau-paradise-island', label: 'Nassau & Paradise Island' },
  { value: 'the-exumas', label: 'The Exumas' },
  { value: 'eleuthera-harbour-island', label: 'Eleuthera & Harbour Island' },
  { value: 'grand-bahama', label: 'Grand Bahama' },
  { value: 'the-abacos', label: 'The Abacos' },
  { value: 'andros', label: 'Andros' },
  { value: 'bimini', label: 'Bimini' },
  { value: 'long-island', label: 'Long Island' },
  { value: 'cat-island', label: 'Cat Island' },
  { value: 'san-salvador', label: 'San Salvador' },
  { value: 'berry-islands', label: 'Berry Islands' },
  { value: 'inagua', label: 'Inagua' },
  { value: 'acklins-crooked-island', label: 'Acklins & Crooked Island' },
  { value: 'mayaguana', label: 'Mayaguana' },
  { value: 'rum-cay', label: 'Rum Cay' },
  { value: 'ragged-island', label: 'Ragged Island' },
] as const

export type CatalogResultType =
  | 'island'
  | 'stay'
  | 'place'
  | 'attraction'
  | 'deal'
  | 'self_tour'

export type CatalogRpcRow = {
  result_id: string
  result_type: string
  title: string
  subtitle: string | null
  island_slug: string | null
  island_name: string | null
  category: string | null
  image_url: string | null
  rating: number | string | null
  review_count: number | null
  price_from_usd: number | string | null
  route_path: string | null
  source_table: string
  score: number | string | null
  is_live_action: boolean
}

export type CatalogSearchResult = {
  id: string
  type: CatalogResultType
  title: string
  subtitle: string | null
  islandSlug: string | null
  islandName: string | null
  category: string | null
  imageUrl: string | null
  rating: number | null
  reviewCount: number | null
  priceFromUsd: number | null
  href: string
}

const VALID_FILTERS = new Set<CatalogFilter>(
  CATALOG_FILTERS
    .map((filter) => filter.value)
    .filter((value): value is CatalogFilter => value !== 'all'),
)

const PUBLIC_ISLAND_ROUTES: Record<string, string> = {
  'acklins-crooked-island': 'acklins-crooked-island',
  abacos: 'abacos',
  'the-abacos': 'abacos',
  andros: 'andros',
  bimini: 'bimini',
  'berry-islands': 'berry-islands',
  'cat-island': 'cat-island',
  'eleuthera-harbour-island': 'eleuthera-harbour-island',
  'grand-bahama': 'grand-bahama',
  inagua: 'inagua',
  'long-island': 'long-island',
  mayaguana: 'mayaguana',
  'nassau-paradise-island': 'nassau-paradise-island',
  'paradise-island': 'paradise-island',
  'ragged-island': 'ragged-island',
  'rum-cay': 'rum-cay',
  'san-salvador': 'san-salvador',
  'the-exumas': 'the-exumas',
}

export function cleanCatalogQuery(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

export function parseCatalogFilter(value: string | null | undefined): CatalogFilter | null {
  const normalized = value?.trim().toLowerCase() as CatalogFilter | undefined
  return normalized && VALID_FILTERS.has(normalized) ? normalized : null
}

export function parseCatalogIsland(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase()
  return CATALOG_ISLANDS.some((island) => island.value === normalized)
    ? normalized ?? null
    : null
}

export function normalizeCatalogResult(row: CatalogRpcRow): CatalogSearchResult {
  const type = isCatalogResultType(row.result_type) ? row.result_type : 'place'

  return {
    id: row.result_id,
    type,
    title: row.title,
    subtitle: row.subtitle,
    islandSlug: row.island_slug,
    islandName: row.island_name,
    category: row.category,
    imageUrl: row.image_url,
    rating: toFiniteNumber(row.rating),
    reviewCount: Number.isFinite(row.review_count) ? row.review_count : null,
    priceFromUsd: toFiniteNumber(row.price_from_usd),
    href: catalogResultHref(row, type),
  }
}

function catalogResultHref(row: CatalogRpcRow, type: CatalogResultType): string {
  const id = encodeURIComponent(row.result_id)

  if (type === 'island') {
    const slug = row.island_slug?.trim().toLowerCase()
    const publicSlug = slug ? PUBLIC_ISLAND_ROUTES[slug] : null
    if (publicSlug) return `/explore/island/${encodeURIComponent(publicSlug)}`

    const island = row.island_name || row.title
    return `/destinations?island=${encodeURIComponent(island)}`
  }

  if (type === 'self_tour') {
    const slug = row.route_path?.split('/').filter(Boolean).at(-1)
    return slug
      ? `/nassau-cruise-itineraries/${encodeURIComponent(slug)}`
      : '/nassau-cruise-itineraries'
  }

  if (type === 'deal') return '/deals'
  return `/explore/places/${id}`
}

function isCatalogResultType(value: string): value is CatalogResultType {
  return ['island', 'stay', 'place', 'attraction', 'deal', 'self_tour'].includes(value)
}

function toFiniteNumber(value: number | string | null): number | null {
  if (value === null) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
