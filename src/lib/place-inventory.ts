export const CANONICAL_PLACE_INVENTORY_TABLE = "places";

// Database compatibility name for Supabase cached/source place rows.
// Public web copy and operational labels should call this cached place
// inventory, not an external provider.
export const CACHED_PLACE_SOURCE_TABLE = "google_places";
export const CACHED_PLACE_SOURCE_ID_FIELD = "google_place_id";
export const CACHED_PLACE_REVIEW_TABLE = "google_place_reviews";
export const CACHED_PLACE_PHOTO_TABLE = "google_place_photos";
