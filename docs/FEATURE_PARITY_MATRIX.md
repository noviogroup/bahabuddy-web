# Baha Buddy Feature Parity Matrix

## Purpose

This document maps current product capability across Baha Buddy Web, Mobile, Admin, Supabase, and Edge Functions.

It should be used before any new product enhancement work. The goal is to identify which modules are ahead, which are behind, and what must be brought to parity before building Cruise Day Planner, Self-Guided Tours, Partner Portal, Concierge Orders, or deeper revenue features.

---

## Status Legend

| Status | Meaning |
|---|---|
| ✅ Current | Feature appears implemented and aligned enough to use |
| 🟡 Partial | Feature exists but is incomplete, uneven, or not fully wired across surfaces |
| 🔴 Gap | Missing or not yet usable |
| ⚠️ Risk | Feature exists but has security/data/model risk |
| 🧪 Needs Test | Code/schema exists, but end-to-end behavior needs live validation |
| ⏭ Later | Important, but not needed for foundation cleanup |

---

## 1. Core User + Trip Foundation

| Feature | Web | Mobile | Admin | Supabase | Edge Functions | Status | Required Action |
|---|---|---|---|---|---|---|---|
| User profile | Profile/onboarding surfaces exist | `upsertUserFromOnboarding`, `getCurrentUser` active | User list/detail exists | `users` has 19 rows, RLS enabled | N/A | ✅ Current | Confirm profile fields match across web/mobile |
| Anonymous/user auth | Supabase auth in web | `signInAnonymously` in mobile | Admin auth wrapper | `auth.users` + `users` | N/A | 🟡 Partial | Confirm web/mobile auth modes and upgrade path from anonymous to email |
| Saved trips | Trip index/detail exists | `createTrip`, `getTrips` active | Trip list/detail exists | `trips` has 25 rows | AI/chat functions create trips | ⚠️ Risk | Fix `trips` RLS before broad beta |
| Trip detail | `/trip/[id]` web page exists | My Trip flow exists | Trip detail API exists | `trip_accommodations`, `trip_flights`, `trip_activities` | N/A | 🟡 Partial | Test same trip across web/mobile |
| Trip ownership | Web trip page checks `trip.user_id === user.id` | Mobile queries `.eq('user_id', uid)` | Admin uses service role | `trips` RLS disabled | N/A | ⚠️ Risk | Add owner/collaborator RLS policies to `trips` |
| Trip collaborators | Web invite component/API exists | Mobile collaborator helpers exist | No ops surface | `trip_collaborators` has 0 rows | `accept-invite` expected | 🧪 Needs Test | Deploy/verify functions and test collaborator access |
| Trip sharing | Web share page/button exists | Mobile share helpers/screens exist | No ops view | `share_links` has 0 rows | `create-share-link`, `resolve-share-link` expected | 🧪 Needs Test | Confirm functions deployed and PUBLIC_APP_URL/deep links aligned |
| Trip invitations | Web `/api/trips/invite` exists | Mobile `sendTripInvite`, `previewInvite`, `acceptInvite` exist | No ops view | `trip_invitations` has 0 rows | `send-trip-invite`, `accept-invite` expected | 🧪 Needs Test | Test invite email/link flow and admin visibility |
| Trip realtime | Web has `useTripRealtime` | Mobile `subscribeToTripChanges` exists | No ops surface | Realtime needs migration confirmation | N/A | 🧪 Needs Test | Confirm Realtime enabled on trip item tables |

---

## 2. Conversations + AI Chat

| Feature | Web | Mobile | Admin | Supabase | Edge Functions | Status | Required Action |
|---|---|---|---|---|---|---|---|
| Chat threads | Web creates/uses threads | `getOrCreateGeneralThread` active | Chat thread API exists | `chat_threads` has 19 rows | `claude-chat-proxy`, web `/api/chat` | ✅ Current | Test thread continuity between web/mobile |
| Chat messages | Web persists messages | `insertChatMessage`, `getChatMessages` active | User detail exposes threads | `chat_messages` has 346 rows | AI functions | ✅ Current | Confirm card data renders consistently across web/mobile |
| AI trip auto-save | Web saves summary cards into trips | Mobile has trip creation helpers, AI proxy uses tools | No queue/ops view | `trips`, `trip_activities` | `claude-chat-proxy` | 🟡 Partial | Confirm mobile AI-generated plans save same way as web |
| Card types | Web RichCards expanded | Mobile card types include restaurant, mixed, etc. | Not managed | DB enum/support implied | AI functions emit cards | 🟡 Partial | Align card schema names across web/mobile/DB |
| AI usage logging | Web/admin expects logs | Mobile AI usage likely through Edge Function | Admin billing uses logs | `ai_usage_log` has 194; `ai_usage_logs` has 0 | `claude-chat-proxy`, others | 🟡 Partial | Consolidate duplicate `ai_usage_log` vs `ai_usage_logs` |
| Legacy AI functions | Web/mobile may use newer Claude | Some old docs/code reference OpenAI | No visibility | N/A | `openai-chat`, `openai-proxy`, `generate-itinerary`, `claude-chat-proxy` | ⚠️ Risk | Call-site audit and retire unused AI functions later |

