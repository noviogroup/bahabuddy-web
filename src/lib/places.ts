import 'server-only'

import { BahaImages } from '@/lib/baha-images'
import { CACHED_PLACE_SOURCE_TABLE } from '@/lib/place-inventory'
import { createClient } from '@/lib/supabase/server'
import type { TripAdvisorLocation } from '@/lib/tripadvisor/types'
import { formatCuisineLabel, formatPriceLevelLabel } from '@/lib/tripadvisor/types'
import type { PublicPlace } from '@/lib/place-types'

interface CanonicalPlaceRow {
  id: string
  slug: string | null
  name: string
  category: string
  subcategory: string | null
  island_id: string | null
  island_name: string | null
  address: string | null
  latitude: number | string | null
  longitude: number | string | null
  phone: string | null
  website: string | null
  description: string | null
  primary_image_url: string | null
  rating: number | string | null
  review_count: number | null
  price_level: string | null
  is_verified: boolean | null
  is_partner: boolean | null
  source_priority: string | null
  metadata: Record<string, unknown> | null
  updated_at: string | null
}

interface BahamasAttractionRow {
  id: string
  name: string
  category: string
  island: string | null
  description: string | null
  image_url: string | null
  source_url: string | null
  tags: string[] | null
  rating: number | string | null
  review_count: number | null
  amenities: string[] | null
  price_range: string | null
  short_description: string | null
  enriched_at: string | null
  phone?: string | null
  website?: string | null
  hours?: Record<string, string> | null
  pros?: string[] | null
  cons?: string[] | null
  lat?: number | string | null
  lng?: number | string | null
  tripadvisor_url?: string | null
  tripadvisor_rating?: number | string | null
  tripadvisor_num_reviews?: number | null
}

interface CachedPlaceRow {
  id: string
  name: string
  type: string | null
  island_id: string | null
  address: string | null
  description: string | null
  image_url: string | null
  photo_url: string | null
  rating: number | string | null
  user_ratings_total: number | null
  price_level: string | number | null
  phone: string | null
  website: string | null
  amenities: string[] | null
  vibe_tags: string[] | null
  cuisine_type: string | null
  opening_hours: Record<string, string> | null
  lat: number | string | null
  lng: number | string | null
}

const CANONICAL_SELECT = [
  'id',
  'slug',
  'name',
  'category',
  'subcategory',
  'island_id',
  'island_name',
  'address',
  'latitude',
  'longitude',
  'phone',
  'website',
  'description',
  'primary_image_url',
  'rating',
  'review_count',
  'price_level',
  'is_verified',
  'is_partner',
  'source_priority',
  'metadata',
  'updated_at',
].join(', ')

const BAHAMAS_ATTRACTIONS_SELECT = [
  'id',
  'name',
  'category',
  'island',
  'description',
  'image_url',
  'source_url',
  'tags',
  'rating',
  'review_count',
  'amenities',
  'price_range',
  'short_description',
  'enriched_at',
].join(', ')

export const CURATED_FALLBACK_PLACES: PublicPlace[] = [
  fallbackPlace('nassau-fish-fry', 'Nassau Fish Fry', 'Dining', 'Nassau', "Arawak Cay's strip of local restaurants for conch salad, fried snapper, and casual Bahamian food.", BahaImages.nassau, ['Local food', 'Conch', 'Nightlife']),
  fallbackPlace('swimming-pigs-beach', 'Swimming Pigs Beach', 'Activity', 'Exuma', 'Big Major Cay, where the Exuma swimming pigs meet day boats in shallow turquoise water.', BahaImages.exumas, ['Wildlife', 'Boat trip', 'Photography']),
  fallbackPlace('pink-sands-beach', 'Pink Sands Beach', 'Beach', 'Harbour Island', 'A long Harbour Island beach known for pink sand, calm water, and easy beach days.', BahaImages.bahamasLifestyle, ['Pink sand', 'Swimming', 'Romantic']),
  fallbackPlace('deans-blue-hole', "Dean's Blue Hole", 'Activity', 'Long Island', 'A dramatic blue hole and one of the most memorable natural stops in the southern Bahamas.', BahaImages.eleuthera, ['Diving', 'Snorkeling', 'Nature']),
  fallbackPlace('fort-charlotte', 'Fort Charlotte', 'Culture', 'Nassau', "Nassau's largest fort, with harbour views and colonial history close to downtown.", BahaImages.nassau, ['History', 'Views', 'Walking tour']),
]

