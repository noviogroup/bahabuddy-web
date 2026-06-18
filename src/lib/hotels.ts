import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getStayTypeFilterOptions, stayPropertyTypeAliases } from '@/lib/stay-property-types'

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

export async function getHotels(filters?: {
  island?: string
  propertyType?: string
  minStars?: number
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

    if (filters?.sort === 'stars') {
      query = query.order('star_rating', { ascending: false, nullsFirst: false })
    } else {
      query = query.order('review_score', { ascending: false, nullsFirst: false })
    }

    const { data, error } = await query
    if (error || !data) return []
    return data as Hotel[]
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
