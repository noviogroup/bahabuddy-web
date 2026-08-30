export type PublicPlaceSourceType =
  | 'canonical'
  | 'bahamas_attraction'
  | 'cached_place'
  | 'tripadvisor_restaurant'
  | 'curated_fallback'

export interface PublicPlace {
  id: string
  name: string
  category: string
  island: string | null
  island_id?: string | null
  description: string
  image_url: string | null
  tags: string[]
  rating: number | null
  review_count: number | null
  amenities: string[] | null
  price_range: string | null
  short_description: string | null
  enriched_at: string | null
  source_type: PublicPlaceSourceType
  source_id?: string | null
  source_label?: string | null
  source_url?: string | null
  tripadvisor_url?: string | null
  tripadvisor_rating?: number | null
  tripadvisor_num_reviews?: number | null
  phone?: string | null
  website?: string | null
  hours?: Record<string, string> | null
  latitude?: number | null
  longitude?: number | null
  pros?: string[] | null
  cons?: string[] | null
  is_verified?: boolean
  is_partner?: boolean
  detail_href?: string
  availability_href?: string
  book_href?: string | null
}
