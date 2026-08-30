# Baha Buddy Feature Parity Matrix

Last reviewed: June 23, 2026, 17:47 EDT

> **June 23 parity snapshot.** Partner/vendor work, July provider cleanup, and the July 26 backend
> inventory audit postdate this matrix. Use the root command center for live status.

## Purpose

This document maps current product capability across Baha Buddy Web, Mobile, Admin, Supabase, and Edge Functions.

It should be used before any new product enhancement work. The goal is to identify which modules are ahead, which are behind, and what must be brought to parity before building Cruise Day Planner, Self-Guided Tours, Partner Portal, Concierge Orders, or deeper revenue features.

Current web validation is documented in [`2026-06-20-WEB-PUBLIC-BOOKING-UI-DATED-REVIEW.md`](./2026-06-20-WEB-PUBLIC-BOOKING-UI-DATED-REVIEW.md).

June 23 audit note: several foundation gates that were marked as pending in the June 20 matrix have since been verified and documented. Trips RLS, share/invite, web trip-list app-session behavior, and mobile simulator trip-list/invite-return behavior now have evidence in the June 21 dated reviews. The remaining launch risks are deployed booking-runtime proof, live provider/payment lifecycle reconciliation, Firebase/APNs push delivery, physical-device checks, visual QA, and canonical place/content migration.

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
| Saved trips | Trip index/detail exists | `createTrip`, `getTrips` active | Trip list/detail exists | `trips` RLS launch gate applied and validated in later June 21 checks | AI/chat functions create trips | ✅ Current | Keep web/mobile trip-list smoke checks in release QA |
| Trip detail | `/trip/[id]` web page exists | My Trip flow exists | Trip detail API exists | `trip_accommodations`, `trip_flights`, `trip_activities` | N/A | 🟡 Partial | Test same trip across web/mobile |
| Trip ownership | Web trip page checks ownership/collaborator access | Mobile owned plus accepted collaborator behavior verified | Admin uses service role | Owner, non-owner, collaborator, editor child-write, and service-role behavior verified live | N/A | ✅ Current | Keep physical-device invite smoke in launch QA |
| Trip collaborators | Web invite component/API exists | Mobile collaborator helpers and simulator invite-return verified | Admin ops visibility still light | Accepted collaborator read and invite acceptance verified live | `accept-invite` verified | ✅ Current | Add admin visibility later; physical-device smoke remains |
| Trip sharing | Web share page/button exists | Mobile share helpers/screens exist | No ops view | Share link creation and sanitized public resolution verified live | `create-share-link`, `resolve-share-link` verified | ✅ Current | Keep deep-link checks in visual/device QA |
| Trip invitations | Web `/api/trips/invite` exists | Mobile preview/accept/return route verified in simulator | No ops view | Invitation preview, accept, accepted state, collaborator row, and `collaborator_ids` sync verified live | `send-trip-invite`, `accept-invite` deployed; accept path verified | ✅ Current | Real email delivery and physical-device smoke remain |
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
| Supabase cached place inventory | Chat/detail tools use cached source/enrichment data | Used by older/explore flows as source/enrichment | Canonical control comes from `places`; source rows should not be treated as current product inventory | Cached source inventory has 476 rows; reviews 1,724 | Provider sync/photo jobs | ✅ Current as source/enrichment | Keep canonical `places` first; migrate source rows into managed place records |
| Legacy hotels table | Not primary | Not primary | Could confuse admin/devs | `hotels` has 0 rows | N/A | 🔴 Gap | Deprecate or convert to view later |
| Legacy restaurants table | Not primary | Not primary | Could confuse admin/devs | `restaurants` has 0 rows | N/A | 🔴 Gap | Deprecate or convert to view later |
| Legacy activities table | Not primary | Not primary | Could confuse admin/devs | `activities` has 0 rows | N/A | 🔴 Gap | Deprecate or convert to view later |
| Generic place photos | Web has place photo helper/API | Mobile unknown | No admin control | `place_photos` has 15 rows | `google-places-photo` | 🟡 Partial | Align with canonical `places` |
| Generic place reviews | Web has review display concepts | Mobile unknown | No admin control | `place_reviews` has 3 rows | Source sync functions | 🟡 Partial | Align with canonical `places` |
| Canonical places | Partial public usage | Shared schema exists; mobile still has legacy/source read paths | Places module/API exists | `places` + `place_sources` migrations exist | Source sync/import functions still separate | 🟡 Partial | Move web/mobile reads to canonical places and treat source tables as enrichment/import paths |
| Place admin management | N/A | N/A | Places manager, media/gallery, partner linking APIs exist | `places`, `place_sources`, `partner_places`, `partner_photo_submissions` | N/A | ✅ Current admin surface | Validate production data and wire mobile/web to this control plane |
| Duplicate merge/hide | No clear UX | No | Hide/archive/status controls exist at canonical place level | `places.status`, `places.is_active`, source links | N/A | 🟡 Partial | Add duplicate merge workflow and source conflict review |

