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

export function isIslandSlug(slug: string): boolean {
  return slug in ISLAND_SLUG_MAP
}

export function getIslandDisplayName(slug: string): string {
  return ISLAND_SLUG_MAP[slug] ?? slug
}

export function formatAddress(address: TripAdvisorLocation['address']): string {
  if (!address) return ''
  return [address.street1, address.city, address.state]
    .filter(Boolean)
    .join(', ')
}
