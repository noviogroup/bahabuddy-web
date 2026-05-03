export type TripStatus = 'draft' | 'planned' | 'booked' | 'active' | 'completed' | 'cancelled'

export interface Trip {
  id: string
  user_id: string
  name: string
  status: TripStatus
  date_start: string | null
  date_end: string | null
  islands: string[]
  party_type: string
  party_size: number
  budget_estimate: number | null
  budget_actual: number | null
  hero_image_url: string | null
  created_at: string
  updated_at: string
}

export interface TripFlight {
  id: string
  trip_id: string
  origin: string
  destination: string
  departure_at: string | null
  arrival_at: string | null
  airline: string | null
  booking_reference: string | null
  price: number | null
  created_at: string
}

export interface TripAccommodation {
  id: string
  trip_id: string
  name: string
  island: string | null
  check_in: string | null
  check_out: string | null
  price_per_night: number | null
  guests: number | null
  booking_reference: string | null
  created_at: string
}

export interface TripActivity {
  id: string
  trip_id: string
  day_number: number
  time_slot: 'morning' | 'afternoon' | 'evening'
  activity_name: string
  activity_type: string | null
  notes: string | null
  sort_order: number
  created_at: string
}

export interface ShareLink {
  id: string
  trip_id: string
  created_by: string
  share_type: 'social_card' | 'link' | 'collaborative'
  short_code: string
  expires_at: string | null
  view_count: number
  created_at: string
}
