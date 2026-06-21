import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getStayTypeFilterOptions, stayPropertyTypeAliases } from '@/lib/stay-property-types'
import { hotelMatchesTravelerType, type StayTravelerType } from '@/lib/stay-traveler-types'

export interface Hotel {
  id: string
  name: string
  address: string | null
  city: string | null
  island: string | null
  country_code: string
  latitude: number | null
  longitude: number | null
  star_rating: number | null
  review_score: number | null
  review_count: number | null
  description: string | null
  main_photo_url: string | null
  photos: Array<string | { url: string; caption?: string }> | null
  amenities: string[]
  property_type_id: number | null
  property_type_name: string | null
  is_active: boolean
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export type HotelPhoto = NonNullable<Hotel['photos']>[number]

export function hotelPhotoUrl(photo: HotelPhoto): string | null {
  if (!photo) return null
  if (typeof photo === 'string') return validImageUrl(photo)
  return validImageUrl(photo.url)
}

export function hotelPhotoCaption(photo: HotelPhoto): string | undefined {
  if (!photo || typeof photo === 'string') return undefined
  return photo.caption
}

export function hotelPhotoUrls(hotel: Pick<Hotel, 'main_photo_url' | 'photos'>): string[] {
  const urls = new Set<string>()
  const main = validImageUrl(hotel.main_photo_url)
  if (main) urls.add(main)
  for (const photo of hotel.photos ?? []) {
    const url = hotelPhotoUrl(photo)
    if (url) urls.add(url)
  }
  return Array.from(urls)
}

export function hotelHeroPhotoUrl(hotel: Pick<Hotel, 'main_photo_url' | 'photos'>): string | null {
  return hotelPhotoUrls(hotel)[0] ?? null
}

function validImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const url = value.trim()
  if (!/^https?:\/\//i.test(url)) return null
  return url
}

const BROWSE_FIELDS =
  'id, name, city, island, star_rating, review_score, review_count, main_photo_url, photos, amenities, property_type_name' as const

export const FEATURED_STAY_ISLANDS = [
  { label: 'Nassau', aliases: ['nassau', 'new providence', 'paradise island'] },
  { label: 'Exuma', aliases: ['exuma', 'exumas', 'the exumas'] },
  { label: 'Harbour Island', aliases: ['harbour island', 'harbor island', 'dunmore town'] },
  { label: 'Abaco', aliases: ['abaco', 'abacos', 'the abacos'] },
  { label: 'Bimini', aliases: ['bimini'] },
] as const

export async function getHotels(filters?: {
  island?: string
  city?: string
  propertyType?: string
  travelerType?: StayTravelerType
  minStars?: number
  minGuestRating?: number
  amenities?: string[]
  sort?: 'rating' | 'stars'
}): Promise<Hotel[]> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('hotels')
      .select(BROWSE_FIELDS)
      .eq('is_active', true)
      .limit(200)

    if (filters?.island) {
      query = query.ilike('island', filters.island)
    }
    if (filters?.city) {
      query = query.ilike('city', filters.city)
    }
    if (filters?.propertyType) {
      const aliases = stayPropertyTypeAliases(filters.propertyType)
      if (aliases.length > 0) {
        query = query.or(
          aliases
            .map((value) => `property_type_name.ilike.${value.replaceAll(',', '')}`)
            .join(','),
        )
      }
    }
    if (filters?.minStars) {
      query = query.gte('star_rating', filters.minStars)
    }
    if (filters?.minGuestRating) {
      query = query.gte('review_score', filters.minGuestRating)
    }
    if (filters?.amenities && filters.amenities.length > 0) {
      query = query.contains('amenities', filters.amenities)
    }

    if (filters?.sort === 'stars') {
      query = query
        .order('star_rating', { ascending: false, nullsFirst: false })
        .order('review_score', { ascending: false, nullsFirst: false })
        .order('review_count', { ascending: false, nullsFirst: false })
        .order('name', { ascending: true })
    } else {
      query = query
        .order('review_score', { ascending: false, nullsFirst: false })
        .order('review_count', { ascending: false, nullsFirst: false })
        .order('star_rating', { ascending: false, nullsFirst: false })
        .order('name', { ascending: true })
    }

    const { data, error } = await query
    if (error || !data) return []
    const hotels = data as Hotel[]
    return filters?.travelerType
      ? hotels.filter((hotel) => hotelMatchesTravelerType(hotel, filters.travelerType))
      : hotels
  } catch {
    return []
  }
}

