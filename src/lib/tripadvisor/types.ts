export interface TripAdvisorLocation {
  id: string
  location_id: string
  category: 'hotels' | 'restaurants' | 'attractions'
  island_name: string | null
  name: string
  address: {
    street1?: string
    street2?: string
    city?: string
    state?: string
    country?: string
    postalcode?: string
  } | null
  rating: number | null
  num_reviews: number | null
  price_level: string | null
  cuisine_types: string[] | null
  hotel_class: string | null
  amenities: string[] | null
  photos: { url: string; caption?: string }[] | null
  reviews: {
    text: string
    rating: number
    author: string
    published_date?: string
  }[] | null
  website: string | null
  tripadvisor_url: string | null
  latitude: number | null
  longitude: number | null
}

export const ISLAND_SLUG_MAP: Record<string, string> = {
  'nassau': 'Nassau',
  'paradise-island': 'Paradise Island',
  'exuma': 'Exuma',
  'exumas': 'Exuma',
  'eleuthera': 'Eleuthera',
  'harbour-island': 'Harbour Island',
  'andros': 'Andros',
  'grand-bahama': 'Grand Bahama',
  'bimini': 'Bimini',
  'long-island': 'Long Island',
  'abacos': 'Abacos',
  'cat-island': 'Cat Island',
  'san-salvador': 'San Salvador',
  'berry-islands': 'Berry Islands',
  'inagua': 'Inagua',
  'crooked-island': 'Crooked Island',
  'acklins': 'Acklins',
}

const RESTAURANT_ISLAND_QUERY_ALIASES: Record<string, string[]> = {
  Nassau: ['Nassau & Paradise Island'],
  'Paradise Island': ['Nassau & Paradise Island'],
  Exuma: ['The Exumas'],
  Exumas: ['The Exumas'],
  Eleuthera: ['Eleuthera & Harbour Island'],
  'Harbour Island': ['Eleuthera & Harbour Island'],
  'Grand Bahama': ['Freeport — Grand Bahama Island'],
  Abacos: ['The Abacos'],
  'Berry Islands': ['The Berry Islands'],
  Acklins: ['Acklins & Crooked Island'],
  'Crooked Island': ['Acklins & Crooked Island'],
}

export function isIslandSlug(slug: string): boolean {
  return slug in ISLAND_SLUG_MAP
}

export function getIslandDisplayName(slug: string): string {
  return ISLAND_SLUG_MAP[slug] ?? slug
}

export function getRestaurantIslandQueryNames(islandName: string): string[] {
  return Array.from(new Set([
    islandName,
    ...(RESTAURANT_ISLAND_QUERY_ALIASES[islandName] ?? []),
  ]))
}

export function formatAddress(address: TripAdvisorLocation['address']): string {
  if (!address) return ''
  return [address.street1, address.city, address.state]
    .filter(Boolean)
    .join(', ')
}

export function formatTripAdvisorTokenLabel(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

export function formatCuisineLabel(value: string): string {
  return formatTripAdvisorTokenLabel(value)
}

export function formatPriceLevelLabel(value: string): string {
  const normalized = value.trim().replace(/\s*-\s*/g, ' - ')
  if (/^\${1,4}$/.test(normalized)) return normalized
  if (/^\${1,4} - \${1,4}$/.test(normalized)) return normalized
  return formatTripAdvisorTokenLabel(normalized)
}
