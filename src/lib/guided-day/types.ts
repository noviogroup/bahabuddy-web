export type GuidedDayPlanStatus = 'draft' | 'review' | 'published' | 'archived'

export type GuidedDayPlan = {
  id: string
  title: string
  slug: string
  short_description: string | null
  full_description: string | null
  island: string
  area: string
  itinerary_type: string
  traveler_types: string[]
  interests: string[]
  duration_min_minutes: number
  duration_max_minutes: number
  mobility_level: string
  budget_level: string
  base_price: number
  personalized_price: number
  concierge_price: number | null
  hero_image_url: string | null
  default_return_buffer_minutes: number
  supports_live_guide: boolean
  supports_google_maps_fallback: boolean
  supports_mapbox_navigation: boolean
  status: GuidedDayPlanStatus
  stop_count?: number
}

export type GuidedDayStop = {
  id: string
  stop_order: number
  name: string
  stop_type: string
  address: string | null
  latitude: number
  longitude: number
  google_place_id: string | null
  suggested_arrival_offset_minutes: number | null
  suggested_duration_minutes: number
  description: string | null
  baha_tip: string | null
  estimated_cost: number | null
  is_required: boolean
  kid_friendly: boolean
  bathroom_available: boolean
  food_available: boolean
  accessibility_notes: string | null
  safety_notes: string | null
  image_urls: string[]
}

export type GuidedDayPlanDetail = GuidedDayPlan & {
  stops: GuidedDayStop[]
}

export type GuidedDayOrderInput = {
  itinerary_id: string
  product_tier: 'basic' | 'personalized' | 'concierge'
  customer_name?: string
  customer_email?: string
  ship_name?: string
  arrival_time?: string
  departure_time?: string
  all_aboard_time?: string
  visit_date?: string
  group_size?: number
  adults?: number
  children?: number
  budget_per_person?: number
  mobility_level?: string
  interests?: string[]
}