export async function getExplorePlaces(limit = 320): Promise<PublicPlace[]> {
  const [canonical, attractions, restaurants] = await Promise.all([
    getCanonicalPlaces(limit),
    getBahamasAttractions(limit),
    getTripAdvisorRestaurants(120),
  ])

  const merged = mergePlaces([...canonical, ...attractions, ...restaurants])
  if (merged.length > 0) return sortPlaces(merged).slice(0, limit)
  return CURATED_FALLBACK_PLACES
}

export async function getExplorePlaceById(id: string): Promise<PublicPlace | null> {
  const canonical = await getCanonicalPlaceByIdOrSlug(id)
  if (canonical) return canonical

  const attraction = await getBahamasAttractionById(id)
  if (attraction) return attraction

  const cached = await getCachedPlaceById(id)
  if (cached) return cached

  return CURATED_FALLBACK_PLACES.find((place) => place.id === id) ?? null
}

export async function getRelatedExplorePlaces(place: PublicPlace, limit = 4): Promise<PublicPlace[]> {
  const places = await getExplorePlaces(420)
  const islandKey = normalize(place.island ?? place.island_id ?? '')
  const categoryKey = broadCategory(place.category)

  return places
    .filter((candidate) => candidate.id !== place.id)
    .filter((candidate) => {
      const sameIsland = islandKey && normalize(candidate.island ?? candidate.island_id ?? '') === islandKey
      const sameCategory = broadCategory(candidate.category) === categoryKey
      return sameIsland || sameCategory
    })
    .slice(0, limit)
}

async function getCanonicalPlaces(limit: number): Promise<PublicPlace[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('v_places_search')
      .select(CANONICAL_SELECT)
      .order('rating', { ascending: false, nullsFirst: false })
      .order('review_count', { ascending: false })
      .limit(limit)

    if (error || !data) return []
    return (data as unknown as CanonicalPlaceRow[]).map(mapCanonicalPlace)
  } catch {
    return []
  }
}

async function getCanonicalPlaceByIdOrSlug(id: string): Promise<PublicPlace | null> {
  const bySlug = await getCanonicalPlace('slug', id)
  if (bySlug) return bySlug
  if (!isUuid(id)) return null
  return getCanonicalPlace('id', id)
}

async function getCanonicalPlace(column: 'id' | 'slug', value: string): Promise<PublicPlace | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('v_places_search')
      .select(CANONICAL_SELECT)
      .eq(column, value)
      .single()

    if (error || !data) return null
    return mapCanonicalPlace(data as unknown as CanonicalPlaceRow)
  } catch {
    return null
  }
}

async function getBahamasAttractions(limit: number): Promise<PublicPlace[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bahamas_attractions')
      .select(BAHAMAS_ATTRACTIONS_SELECT)
      .order('rating', { ascending: false, nullsFirst: false })
      .order('name', { ascending: true })
      .limit(limit)

    if (error || !data) return []
    return (data as unknown as BahamasAttractionRow[]).map(mapBahamasAttraction)
  } catch {
    return []
  }
}

async function getBahamasAttractionById(id: string): Promise<PublicPlace | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bahamas_attractions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return mapBahamasAttraction(data as BahamasAttractionRow)
  } catch {
    return null
  }
}

