export type PublicPlaceSourceType =
  | "canonical"
  | "approved_activity"
  | "canonical_attraction"
  | "bahamas_attraction"
  | "cached_place"
  | "tripadvisor_restaurant"
  | "curated_fallback";

export interface PublicPlace {
  id: string;
  name: string;
  category: string;
  island: string | null;
  island_id?: string | null;
  description: string;
  image_url: string | null;
  /** Credit line for `image_url`, e.g. "Photo: Tripadvisor". */
  image_attribution?: string | null;
  tags: string[];
  rating: number | null;
  review_count: number | null;
  amenities: string[] | null;
  price_range: string | null;
  short_description: string | null;
  enriched_at: string | null;
  source_type: PublicPlaceSourceType;
  source_id?: string | null;
  source_label?: string | null;
  source_url?: string | null;
  tripadvisor_url?: string | null;
  tripadvisor_rating?: number | null;
  tripadvisor_num_reviews?: number | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  hours?: Record<string, string> | null;
  latitude?: number | null;
  longitude?: number | null;
  pros?: string[] | null;
  cons?: string[] | null;
  is_verified?: boolean;
  is_partner?: boolean;
  detail_href?: string;
  availability_href?: string;
  book_href?: string | null;
  duration_label?: string | null;
  price_basis_label?: string | null;
  booking_state_label?: string | null;
  meeting_pickup_label?: string | null;
  group_age_label?: string | null;
  safety_access_label?: string | null;
  cancellation_label?: string | null;
  source_as_of_label?: string | null;
  live_availability_state?: string | null;
  /** `places.trip_styles` slugs (canonical rows only; omitted when empty). */
  trip_styles?: string[];
  /** `places.price_tier`: luxury | premium | mid | value. */
  price_tier?: string;
  /** Non-default `places.business_status` (e.g. CLOSED_TEMPORARILY). */
  business_status?: string;
}