---

## 3. Hotels, Restaurants, Activities + Places

| Feature | Web | Mobile | Admin | Supabase | Edge Functions | Status | Required Action |
|---|---|---|---|---|---|---|---|
| TripAdvisor hotels | `/hotels`, `/hotels/[id]` use `tripadvisor_locations` | `tripadvisorHotelsProvider` active | No admin management | `tripadvisor_locations` has 331 rows | Possibly seeder | ✅ Current | Move to canonical `places` view later |
| TripAdvisor restaurants | `/restaurants`, `/restaurants/[id]` use `tripadvisor_locations` | `tripadvisorRestaurantsProvider` active | No admin management | `tripadvisor_locations` has 331 rows | Possibly seeder | ✅ Current | Move to canonical `places` view later |
| Google Places | Chat/detail tools use `google_places` | Used by older/explore flows | No canonical control | `google_places` has 476 rows; reviews 1,724 | `google-places-sync`, `google-places-photo` | ✅ Current as source | Convert to source feed into canonical `places` |
| Legacy hotels table | Not primary | Not primary | Could confuse admin/devs | `hotels` has 0 rows | N/A | 🔴 Gap | Deprecate or convert to view later |
| Legacy restaurants table | Not primary | Not primary | Could confuse admin/devs | `restaurants` has 0 rows | N/A | 🔴 Gap | Deprecate or convert to view later |
| Legacy activities table | Not primary | Not primary | Could confuse admin/devs | `activities` has 0 rows | N/A | 🔴 Gap | Deprecate or convert to view later |
| Generic place photos | Web has place photo helper/API | Mobile unknown | No admin control | `place_photos` has 15 rows | `google-places-photo` | 🟡 Partial | Align with canonical `places` |
| Generic place reviews | Web has review display concepts | Mobile unknown | No admin control | `place_reviews` has 3 rows | Source sync functions | 🟡 Partial | Align with canonical `places` |
| Canonical places | Not present | Not present | Not present | No `places` table seen | N/A | 🔴 Gap | Create `places` + `place_sources` foundation |
| Place admin management | No | N/A | Not present | Source tables exist | N/A | 🔴 Gap | Add Admin Places after canonical model |
| Duplicate merge/hide | No clear UX | No | No | `google_places.is_disabled` exists | N/A | 🟡 Partial | Centralize hide/merge at canonical place level |

---

## 4. Flights + Booking

| Feature | Web | Mobile | Admin | Supabase | Edge Functions | Status | Required Action |
|---|---|---|---|---|---|---|---|
| Flight search | Web direct search/chat support | Mobile service helpers exist | Billing/service dashboard | `airports`, `cities`, `airlines` populated | `flights-proxy`, `airport-autocomplete` | ✅ Current | Run E2E flight search test |
| Duffel catalog | Web/mobile can use airport data | Mobile has Duffel integration path | Admin service status | airports 9,030; cities 255; airlines 777 | `duffel-catalog-sync` | ✅ Current | Confirm scheduled/triggered sync process |
| Duffel order creation | Web/mobile booking path likely exists | Mobile addFlight/update booking refs | Admin bookings view | `trip_flights` has 11; `bookings` has 0 | `duffel-create-order`, `duffel-order-management`, `duffel-webhook` | 🧪 Needs Test | Confirm paid/order lifecycle writes expected rows |
| Hotel booking/order | Web has hotel surfaces | Mobile accommodation helpers include LiteAPI fields | Admin billing/services | `trip_accommodations` has 6; `bookings` has 0 | `hotels-proxy`, `hotel-order-management` | 🟡 Partial | Clarify LiteAPI/hotel provider lifecycle |
| Restaurant order flow | Web restaurants exist | Mobile restaurants exist | No obvious order ops | `bookings` has 0 | `restaurant-order-management` | 🟡 Partial | Define if restaurants are reservations, referrals, or orders |
| Stripe checkout | Web checkout exists | Mobile Stripe dependency exists | Admin billing summarizes revenue | `bookings` has 0 | Stripe Edge Functions expected from code/docs | 🧪 Needs Test | Run full payment/booking test before launch |
| Booking records | Web/mobile add booking helpers | Mobile `addBooking`, `getBookings` active | Admin bookings APIs exist | `bookings` has 0 | order functions | 🧪 Needs Test | Confirm actual flows populate bookings |