async function getCachedPlaceById(id: string): Promise<PublicPlace | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(CACHED_PLACE_SOURCE_TABLE)
      .select('id, name, type, island_id, address, description, image_url, photo_url, rating, user_ratings_total, price_level, phone, website, amenities, vibe_tags, cuisine_type, opening_hours, lat, lng')
      .eq('id', id)
      .eq('is_active', true)
      .eq('is_disabled', false)
      .single()

    if (error || !data) return null
    return mapCachedPlace(data as unknown as CachedPlaceRow)
  } catch {
    return null
  }
}

async function getTripAdvisorRestaurants(limit: number): Promise<PublicPlace[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tripadvisor_locations')
      .select('*')
      .eq('category', 'restaurants')
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error || !data) return []
    return (data as TripAdvisorLocation[]).map(mapTripAdvisorRestaurant)
  } catch {
    return []
  }
}

function mapCanonicalPlace(row: CanonicalPlaceRow): PublicPlace {
  const category = displayCategory(row.category, row.subcategory)
  const slugOrId = row.slug ?? row.id
  const metadata = row.metadata ?? {}
  const sourceUrl = stringOrNull(metadata.sourceUrl) ?? stringOrNull(metadata.source_url)
  const tripadvisorUrl = stringOrNull(metadata.tripadvisorUrl) ?? stringOrNull(metadata.tripadvisor_url)

  return {
    id: row.id,
    name: row.name,
    category,
    island: row.island_name,
    island_id: row.island_id,
    description: row.description ?? `Baha Buddy place record for ${row.name}.`,
    image_url: row.primary_image_url,
    tags: compactStrings([row.subcategory, row.source_priority]),
    rating: numberOrNull(row.rating),
    review_count: row.review_count ?? null,
    amenities: stringArray(metadata.amenities),
    price_range: row.price_level,
    short_description: stringOrNull(metadata.short_description) ?? row.description,
    enriched_at: row.updated_at,
    source_type: 'canonical',
    source_id: row.id,
    source_label: row.is_verified ? 'Verified by Baha Buddy' : 'Baha Buddy data',
    source_url: sourceUrl,
    tripadvisor_url: tripadvisorUrl,
    tripadvisor_rating: numberOrNull(metadata.tripadvisor_rating),
    tripadvisor_num_reviews: integerOrNull(metadata.tripadvisor_num_reviews),
    phone: row.phone,
    website: row.website,
    hours: recordOrNull(metadata.hours),
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    pros: stringArray(metadata.pros),
    cons: stringArray(metadata.cons),
    is_verified: Boolean(row.is_verified),
    is_partner: Boolean(row.is_partner),
    detail_href: `/explore/places/${encodeURIComponent(slugOrId)}`,
  }
}

function mapBahamasAttraction(row: BahamasAttractionRow): PublicPlace {
  const category = displayCategory(row.category)
  return {
    id: row.id,
    name: row.name,
    category,
    island: row.island,
    island_id: row.island,
    description: row.description ?? row.short_description ?? `Baha Buddy place record for ${row.name}.`,
    image_url: row.image_url,
    tags: row.tags ?? [],
    rating: numberOrNull(row.rating),
    review_count: row.review_count,
    amenities: row.amenities,
    price_range: row.price_range,
    short_description: row.short_description,
    enriched_at: row.enriched_at,
    source_type: 'bahamas_attraction',
    source_id: row.id,
    source_label: row.enriched_at ? 'Baha Buddy enriched' : 'Baha Buddy data',
    source_url: row.source_url,
    tripadvisor_url: row.tripadvisor_url ?? null,
    tripadvisor_rating: numberOrNull(row.tripadvisor_rating),
    tripadvisor_num_reviews: row.tripadvisor_num_reviews ?? null,
    phone: row.phone ?? null,
    website: row.website ?? null,
    hours: row.hours ?? null,
    latitude: numberOrNull(row.lat),
    longitude: numberOrNull(row.lng),
    pros: row.pros ?? null,
    cons: row.cons ?? null,
    detail_href: `/explore/places/${encodeURIComponent(row.id)}`,
  }
}

