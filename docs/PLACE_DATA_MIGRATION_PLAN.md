# Place Data Migration Plan

## Purpose

This document defines how Baha Buddy should cleanly unify Google Places, TripAdvisor, legacy hotel/restaurant/activity tables, place photos, place reviews, and future partner data.

The goal is to create one canonical Baha Buddy place layer without deleting useful source data.

This is a planning document only. It is not an executable migration.

---

## Current live state

Live Supabase inventory confirmed:

| Table | Rows | Current role |
|---|---:|---|
| `google_places` | 476 | Cached Google Places data |
| `google_place_reviews` | 1,724 | Cached Google reviews |
| `google_place_photos` | 0 | Google photo references/cache |
| `tripadvisor_locations` | 331 | TripAdvisor hotel/restaurant data |
| `place_photos` | 15 | Generic place photos, UUID-based |
| `place_reviews` | 3 | Generic place reviews, UUID-based |
| `hotels` | 0 | Legacy/curated table |
| `restaurants` | 0 | Legacy/curated table |
| `activities` | 0 | Legacy/curated table |

The `places` and `place_sources` tables do not currently exist.

---

## Current problem

Baha Buddy has multiple data sources but no product-facing place source of truth.

Examples:

- Web hotel and restaurant pages use `tripadvisor_locations`.
- Chat/tooling still references `google_places`.
- Mobile TripAdvisor screens use `tripadvisor_locations`.
- Legacy `hotels`, `restaurants`, and `activities` tables are empty.
- Generic `place_photos` and `place_reviews` exist, but there is no canonical `places` table for them to belong to.
- Admin does not yet manage official Baha Buddy place records.

---

## Foundation principle

External services feed Baha Buddy. They do not define Baha Buddy.

Google Places, TripAdvisor, Sanity, booking APIs, and partner/manual data should enrich the platform. The product-facing source of truth should be Baha Buddy's own canonical place records.

---

## Recommended canonical model

### Canonical table: `places`

Purpose: the official Baha Buddy place record used by web, mobile, chat, admin, booking, tours, cruise planning, and partner workflows.

Recommended fields:

- `id`: UUID primary key
- `name`: display name
- `slug`: unique human-readable URL slug
- `category`: hotel, restaurant, activity, attraction, beach, airport, tour, transportation, partner service
- `subcategory`: optional specific classification
- `island_id`: normalized island key
- `island_name`: display island name
- `address`: official/display address
- `latitude`: numeric coordinate
- `longitude`: numeric coordinate
- `phone`: display phone
- `website`: display website
- `description`: official Baha Buddy/admin description
- `primary_image_url`: approved primary image
- `rating`: display rating
- `review_count`: display review count
- `price_level`: display price level
- `status`: draft, active, hidden, archived
- `is_active`: public visibility flag
- `is_verified`: Baha Buddy verified flag
- `is_partner`: partner flag
- `source_priority`: notes which source currently drives display metadata
- `metadata`: flexible JSON metadata
- `created_at`: timestamp
- `updated_at`: timestamp

### Source mapping table: `place_sources`

Purpose: map each canonical place to one or more external or internal source records.

Recommended fields:

- `id`: UUID primary key
- `place_id`: canonical place reference
- `source`: google, tripadvisor, manual, partner, sanity, liteapi, viator
- `source_table`: original table or service name
- `source_record_id`: original DB row ID if applicable
- `source_location_id`: external source location ID
- `source_url`: external listing URL
- `source_rating`: source-specific rating
- `source_review_count`: source-specific review count
- `source_price_level`: source-specific price level
- `raw_payload`: raw source metadata
- `last_synced_at`: last sync time
- `created_at`: timestamp

---

## Compatibility views

After canonical records exist, add app-facing views:

- `v_places_hotels`
- `v_places_restaurants`
- `v_places_activities`
- `v_places_search`

These views let web/mobile/chat migrate gradually without breaking source sync tables.

Recommended behavior:

- `v_places_hotels` returns active hotel places.
- `v_places_restaurants` returns active restaurant places.
- `v_places_activities` returns active activities, attractions, tours, and beaches.
- `v_places_search` returns all active searchable places.

---

## Migration phases

## Phase 1: Create canonical tables

Create the canonical place layer:

- `places`
- `place_sources`
- indexes
- public read policies
- service-role write policies
- compatibility views

Do not delete or modify source tables in this phase.

## Phase 2: Backfill TripAdvisor data

TripAdvisor currently powers web/mobile hotel and restaurant directories, so it should be backfilled first.

Backfill rules:

- `tripadvisor_locations.category = hotels` maps to canonical category `hotel`.
- `tripadvisor_locations.category = restaurants` maps to canonical category `restaurant`.
- Use TripAdvisor `location_id` as a source identifier, not the canonical place ID.
- Copy rating, review count, TripAdvisor URL, address, island, latitude, longitude, photos, amenities, and cuisine/hotel metadata where available.

## Phase 3: Backfill Google Places data

Google Places currently has broader coverage and should enrich or add records.

Backfill rules:

- Google lodging-style places map to hotel.
- Google restaurants map to restaurant.
- Google attractions map to activity/attraction.
- Match existing TripAdvisor-backed places by normalized name, island, and approximate coordinates before creating duplicates.
- Store Google source metadata in `place_sources`.

## Phase 4: Dedupe and source linking

Create duplicate review workflow using:

- normalized name
- island
- category
- coordinate distance
- source ratings/reviews
- website/phone match

Do not auto-merge everything blindly. Generate a review list for admin where confidence is low.

## Phase 5: Align photos and reviews

The existing generic `place_photos` and `place_reviews` already use UUID `place_id`, which aligns with the proposed canonical `places.id`.

Needed checks:

- Confirm whether current `place_photos.place_id` values reference existing non-canonical UUIDs.
- Confirm whether current `place_reviews.place_id` values reference existing non-canonical UUIDs.
- Decide whether to preserve, remap, or archive those rows.

## Phase 6: Migrate app reads

Read-path order:

1. Web `/hotels` from `tripadvisor_locations` to `v_places_hotels`.
2. Web `/restaurants` from `tripadvisor_locations` to `v_places_restaurants`.
3. Mobile TripAdvisor hotel/restaurant providers to canonical views.
4. Web chat tools from `google_places` to canonical place views.
5. Mobile explore/place detail flows to canonical views.
6. Admin Places module to canonical `places`.

## Phase 7: Deprecate legacy direct reads

Do not delete source tables. Instead:

- Mark `google_places` as source/staging.
- Mark `tripadvisor_locations` as source/staging.
- Treat `hotels`, `restaurants`, and `activities` as legacy/empty until converted or removed.

---

## Preferred data conflict rules

### Name

Priority:

1. Manual/admin override
2. Partner official name
3. TripAdvisor
4. Google

### Address / coordinates

Priority:

1. Manual/admin override
2. Google
3. TripAdvisor

### Rating / review count

Priority:

1. TripAdvisor for hotels/restaurants
2. Google for attractions/local discovery
3. Baha Buddy first-party reviews later

### Photos

Priority:

1. Partner/admin approved images
2. Baha Buddy/Sanity curated images
3. TripAdvisor images
4. Google images

### Description

Priority:

1. Manual/admin copy
2. Sanity/editorial copy
3. Partner-provided copy
4. AI-generated draft marked for review
5. Source fallback

---

## Admin requirements after migration

The Admin panel needs a Places section with:

- List places
- Filter by island, category, source, partner, verified, active/hidden
- View linked source records
- Hide/show place
- Mark verified
- Mark partner
- Pick primary image
- Edit official description
- Merge duplicates
- Review source conflicts
- View source ratings/reviews

Do not build a public partner portal until internal admin control works.

---

## Recommended next technical step

Create a non-destructive migration that only creates:

- canonical place table
- place source mapping table
- indexes
- RLS policies for public read/service-role write
- compatibility views

Do not backfill data in the same first migration. Backfill should be separate so it can be tested, inspected, and rolled back independently.
