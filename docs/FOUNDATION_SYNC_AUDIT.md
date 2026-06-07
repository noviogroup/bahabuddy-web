# Baha Buddy Foundation Sync Audit

## Purpose

This document captures the current foundation state across Baha Buddy Web, Mobile, Admin, and Supabase before new product enhancements are developed.

The goal is to bring the platform to one clean current level before adding Cruise Day Planner, Self-Guided Tours, Partner Portal, Concierge Orders, or advanced revenue features.

---

## 1. Current Live Supabase Project

Project:

- Name: `baha buddy`
- Project ref: `cxcfymhoncysyloutvkh`
- Region: `us-east-2`
- Database: PostgreSQL 15.8
- Status: active / healthy

---

## 2. Critical Live Finding

### `public.trips` has RLS disabled

Supabase table inventory flagged `public.trips` as the only public table with RLS disabled.

Current state:

- `public.trips` rows: 25
- RLS: disabled
- Comment: `Trip entities; chat_thread_id set when thread is created`

Why this matters:

The `trips` table is a core user-owned table. It connects to saved trips, AI-generated plans, trip detail pages, bookings, accommodations, flights, activities, and chat context. If RLS is disabled, app clients using anon/authenticated Supabase keys may potentially access or modify rows outside their own user scope unless every access path is protected elsewhere.

Do not blindly enable RLS until policies are defined and tested. Enabling RLS without policies can break existing web/mobile flows.

Recommended remediation path:

1. Audit every app/API path reading/writing `trips`.
2. Confirm the owner field is consistently `user_id`.
3. Add RLS policies for owner read/write.
4. Add collaborator read access if `trip_collaborators` is active.
5. Confirm service-role admin/API routes still work.
6. Enable RLS in a controlled migration.
7. Test web and mobile saved trips, trip detail, chat auto-save, and sharing.

Draft policy direction:

```sql
-- Do not run until reviewed and tested.
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own trips"
ON public.trips
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own trips"
ON public.trips
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own trips"
ON public.trips
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own trips"
ON public.trips
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
```

Potential collaborator policy:

```sql
-- Only if trip_collaborators is intended to grant shared access.
CREATE POLICY "Collaborators can read shared trips"
ON public.trips
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.trip_collaborators tc
    WHERE tc.trip_id = trips.id
      AND tc.user_id = auth.uid()
  )
);
```

---

## 3. Live Supabase Data Inventory Summary

Important tables and row counts:

| Table | Rows | RLS | Notes |
|---|---:|---|---|
| `hotels` | 0 | enabled | Legacy/curated table, currently empty |
| `activities` | 0 | enabled | Legacy/curated table, currently empty |
| `restaurants` | 0 | enabled | Legacy/curated table, currently empty |
| `flights` | 0 | enabled | Curated flight deals/packages |
| `google_places` | 476 | enabled | Cached Google Places data |
| `google_place_reviews` | 1,724 | enabled | Cached Google reviews |
| `google_place_photos` | 0 | enabled | Google photo references/cached URLs |
| `tripadvisor_locations` | 331 | enabled | TripAdvisor hotel/restaurant data |
| `place_photos` | 15 | enabled | Generic place photos table exists |
| `place_reviews` | 3 | enabled | Generic place reviews table exists |
| `islands` | 16 | enabled | Island master/reference data |
| `bahamas_deals` | 22 | enabled | Destination/deal content |
| `bahamas_attractions` | 32 | enabled | Attraction content |
| `users` | 19 | enabled | User profile table aligned with auth users |
| `trips` | 25 | disabled | Critical RLS issue |
| `chat_threads` | 19 | enabled | User-owned chat threads |
| `chat_messages` | 346 | enabled | Saved messages and rich cards |
| `trip_accommodations` | 6 | enabled | Saved accommodations |
| `trip_flights` | 11 | enabled | Saved flights |
| `trip_activities` | 0 | enabled | Saved itinerary activities |
| `share_links` | 0 | enabled | Social sharing foundation |
| `trip_invitations` | 0 | enabled | Invite foundation |
| `trip_collaborators` | 0 | enabled | Collaboration foundation |
| `bookings` | 0 | enabled | Booking records |
| `api_credit_status` | 9 | enabled | API credit/cost status |
| `api_usage_log` | 0 | enabled | API usage tracking |
| `ai_usage_log` | 194 | enabled | AI usage tracking |
| `ai_usage_logs` | 0 | enabled | Possible duplicate/older AI usage table |
| `airports` | 9,030 | enabled | Duffel airport catalog |
| `cities` | 255 | enabled | Duffel city catalog |
| `airlines` | 777 | enabled | Duffel airline catalog |

---

## 4. Data Foundation Diagnosis

### Current issue

The platform has multiple source-specific and legacy tables operating side by side:

- `google_places`
- `google_place_reviews`
- `google_place_photos`
- `tripadvisor_locations`
- empty legacy `hotels`, `restaurants`, `activities`
- generic `place_photos`, `place_reviews`
- Sanity content outside Supabase
- partner/revenue concepts not yet centralized

### Product impact

Different surfaces may show different data:

- Web hotel/restaurant directories use TripAdvisor data.
- Chat tools may still use Google Places data.
- Mobile uses TripAdvisor service for hotel/restaurant screens.
- Admin does not yet manage a canonical place record.
- Legacy `hotels`, `restaurants`, and `activities` tables are empty and can confuse future development.

### Strategic problem

The product has external sources but does not yet have a canonical internal place source of truth.

The single source of truth should not be Google or TripAdvisor. It should be a Baha Buddy-owned canonical place record enriched by multiple sources.

---

## 5. Recommended Canonical Place Architecture

### New or confirmed canonical table needed: `places`

A master `places` table should represent the official Baha Buddy listing used by web, mobile, chat, admin, and partner workflows.

Recommended fields:

```sql
places
- id uuid primary key
- name text not null
- slug text unique
- category text not null -- hotel, restaurant, activity, attraction, beach, airport, partner_service, tour
- subcategory text
- island_id text
- island_name text
- address text
- latitude numeric
- longitude numeric
- phone text
- website text
- description text
- primary_image_url text
- rating numeric
- review_count integer
- price_level text
- status text default 'draft' -- draft, active, hidden, archived
- is_active boolean default true
- is_verified boolean default false
- is_partner boolean default false
- created_at timestamptz default now()
- updated_at timestamptz default now()
```

### Source mapping table: `place_sources`

External systems should feed into canonical places instead of becoming the app-facing source of truth.

```sql
place_sources
- id uuid primary key
- place_id uuid references public.places(id)
- source text not null -- google, tripadvisor, manual, sanity, partner, liteapi, viator
- source_location_id text
- source_url text
- source_rating numeric
- source_review_count integer
- source_price_level text
- raw_payload jsonb
- last_synced_at timestamptz
- created_at timestamptz default now()
```

### Existing generic tables to align

The database already has:

- `place_photos` with 15 rows
- `place_reviews` with 3 rows

These should become the canonical photo/review tables tied to `places`. Confirm whether they already have `place_id` pointing to a future/generic place concept or to a specific source table.

### Source tables become staging/enrichment tables

Keep the following as source/staging tables for now:

- `google_places`
- `google_place_reviews`
- `google_place_photos`
- `tripadvisor_locations`

Do not delete them. They provide source history, raw external metadata, ratings, reviews, and sync debugging.

---

## 6. Feature Parity Matrix — Initial Version

| Feature / Module | Web | Mobile | Admin | Supabase | Status |
|---|---|---|---|---|---|
| User profiles | Yes | Yes | Visible | `users` | Mostly aligned |
| Saved trips | Yes | Needs confirmation of full parity | Needs better admin visibility | `trips` | Blocked by RLS cleanup |
| Saved chat threads | Yes | Needs confirmation of full parity | Needs better admin visibility | `chat_threads`, `chat_messages` | Needs parity test |
| Auto-save AI trips | Yes on web | Needs confirmation | No operational view | `trips`, `trip_activities` | Needs parity test |
| Trip accommodations | Yes | Partial/needs test | Needs visibility | `trip_accommodations` | Needs sync |
| Trip flights | Yes | Partial/needs test | Needs visibility | `trip_flights` | Needs sync |
| Trip activities | Yes conceptually | Needs test | Needs visibility | `trip_activities` has 0 rows | Weak/underused |
| Trip sharing | Partial web/share page | Yes recent mobile work | No ops view | `share_links` | Needs deployment/test |
| Trip invites | Partial web/social layer | Yes recent mobile work | No ops view | `trip_invitations`, `trip_collaborators` | Needs deployment/test |
| Google Places | Used by chat/tools | Used historically | No canonical admin control | `google_places` | Source table only |
| TripAdvisor hotels/restaurants | Yes web directories | Yes mobile screens | No canonical admin control | `tripadvisor_locations` | Source table only |
| Legacy hotel/restaurant/activity tables | Likely not primary | Likely not primary | Maybe old references | empty tables | Should deprecate or convert |
| Sanity content | Yes | Yes | Studio external | Sanity | Good but separate from places |
| Bookings | Stripe/booking flows exist | Needs test | Billing view exists | `bookings` rows 0 | Needs end-to-end validation |
| AI/API cost tracking | Web/admin support | Mobile AI usage | Admin billing | `ai_usage_log`, `api_credit_status` | Needs consolidation |
| Partner system | Planned | Planned | Not present as canonical module | No partner table seen in public list | Not built |
| Cruise travelers | Planned | Planned | Not present | No cruise-specific trip type seen | Not built |
| Self-guided tours | Planned | Planned | Not present | No tours/tour_stops table seen | Not built |

---

## 7. Edge Function Inventory — Product Grouping

The live project has many active Edge Functions. Grouping them by product area:

### AI / Chat / Voice

- `openai-proxy`
- `openai-chat`
- `claude-chat-proxy`
- `speech-to-text`
- `generate-itinerary`

Notes:

- Some older functions such as `openai-chat` and `generate-itinerary` may represent legacy or pre-Claude flows.
- Confirm which functions are still called by mobile/web.
- Remove or retire unused functions only after call-site audit.

### Google Places