---

## 5. Content, Deals, Islands

| Feature | Web | Mobile | Admin | Supabase/Sanity | Edge Functions | Status | Required Action |
|---|---|---|---|---|---|---|---|
| Islands | Web destination/explore pages | Mobile island explorer | Admin content maybe partial | `islands` has 16; `island_content` has 6 | N/A | ✅ Current | Decide Supabase vs Sanity ownership boundaries |
| Bahamas deals | Web deals/sections | Mobile likely shows deals | Admin not primary | `bahamas_deals` has 22; Sanity deals also exist | N/A | 🟡 Partial | Avoid duplicate deal source confusion |
| Bahamas attractions | Web island pages use attractions | Mobile explore/island pages likely | Admin not primary | `bahamas_attractions` has 32 | N/A | 🟡 Partial | Decide if attractions become `places` or content objects |
| Sanity articles/tips | Web wired | Mobile wired | Sanity Studio external | Sanity project canonical | `sanity-proxy` expected | ✅ Current | Keep Studio canonical for editorial content |
| Community content | Web has social videos/stories | Mobile has community tab content | Sanity Studio external | Sanity schemas | `sanity-proxy` | ✅ Current | Ensure production env vars and proxy deployed |
| Deals source | Web has Supabase + Sanity concepts | Mobile has Supabase + Sanity concepts | No unified admin | `bahamas_deals` + Sanity `deal` | N/A | ⚠️ Risk | Choose canonical deal source or sync pattern |

---

## 6. Admin + Operations

| Feature | Web | Mobile | Admin | Supabase | Edge Functions | Status | Required Action |
|---|---|---|---|---|---|---|---|
| Admin auth | N/A | N/A | Server-side admin auth exists | `admin_users` expected from code, not seen in public table list | N/A | 🟡 Partial | Verify `admin_users` table/schema; maybe table omitted/truncated? |
| CI/tests | N/A | N/A | CI/test suite added | N/A | N/A | ✅ Current | Keep all admin changes behind tests |
| User visibility | N/A | N/A | Users API/detail | `users`, trips, bookings, threads | N/A | ✅ Current | Add PII/audit guardrails |
| Billing/cost dashboard | N/A | N/A | Billing API exists | `api_credit_status`, `ai_usage_log`, `api_usage_log` | N/A | 🟡 Partial | Consolidate AI/API cost sources |
| Booking ops | N/A | N/A | Booking APIs exist | `bookings` has 0 | order functions | 🧪 Needs Test | Test actual booking lifecycle |
| Place management | N/A | N/A | Missing | source tables exist | source functions | 🔴 Gap | Build after canonical `places` exists |
| Partner management | N/A | N/A | Missing | no partner table seen | N/A | 🔴 Gap | Build after places foundation |
| Trip sharing/invite ops | N/A | N/A | Missing | share/invite tables empty | invite/share functions | 🔴 Gap | Add admin visibility after flow works |
| High-intent traveler queue | N/A | N/A | Missing | data exists across users/trips/chats | N/A | 🔴 Gap | Later after analytics foundation |

---

## 7. Revenue + Monetization Foundation

| Feature | Web | Mobile | Admin | Supabase | Status | Required Action |
|---|---|---|---|---|---|
| AI/API cost tracking | Web/admin support | Mobile via functions | Billing API | `ai_usage_log`, `api_credit_status` | 🟡 Partial | Normalize event/cost source names |
| Booking revenue | Checkout exists | Stripe dependency/helpers | Billing revenue summary | `bookings` 0, revenue views expected | 🧪 Needs Test | Run E2E payment and webhook test |
| Concierge product | Planned | Planned | No order queue | No concierge table seen | 🔴 Gap | Build after foundation cleanup |
| Partner subscriptions | Planned | N/A | Missing | No partner table seen | 🔴 Gap | Build after places foundation |
| Sponsored placements | Content system supports future | Mobile content support | Missing controls | Sanity + places future | ⏭ Later | Do not build before partner model |
| Tourism intelligence | Not yet | Not yet | Not yet | data scattered | ⏭ Later | Build after analytics/data model cleanup |

---

## 8. Cruise + Self-Guided Tours Readiness