function mapCachedPlace(row: CachedPlaceRow): PublicPlace {
  const category = displayCategory(row.type ?? '', row.cuisine_type)
  const island = cachedIslandLabel(row.island_id)
  const description = row.description?.trim()
    || row.address?.trim()
    || `Baha Buddy catalog record for ${row.name}.`
  const priceNumber = numberOrNull(row.price_level)

  return {
    id: row.id,
    name: row.name,
    category,
    island,
    island_id: row.island_id,
    description,
    image_url: row.image_url ?? row.photo_url,
    tags: compactStrings([...(row.vibe_tags ?? []), row.cuisine_type]),
    rating: numberOrNull(row.rating),
    review_count: row.user_ratings_total,
    amenities: row.amenities,
    price_range: priceNumber ? '$'.repeat(Math.max(1, Math.min(4, Math.round(priceNumber)))) : null,
    short_description: description,
    enriched_at: null,
    source_type: 'cached_place',
    source_id: row.id,
    source_label: 'Baha Buddy catalog',
    phone: row.phone,
    website: row.website,
    hours: row.opening_hours,
    latitude: numberOrNull(row.lat),
    longitude: numberOrNull(row.lng),
    detail_href: `/explore/places/${encodeURIComponent(row.id)}`,
    availability_href: category === 'Hotel' && island
      ? `/stays?island=${encodeURIComponent(island)}`
      : undefined,
  }
}

function mapTripAdvisorRestaurant(row: TripAdvisorLocation): PublicPlace {
  const locationId = row.location_id || row.id
  const cuisines = row.cuisine_types?.map(formatCuisineLabel).filter(Boolean) ?? []
  const description = [
    cuisines.length > 0 ? `${cuisines.slice(0, 2).join(' and ')} restaurant` : 'Restaurant',
    row.island_name ? `on ${row.island_name}` : 'in the Bahamas',
    row.rating ? `rated ${row.rating.toFixed(1)}` : '',
    row.num_reviews ? `with ${row.num_reviews.toLocaleString()} traveler reviews` : '',
  ].filter(Boolean).join(' ')

  return {
    id: `tripadvisor-restaurant-${locationId}`,
    name: row.name,
    category: 'Dining',
    island: row.island_name,
    island_id: row.island_name,
    description,
    image_url: row.photos?.[0]?.url ?? null,
    tags: cuisines,
    rating: row.rating,
    review_count: row.num_reviews,
    amenities: row.amenities,
    price_range: row.price_level ? formatPriceLevelLabel(row.price_level) : null,
    short_description: description,
    enriched_at: 'tripadvisor',
    source_type: 'tripadvisor_restaurant',
    source_id: locationId,
    source_label: 'TripAdvisor data',
    tripadvisor_url: row.tripadvisor_url,
    tripadvisor_rating: row.rating,
    tripadvisor_num_reviews: row.num_reviews,
    phone: null,
    website: row.website,
    latitude: row.latitude,
    longitude: row.longitude,
    detail_href: `/restaurants/${encodeURIComponent(locationId)}`,
    availability_href: row.island_name ? `/restaurants?island=${encodeURIComponent(row.island_name)}` : '/restaurants',
    book_href: null,
  }
}

function fallbackPlace(
  id: string,
  name: string,
  category: string,
  island: string,
  description: string,
  imageUrl: string,
  tags: string[],
): PublicPlace {
  return {
    id,
    name,
    category,
    island,
    island_id: island,
    description,
    image_url: imageUrl,
    tags,
    rating: null,
    review_count: null,
    amenities: null,
    price_range: null,
    short_description: description,
    enriched_at: null,
    source_type: 'curated_fallback',
    source_id: id,
    source_label: 'Curated by Baha Buddy',
    detail_href: `/explore/places/${encodeURIComponent(id)}`,
  }
}

function mergePlaces(places: PublicPlace[]): PublicPlace[] {
  const byKey = new Map<string, PublicPlace>()

  for (const place of places) {
    const key = dedupeKey(place)
    if (!byKey.has(key)) {
      byKey.set(key, place)
      continue
    }

    const existing = byKey.get(key)!
    if (placeRank(place) > placeRank(existing)) {
      byKey.set(key, place)
    }
  }

  return Array.from(byKey.values())
}