- `google-places-sync`
- `google-places-photo`
- `google-places-photo-sync`

Notes:

- Google Places is active and has 476 cached rows.
- Should become source/enrichment feed into canonical `places`.

### Flights / Duffel

- `flights-proxy`
- `duffel-catalog-sync`
- `airport-autocomplete`
- `duffel-create-order`
- `duffel-order-management`
- `duffel-webhook`

Notes:

- Airports/cities/airlines catalogs are populated.
- Flight booking/order stack exists and should be included in parity testing.

### Hotels / Restaurants

- `hotels-proxy`
- `hotel-order-management`
- `restaurant-order-management`

Notes:

- Need to confirm how these relate to TripAdvisor directories and any real booking provider.
- They should eventually write to canonical booking/order records.

### Communications / Sharing

- `send-email`
- Recent social share/invite functions expected from mobile repo may need deployment verification by name.

---

## 8. Foundation Cleanup Sprint

### Sprint objective

Bring web, mobile, admin, and Supabase to one current, stable foundation before new feature development.

### Sprint outcomes

1. One feature parity matrix.
2. One canonical place architecture.
3. One RLS remediation plan for trips.
4. One database migration plan.
5. One read-path migration plan for web/mobile/chat.
6. One admin control plan for places, trips, and revenue.

---

## 9. Recommended Workstreams

## Workstream A — Feature Parity Audit

Audit these features across web, mobile, and admin:

- Saved trips
- Saved conversations
- Trip detail
- Trip activities
- Trip flights
- Trip accommodations
- Chat auto-save
- Trip sharing
- Trip invites
- Hotel directory
- Restaurant directory
- Place detail pages
- TripAdvisor data
- Google Places data
- Mixpanel events
- AI usage logging
- Booking flows
- Stripe/Duffel/hotel/restaurant order flows

Deliverable:

- `docs/FEATURE_PARITY_MATRIX.md`

## Workstream B — RLS + Ownership Safety

Immediate focus:

- `trips` RLS disabled
- verify `chat_threads` policies
- verify `chat_messages` policies
- verify `trip_flights`, `trip_accommodations`, `trip_activities`
- verify share/invite/collaborator access rules

Deliverable:

- Safe SQL migration for RLS policies.
- Test checklist for web/mobile.

## Workstream C — Canonical Places

Create and populate:

- `places`
- `place_sources`
- align existing `place_photos`
- align existing `place_reviews`

Backfill strategy:

1. Backfill TripAdvisor hotels/restaurants into `places`.
2. Backfill Google Places into `places`.
3. Deduplicate by normalized name + island + coordinates.
4. Link source rows through `place_sources`.
5. Create app-facing views.

Recommended views:

```sql
v_places_hotels
v_places_restaurants
v_places_activities
v_places_search
```

## Workstream D — App Read-Path Migration

Move app reads gradually:

- Web `/hotels` and `/restaurants` from `tripadvisor_locations` to `v_places_*`.
- Mobile TripAdvisor screens from `tripadvisor_locations` to `v_places_*`.
- Chat tools from `google_places` to `v_places_*`.
- Detail pages use canonical `places.id` or stable slug.

Do not break source-specific pages until parity is proven.

## Workstream E — Admin Control Layer

Add admin surfaces for:

- Places
- Sources
- Duplicate review/merge
- Hide/show places
- Mark verified
- Mark partner
- Set primary image
- Override description
- Partner linking later

## Workstream F — Deprecation Plan

Do not delete immediately.

Mark these as source/legacy:

- `hotels`
- `restaurants`
- `activities`
- direct app queries to `google_places`
- direct app queries to `tripadvisor_locations`

Eventually archive or convert once the canonical layer is stable.

---

## 10. First Technical Decisions Needed

Before writing migrations, decide:

1. Should `places.id` be UUID or text? Recommendation: UUID.
2. Should `places.slug` be globally unique? Recommendation: yes.
3. Should source rows store canonical `place_id` directly? Recommendation: yes where practical, plus `place_sources`.
4. Should ratings be calculated from preferred source or stored manually? Recommendation: store display rating on `places`, track source ratings separately.
5. Should TripAdvisor or Google win conflicts? Recommendation: manual/partner > TripAdvisor > Google for hotels/restaurants; manual/partner > Google > TripAdvisor for attractions/local map discovery.
6. Should old tables be hidden from app code? Recommendation: yes after compatibility views are live.

---

## 11. Immediate Next Actions

1. Do not build Cruise Day Planner or Self-Guided Tours yet.
2. Create `FEATURE_PARITY_MATRIX.md` from actual web/mobile/admin code.
3. Draft `places` and `place_sources` migrations.
4. Draft `trips` RLS policy migration.
5. Test saved trips and saved chat across web/mobile.
6. Confirm which Edge Functions are active call paths vs legacy.
7. Add admin Places page after canonical tables exist.

---

## 12. Foundation Principle

External services feed Baha Buddy. They do not define Baha Buddy.

Google Places, TripAdvisor, Sanity, Duffel, LiteAPI, Viator, and partner data should enrich the platform. The product-facing source of truth should be Baha Buddy's own canonical tables and admin-controlled records.