---

## 4. Flights + Booking

| Feature | Web | Mobile | Admin | Supabase | Edge Functions | Status | Required Action |
|---|---|---|---|---|---|---|---|
| Flight search | Web direct search/chat support; live LiteAPI `/flights/rates` smoke passed | Mobile service helpers exist | Billing/service dashboard | `airports`, `cities`, `airlines` populated | `liteapi-proxy`, `airport-autocomplete` | ✅ Current | Run flight prebook/payment/provider booking lifecycle |
| Airport/catalog metadata | Web/mobile can use populated airport, city, and airline metadata | Mobile can use the same metadata for selectors/search | Admin service status | airports 9,030; cities 255; airlines 777 | Legacy import/sync jobs | ✅ Source metadata only | Keep for search UX; do not treat as flight booking provider |
| Historical non-LiteAPI flight compatibility | Deprecated; do not expand | Deprecated; active trip-flight offer storage now uses `provider_offer_id` | Historical support only | `trip_flights` has normalized provider-offer naming after the July 6 migration | Historical order/webhook functions | ⚠️ Deprecated | Keep UI/provider labels generic or LiteAPI-specific; delete old functions after LiteAPI lifecycle smoke passes |
| Hotel booking/order | Web has hotel surfaces; live LiteAPI `/hotels/rates` smoke passed | Mobile accommodation helpers include LiteAPI fields | Admin billing/services | `trip_accommodations` has 6; `bookings` has 0 | `hotels-proxy`, `hotel-order-management` | 🟡 Partial | Run hotel prebook/payment/provider booking lifecycle |
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
| Admin auth | N/A | N/A | Server-side admin auth exists | `admin_users` migration exists | N/A | ⚠️ Risk | Fail closed when admin allowlist is empty; keep service role server-only |
| CI/tests | N/A | N/A | CI/test suite added | N/A | N/A | ✅ Current | Keep all admin changes behind tests |
| User visibility | N/A | N/A | Users API/detail | `users`, trips, bookings, threads | N/A | ✅ Current | Add PII/audit guardrails |
| Billing/cost dashboard | N/A | N/A | Billing API uses canonical booking revenue plus AI/API cost views; Revenue Command Center separates captured and recognized booking revenue | `api_credit_status`, `ai_usage_log`, `api_usage_log`, `bookings` | N/A | 🟡 Partial | Consolidate AI/API cost sources and validate live booking revenue rows |
| Booking ops | N/A | N/A | Booking, Revenue, Travelers, Trips, Payments, Billing, and Support APIs read canonical `bookings`; Revenue/Travelers/Trips/Support surface enriched trip accommodation/flight recovery context | `bookings` has 0 | order functions | 🧪 Needs Test | Test actual booking lifecycle with live provider rows |
| Place management | N/A | N/A | Places module/API exists | `places`, `place_sources` | source functions | 🟡 Partial | Complete web/mobile migration to canonical places and add merge review |
| Partner management | N/A | N/A | Partners module/API exists | `partners`, `partner_places`, `partner_leads`, `partner_campaigns`, `partner_payouts` | N/A | 🟡 Partial | Validate data, add partner lifecycle QA, and connect mobile/web placements |
| Trip sharing/invite ops | N/A | N/A | Missing | share/invite tables empty | invite/share functions | 🔴 Gap | Add admin visibility after flow works |
| High-intent traveler queue | N/A | N/A | High-Intent module/API exists | data exists across users/trips/chats/bookings | N/A | 🟡 Partial | Add mobile/web traveler event instrumentation for stronger scoring |

---

## 7. Revenue + Monetization Foundation

| Feature | Web | Mobile | Admin | Supabase | Status | Required Action |
|---|---|---|---|---|---|
| AI/API cost tracking | Web/admin support | Mobile via functions | Billing API | `ai_usage_log`, `api_credit_status` | 🟡 Partial | Normalize event/cost source names |
| Booking revenue | Checkout exists | Stripe dependency/helpers | Revenue, Payments, and Billing use canonical booking reconciliation; Revenue shows captured payments, provider/payment/source/recovery breakdowns, and P0 booking issues | `bookings` 0, revenue views expected | 🧪 Needs Test | Run E2E payment and webhook test |
| Concierge product | Current web sales/order flow | Planned/undecided mobile placement | Concierge Orders module remains separate; Payments & Receipts is now canonical booking-sourced | `concierge_orders` | 🟡 Partial | Decide mobile entry points and support handoff |
| Partner subscriptions | Planned | N/A | Partners module foundation exists | `partners`, campaigns, payouts | 🟡 Partial | Add subscription/product rules after partner data QA |
| Sponsored placements | Content system supports future | Mobile content support | Deals & Placements controls exist | `deals`, `partners`, `places` | 🟡 Partial | Connect placements to canonical mobile/web feeds with clear sponsored labels |
| Tourism intelligence | Not yet | Not yet | Not yet | data scattered | ⏭ Later | Build after analytics/data model cleanup |