export async function getFeaturedStayHotels(limit = 6): Promise<Hotel[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('hotels')
      .select(BROWSE_FIELDS)
      .eq('is_active', true)
      .gte('star_rating', 4)
      .limit(500)

    if (error || !data) return []

    const candidates = (data as Hotel[])
      .filter((hotel) => featuredIslandLabel(hotel.island) != null)
      .sort(compareHotelsForFeatured)

    const imageReady = candidates.filter((hotel) => hotelHeroPhotoUrl(hotel))
    const pool = imageReady.length >= Math.min(limit, FEATURED_STAY_ISLANDS.length)
      ? imageReady
      : candidates

    const selected = new Map<string, Hotel>()
    for (const island of FEATURED_STAY_ISLANDS) {
      const bestForIsland = pool.find((hotel) => featuredIslandLabel(hotel.island) === island.label)
      if (bestForIsland) selected.set(bestForIsland.id, bestForIsland)
    }

    for (const hotel of pool) {
      if (selected.size >= limit) break
      selected.set(hotel.id, hotel)
    }

    return Array.from(selected.values()).slice(0, limit)
  } catch {
    return []
  }
}

function normalizeIsland(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function featuredIslandLabel(value: string | null | undefined): string | null {
  const normalized = normalizeIsland(value)
  if (!normalized) return null

  for (const island of FEATURED_STAY_ISLANDS) {
    if (island.aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return island.label
    }
  }

  return null
}

function compareHotelsForFeatured(a: Hotel, b: Hotel): number {
  return (
    (b.star_rating ?? 0) - (a.star_rating ?? 0)
    || (b.review_score ?? 0) - (a.review_score ?? 0)
    || (b.review_count ?? 0) - (a.review_count ?? 0)
    || a.name.localeCompare(b.name)
  )
}

export async function getAmenityOptions(limit = 12): Promise<string[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('hotels')
      .select('amenities')
      .eq('is_active', true)
      .not('amenities', 'is', null)
      .limit(500)
    if (error || !data) return []

    const counts = new Map<string, { label: string; count: number }>()
    for (const row of data as Array<{ amenities: unknown }>) {
      if (!Array.isArray(row.amenities)) continue
      for (const value of row.amenities) {
        if (typeof value !== 'string') continue
        const label = value.trim()
        if (!label) continue
        const key = label.toLowerCase()
        const current = counts.get(key)
        if (current) {
          current.count += 1
        } else {
          counts.set(key, { label, count: 1 })
        }
      }
    }

    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, limit)
      .map((item) => item.label)
  } catch {
    return []
  }
}

export async function getHotelById(hotelId: string): Promise<Hotel | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', hotelId)
      .single()
    if (error || !data) return null
    return data as Hotel
  } catch {
    return null
  }
}

export async function getSimilarHotels(hotel: Hotel, limit = 4): Promise<Hotel[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('hotels')
      .select(BROWSE_FIELDS)
      .eq('is_active', true)
      .ilike('island', hotel.island ?? '')
      .neq('id', hotel.id)
      .order('review_score', { ascending: false, nullsFirst: false })
      .limit(limit)
    return (data as Hotel[]) ?? []
  } catch {
    return []
  }
}

export async function getIslandOptions(): Promise<string[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('hotels')
      .select('island')
      .eq('is_active', true)
      .not('island', 'is', null)
    if (!data) return []
    const unique = Array.from(new Set(data.map((r) => r.island as string))).sort()
    return unique
  } catch {
    return []
  }
}

export async function getCityOptions(island?: string): Promise<string[]> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('hotels')
      .select('city')
      .eq('is_active', true)
      .not('city', 'is', null)

    if (island) {
      query = query.ilike('island', island)
    }

    const { data } = await query
    if (!data) return []
    return Array.from(new Set(
      data
        .map((r) => r.city as string)
        .map((city) => city.trim())
        .filter(Boolean),
    )).sort()
  } catch {
    return []
  }
}

export async function getPropertyTypes(): Promise<string[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('hotels')
      .select('property_type_name')
      .eq('is_active', true)
      .not('property_type_name', 'is', null)
    if (!data) return []
    const unique = Array.from(new Set(data.map((r) => r.property_type_name as string))).sort()
    return getStayTypeFilterOptions(unique)
  } catch {
    return getStayTypeFilterOptions([])
  }
}