| Feature | Web | Mobile | Admin | Supabase | Status | Required Action |
|---|---|---|---|---|---|
| Cruise traveler trip type | Not present | Not present | Not present | No cruise fields/table seen | 🔴 Gap | Add only after trips RLS + place foundation |
| Cruise day planner | Planned | Planned | Not present | No model | 🔴 Gap | Build after foundation sync |
| Self-guided tours | Planned | Planned | Not present | No `tours`/`tour_stops` seen | 🔴 Gap | Build after canonical places |
| Tour purchase flow | Planned | Planned | Not present | `bookings` could support later | 🔴 Gap | Define product/order type later |
| Port-safe recommendations | Planned | Planned | Not present | Needs canonical places + ports | 🔴 Gap | Requires places + cruise fields |

---

## 9. Main Gaps to Resolve Before New Features

### Gap 1: Trips security foundation

`trips` has RLS disabled. This must be fixed before broad beta or before building more trip-based product lines.

Required:

- Owner policies
- Collaborator policies
- Test web/mobile saved trips
- Test chat auto-save
- Test sharing/invite flows

### Gap 2: No canonical place source of truth

Current place data is split across:

- Google Places
- TripAdvisor locations
- empty legacy hotels/restaurants/activities
- generic photos/reviews
- Sanity content

Required:

- Create `places`
- Create `place_sources`
- Align `place_photos` and `place_reviews`
- Build compatibility views
- Migrate app read paths gradually

### Gap 3: Admin lacks control over places and partner readiness

Admin currently has analytics/users/bookings concepts but no canonical place management.

Required:

- Admin Places section
- Merge/hide/verify fields
- Source mapping visibility
- Partner flagging

### Gap 4: Booking lifecycle needs live validation

There are flight/hotel/order functions and booking tables, but live `bookings` has 0 rows.

Required:

- Test flight search → select → order → booking row
- Test hotel search → select → checkout/order → booking row
- Confirm webhook behavior
- Confirm admin revenue display

### Gap 5: Duplicate/legacy AI and cost tables/functions

The DB has `ai_usage_log` with rows and `ai_usage_logs` empty. Edge Functions include both older OpenAI flows and newer Claude flows.

Required:

- Decide canonical AI usage table
- Audit active AI call sites
- Retire legacy functions later

---

## 10. Recommended Foundation Cleanup Order

### Phase 1 — Safety and visibility

1. Draft and test `trips` RLS policies.
2. Confirm chat thread/message policies.
3. Confirm trip item policies.
4. Confirm sharing/invite function deployment.
5. Confirm saved trips and saved chats work across web/mobile.

### Phase 2 — Places foundation

1. Create canonical `places` table.
2. Create `place_sources` table.
3. Backfill TripAdvisor rows.
4. Backfill Google Places rows.
5. Deduplicate and map sources.
6. Create `v_places_hotels`, `v_places_restaurants`, `v_places_activities`.

### Phase 3 — App read-path parity

1. Migrate web hotel/restaurant directories to canonical views.
2. Migrate mobile hotel/restaurant providers to canonical views.
3. Migrate chat tools from Google Places to canonical views.
4. Keep source tables for enrichment/sync.

### Phase 4 — Admin control

1. Add Places admin module.
2. Add duplicate/merge review.
3. Add partner/verified flags.
4. Add source visibility.
5. Add basic partner table later.

### Phase 5 — Revenue readiness

1. Validate booking lifecycle.
2. Normalize AI/API cost logs.
3. Add concierge order model.
4. Add partner/revenue dashboards.

---

## 11. Definition of Foundation Complete

Foundation cleanup is complete when:

- Web and mobile show the same saved trips for the same user.
- Web and mobile show the same saved conversations for the same user.
- Web and mobile hotel/restaurant surfaces read from a canonical place layer.
- Chat recommendations use the canonical place layer.
- Admin can view and manage canonical places.
- `trips` has RLS enabled with tested owner/collaborator policies.
- Booking test flows populate `bookings` correctly.
- AI/API cost tracking has one clear reporting path.
- Legacy tables/functions are documented as source, staging, or deprecated.

---

## 12. Immediate Next Build Artifacts

Recommended next docs/migrations:

1. `supabase/migrations/<date>_trips_rls_policies.sql`
2. `supabase/migrations/<date>_canonical_places.sql`
3. `docs/ACTIVE_EDGE_FUNCTIONS_AUDIT.md`
4. `docs/PLACE_DATA_MIGRATION_PLAN.md`
5. `docs/FOUNDATION_TEST_PLAN.md`

Do not start Cruise Day Planner or Self-Guided Tours until at least the trips RLS and canonical places plan are in place.