---

## 8. Cruise + Self-Guided Tours Readiness

| Feature | Web | Mobile | Admin | Supabase | Status | Required Action |
|---|---|---|---|---|---|
| Cruise traveler trip type | Not present | Not present | Not present | No cruise fields/table seen | 🔴 Gap | Add only after trips RLS + place foundation |
| Cruise day planner | Planned | Planned | Not present | No model | 🔴 Gap | Build after foundation sync |
| Self-guided tours | Guided-day public pages exist | Live Google Navigation/self-guided flow exists | Guided Day Plans module/API exists | `cruise_itineraries`, stops, route segments, sessions | 🟡 Partial | Real-device QA and ensure mobile consumes published admin records only |
| Tour purchase flow | Guided-day/concierge paths exist | Tour checkout exists | Payments/Concierge/Guided Day modules exist | `cruise_day_orders`, `concierge_orders`, `bookings` | 🟡 Partial | Decide canonical order model and reconciliation path |
| Port-safe recommendations | Cruise itinerary content exists | Guided-day live route logic exists | Guided Day Plans module controls buffers/stops | cruise itinerary tables | 🟡 Partial | Validate port return buffers, cruise schedules, and safety copy in admin |

---

## 9. Main Gaps to Resolve Before New Features

### Gate 1: Trips security foundation

This gate is no longer the primary blocker it was on June 20. Later June 21 reviews document live trips RLS behavior, share/invite behavior, web app-session trip-list behavior, and mobile simulator trip-list/invite-return behavior against the shared Supabase project.

Remaining:

- Run physical-device invite acceptance smoke during device QA.
- Keep web/mobile saved trip checks in release regression.
- Add admin visibility for share/invite operations after core launch gates are stable.

### Gap 2: Canonical place source exists, but app read paths are not fully migrated

Current place data is split across:

- Canonical `places` and `place_sources`
- Supabase cached provider-enrichment rows
- TripAdvisor locations
- legacy hotels/restaurants/activities
- generic photos/reviews
- Sanity content

Required:

- Treat `places` and `place_sources` as the managed source of truth
- Align `place_photos`, `place_reviews`, partner photos, and default media
- Build compatibility views
- Migrate app read paths gradually

### Gap 3: Admin control exists, but mobile/web do not fully consume it

Admin currently has Places, Partners, Deals, Guided Day, Bookings, Revenue, Concierge, Payments, Support, Admin Users, and Audit modules. The remaining gap is ensuring traveler-facing surfaces consume the same canonical records and statuses.

Required:

- Mobile Explore, stays, restaurants, activities, deals, and tours read canonical admin-managed records first
- Web public pages and authenticated dashboards use the same canonical IDs
- Add duplicate/merge and source conflict review
- Keep hide/archive, featured, sponsored, partner, and media states consistent across surfaces

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

1. Confirm canonical `places` and `place_sources` migrations are applied in production.
2. Backfill TripAdvisor rows.
3. Backfill cached provider-enrichment rows.
4. Deduplicate and map sources.
5. Confirm `v_places_hotels`, `v_places_restaurants`, `v_places_activities`.
6. Connect admin media, partner links, featured/sponsored flags, and source priority.

### Phase 3 — App read-path parity

1. Migrate web hotel/restaurant directories to canonical views.
2. Migrate mobile hotel/restaurant providers to canonical views.
3. Migrate chat tools from source inventory tables to canonical views.
4. Keep source tables for enrichment/sync.

### Phase 4 — Admin control

1. Harden admin auth fail-closed behavior.
2. Complete duplicate/merge review.
3. Validate partner/verified flags against live app rendering.
4. Add source conflict visibility.
5. Confirm audit logs for mutations and PII access.

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
2. `docs/APP_ADMIN_MANAGEMENT_CONTRACT.md` or equivalent owner matrix if the main UI plan becomes too large
3. `docs/ACTIVE_EDGE_FUNCTIONS_AUDIT.md`
4. `docs/PLACE_DATA_MIGRATION_PLAN.md`
5. `docs/FOUNDATION_TEST_PLAN.md`

Do not expand commerce surfaces until trips RLS, canonical place reads, booking reconciliation, and admin auth fail-closed behavior are verified.