function sortPlaces(places: PublicPlace[]): PublicPlace[] {
  return [...places].sort((a, b) => {
    const rank = placeRank(b) - placeRank(a)
    if (rank !== 0) return rank
    const rating = (b.rating ?? 0) - (a.rating ?? 0)
    if (rating !== 0) return rating
    const reviews = (b.review_count ?? 0) - (a.review_count ?? 0)
    if (reviews !== 0) return reviews
    return a.name.localeCompare(b.name)
  })
}

function placeRank(place: PublicPlace): number {
  if (place.source_type === 'canonical') return 40 + (place.is_verified ? 5 : 0) + (place.image_url ? 2 : 0)
  if (place.source_type === 'tripadvisor_restaurant') return 30 + (place.image_url ? 2 : 0)
  if (place.source_type === 'bahamas_attraction') return 25 + (place.image_url ? 2 : 0)
  if (place.source_type === 'cached_place') return 10 + (place.image_url ? 2 : 0)
  return 1
}

function dedupeKey(place: PublicPlace): string {
  return [
    normalize(place.name),
    normalize(place.island ?? place.island_id ?? ''),
    broadCategory(place.category),
  ].join('|')
}

function broadCategory(category: string): string {
  const value = normalize(category)
  if (value.includes('restaurant') || value.includes('dining') || value.includes('food')) return 'dining'
  if (value.includes('hotel') || value.includes('resort') || value.includes('stay') || value.includes('villa')) return 'stay'
  if (value.includes('beach')) return 'beach'
  if (value.includes('water') || value.includes('tour') || value.includes('activity') || value.includes('attraction')) return 'activity'
  return value
}

function displayCategory(category: string, subcategory?: string | null): string {
  const source = (subcategory || category || '').trim()
  const normalized = normalize(source)
  if (normalized.includes('restaurant') || normalized.includes('dining') || normalized.includes('food')) return 'Dining'
  if (normalized.includes('hotel') || normalized.includes('resort') || normalized.includes('stay') || normalized.includes('villa')) return 'Hotel'
  if (normalized.includes('beach')) return 'Beach'
  if (normalized.includes('culture') || normalized.includes('landmark') || normalized.includes('historic')) return 'Culture'
  if (normalized.includes('water') || normalized.includes('diving') || normalized.includes('snorkel') || normalized.includes('fishing')) return 'Water Activity'
  if (normalized.includes('tour') || normalized.includes('activity') || normalized.includes('attraction')) return 'Activity'
  if (!source) return 'Activity'
  return source
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function cachedIslandLabel(value: string | null): string | null {
  if (!value) return null
  const labels: Record<string, string> = {
    abacos: 'The Abacos',
    'the-abacos': 'The Abacos',
    exuma: 'The Exumas',
    exumas: 'The Exumas',
    'the-exumas': 'The Exumas',
    nassau: 'Nassau & Paradise Island',
    'nassau-paradise-island': 'Nassau & Paradise Island',
    'paradise-island': 'Nassau & Paradise Island',
    'eleuthera-harbour-island': 'Eleuthera & Harbour Island',
    'freeport-grand-bahama': 'Grand Bahama',
    'grand-bahama': 'Grand Bahama',
  }
  if (labels[value]) return labels[value]
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function numberOrNull(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function integerOrNull(value: unknown): number | null {
  const n = numberOrNull(value)
  return n === null ? null : Math.trunc(n)
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const strings = value.map((item) => String(item).trim()).filter(Boolean)
  return strings.length > 0 ? strings : null
}

function compactStrings(values: unknown[]): string[] {
  return values.map((value) => String(value ?? '').trim()).filter(Boolean)
}

function recordOrNull(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string' && raw.trim()) out[key] = raw.trim()
  }
  return Object.keys(out).length > 0 ? out : null
}
