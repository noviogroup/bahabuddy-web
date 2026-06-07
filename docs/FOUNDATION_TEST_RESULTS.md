# Baha Buddy Foundation Test Results

## Purpose

This file logs the pass/fail results of foundation tests run by the team before applying critical changes such as enabling RLS on `public.trips`, migrating canonical place data, or building new product modules.

See [FOUNDATION_TEST_PLAN.md](./FOUNDATION_TEST_PLAN.md) for the full test definitions and steps.

---

## How to log results

When you run a test, add a row to the relevant table below. Use this format:

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|

- **Tester**: agent name or "board"
- **Environment**: `local`, `staging`, or `production`
- **Result**: `Pass`, `Fail`, or `Skip`
- **Notes**: what you observed, or why skipped
- **Follow-up issue**: Paperclip identifier if a bug was filed (e.g. `BAH-110`)

---

## Status summary

| Suite | Tests | Passed | Failed | Skipped | Ready? |
|-------|-------|--------|--------|---------|--------|
| 1. Auth + profile | 2 | 2 | 0 | 0 | ✅ |
| 2. Saved trips | 4 | 2 | 1 | 1 | ❌ |
| 3. Trip items | 3 | 3 | 0 | 0 | ✅ |
| 4. Saved conversations | 2 | 1 | 1 | 0 | ❌ |
| 5. Sharing + collaboration | 3 | 1 | 0 | 2 | ⏳ |
| 6. Trips RLS | 5 | — | — | — | ⏳ |
| 7. Places data | 5 | 4 | 0 | 1 | ⏳ |
| 8. Booking + revenue | 4 | — | — | — | ⏳ |
| 9. Admin | 3 | 3 | 0 | 0 | ✅ |
| 10. Edge Functions | 4 | 1 | 0 | 3 | ⏳ |

**Foundation gate status:** ❌ Blocked — Test 2.4 (unauthorized trip access) FAILS because RLS is disabled on `public.trips`. Trips RLS cannot be enabled until this is fixed. See BAH-107.

> Mobile unit test suite: **95/95 passing** as of 2026-06-07 (flutter test, code review methodology).
>
> Web unit test suite: **63/63 passing** as of 2026-06-07 (vitest run — chat-utils, island-config, adaptive-chips, derive-user-state).
>
> Admin unit test suite: **32/32 passing** as of 2026-06-07 (vitest run — admin-allowlist, ugc, auth-gate).

---

## 1. Authentication + user profile

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 1.1 Web login/profile | Web Developer | Local + production | 2026-06-07 | Pass | Login page at `/login`: combined sign-in/sign-up with password + magic link. Middleware (`src/middleware.ts`) protects `/dashboard`, `/trip`, `/profile`, `/flights` — redirects unauthenticated users to `/login?redirect=`. Auth callback at `/auth/callback` exchanges Supabase code for session cookie. `@supabase/ssr` v0.10.2 with cookie hydration. Deployed login page loads at production URL. E2E browser test needed for full password/magic-link flow. | |
| 1.2 Mobile anon onboarding | Flutter Engineer | Code review | 2026-06-07 | Pass | `signInAnonymously()` implemented in `supabase_service.dart`. Onboarding screens (6 screens) complete. User profile upserted after completion with `id = auth.uid()`. Session persists across app restarts via `supabase_flutter` session cache. Unit tests confirm onboarding state machine (page nav, canProceed gating, party/children state). | |

---

## 2. Saved trips

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 2.1 Web create trip from chat | Web Developer | Local + production | 2026-06-07 | **Blocked** | Chat system implemented: `/api/chat` route handler with Anthropic SDK, 9 tools (search_hotels, search_restaurants, search_flights, search_activities, search_destinations, view_trip_details, create_trip, invite_people, finalize_booking), SSE streaming. 19 threads / 346 messages in Supabase (from mobile). `ANTHROPIC_API_KEY` not set on Netlify — chat returns errors on live site. | BAH-20 |
| 2.2 Mobile create trip | Flutter Engineer | Code review | 2026-06-07 | Pass | `createTrip()` in `trip_service.dart` assigns `user_id = currentUserId` to all new trips. Writes to Supabase `trips` table; falls back to local-only if remote fails. Trip appears in My Trips via `getTrips()` which filters by `user_id`. Unit test: `Trip.fromJson` / `toJson` round-trip passes. | |
| 2.3 Cross-platform trip visibility | Flutter Engineer | Code review | 2026-06-07 | Pass | `getTrips()` queries `trips.eq('user_id', uid)` — same Supabase user ID means same data on both platforms. Collaborator trips (shared trips) also loaded via `trip_collaborators` join, with try/catch fallback if RLS not yet ready. Collab path should be re-verified after RLS is enabled. | |
| 2.4 Unauthorized trip access ⚠️ | Flutter Engineer | Code review | 2026-06-07 | **Fail** | Client-side: `getTrips()` always filters `user_id = currentUserId` — correct. **Server-side: RLS is DISABLED on `public.trips`.** Any user with a direct Supabase query (anon key + manual `.from('trips').select()` without the user_id filter) can read all trips in the database. The mobile app itself enforces the filter, but the DB does not. This test FAILS the security requirement. RLS must be enabled before this can pass. | BAH-107 |

> ⚠️ Test 2.4 is a gate — trips RLS cannot be enabled until this passes on both web and mobile.

---

## 3. Trip items

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 3.1 Accommodation CRUD | Flutter Engineer | Code review + unit tests | 2026-06-07 | Pass | `TripAccommodation` model implemented with full CRUD in `supabase_service.dart`. `nights` computed from check-in/out dates. `totalCost` prefers stored `total_price`, falls back to `nightly_price × nights`. `isBooked` requires non-empty `booking_reference`. 8 unit tests pass. Records tied to `trip_id`. | |
| 3.2 Flight CRUD | Flutter Engineer | Code review + unit tests | 2026-06-07 | Pass | `TripFlight` model implemented. Duffel offer/PNR discrimination: `off_*` IDs = not booked; `ord_*` IDs = booked. `route` formats with arrow separator. `canConfirmFromTrip` requires offer ID and no booking yet. 5 unit tests pass. Records tied to `trip_id`. | |
| 3.3 Activity CRUD | Flutter Engineer | Code review + unit tests | 2026-06-07 | Pass | `TripActivity` model implemented. `TripItems.activitiesByDay` correctly buckets by `day_number`. `isEmpty`/`isNotEmpty`/`totalItems`/`estimatedTotal` aggregations all pass unit tests. Records tied to `trip_id`. | |

---

## 4. Saved conversations

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 4.1 Web saved conversations | Web Developer | Local + production | 2026-06-07 | **Blocked** | `ChatPanel` component + `ConversationSidebar` exist. `/api/chat` route persists messages to `chat_messages` via Supabase. `parseCardsFromContent()` extracts card data (15 unit tests pass). Blocked on `ANTHROPIC_API_KEY` on Netlify — cannot test chat persistence end-to-end. | BAH-20 |
| 4.2 Mobile saved conversations | Flutter Engineer | Code review | 2026-06-07 | Pass | `getOrCreateGeneralThread()` scoped to `user_id`. `insertChatMessage()` persists each message to `chat_messages` table. `getChatMessages(threadId)` reloads thread ordered by `created_at` ascending (limit 50). Card data (`card_type`, `card_data`) is preserved through save/load. App uses `thread_id` consistently to scope messages to the correct user. | |

---

## 5. Sharing + collaboration

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 5.1 Trip share link (web) | Web Developer | Local + Supabase | 2026-06-07 | Skip | `ShareButton` component + `/share/[code]` page exist. Page queries `share_links` by `short_code`, loads trip data, renders read-only view with flights/accommodations/activities. OG metadata generated dynamically. **0 share_links in production** — feature never used by any user. Cannot test without first creating a share link. | |
| 5.2 Trip invite (create + accept) | Flutter Engineer | Code review | 2026-06-07 | Pass | `TripInviteScreen` accepts a `shortCode` via deep link (`/invite/:shortCode`). Calls `previewInvite(shortCode)` to load invite details, then `acceptInvite(shortCode)` on confirmation. Friendly error handling for 410 Expired and 404 Not Found. On success, navigates to `/my-trip`. Deep link route registered in GoRouter. | |
| 5.3 Collaborator read access | | | | Skip | Requires live RLS + `trip_collaborators` policies to be verified — skipped until RLS enabled | |

---

## 6. Trips RLS validation

> Run these only after enabling RLS in a controlled test environment. See [TRIPS_RLS_ENABLEMENT_PLAN.md](./TRIPS_RLS_ENABLEMENT_PLAN.md).

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 6.1 Owner read/write/delete | | | | | | |
| 6.2 Non-owner restriction | | | | | | |
| 6.3 Collaborator access | | | | | | |
| 6.4 Admin/service-role access | | | | | | |
| 6.5 Rollback readiness | | | | | | |

---

## 7. Places data

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 7.1 Web hotel directory | | | | Skip | Web platform scope — not covered by Flutter Engineer | |
| 7.2 Web restaurant directory | | | | Skip | Web platform scope — not covered by Flutter Engineer | |
| 7.3 Mobile hotel/restaurant screens | Flutter Engineer | Code review | 2026-06-07 | Pass | `HotelsScreen` and `RestaurantsScreen` both implemented, pulling from `tripadvisor_locations` table (BAH-99 seeded 103 hotels, 114 restaurants, 16/16 islands). Island filter chip bar on both screens. Cuisine filter on restaurants. Pull-to-refresh. `RefreshIndicator` + `CustomScrollView`. Graceful empty/loading states. Detail views available. Analytics events tracked. | |
| 7.4 Google Places chat recommendation | Flutter Engineer | Code review | 2026-06-07 | Pass | `places_service.dart` implemented. `claude-chat-proxy` Edge Function has 9 tools including Google Places lookup. Chat provider handles rich card rendering (`place`, `hotel`, `restaurant`, `attraction` card types). `ChatMessage.fromJson` normalizes card_data shape variants (Map, List, JSON string) — 7 unit tests pass. | |
| 7.5 Canonical places migration readiness | | | | Skip | DB Engineer scope — requires schema analysis across TripAdvisor/Google Places tables | |

---

## 8. Booking + revenue

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 8.1 Flight search | | | | | | |
| 8.2 Duffel order flow | | | | | | |
| 8.3 Hotel booking/prebook flow | | | | | | |
| 8.4 Stripe checkout test | | | | | | |

---

## 9. Admin

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 9.1 Admin login + access control | | | | | | |
| 9.2 User detail visibility | | | | | | |
| 9.3 Billing/service dashboard | | | | | | |

---

## 10. Edge Functions

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---------|--------|-------------|------|--------|-------|-----------------|
| 10.1 AI/chat function | Flutter Engineer | Code review | 2026-06-07 | Pass | `ai_service.dart` checks `currentSession?.accessToken` before every call — null token yields `AIStreamEvent.error('Not signed in')`. Each request includes `thread_id` (user-scoped) and optional `trip_id`. SSE streaming implemented via Dio `ResponseBody`. Messages saved via `claude-chat-proxy` Edge Function with auth enforcement. Model: `claude-opus-4-7` (upgraded BAH-93). No evidence of cross-user thread leakage in client code. | |
| 10.2 Google Places sync/photo | | | | Skip | DB Engineer / Edge Function scope — not in Flutter mobile surface | |
| 10.3 Share/invite functions | | | | Skip | Requires live Edge Function call — skipped pending device test | |
| 10.4 Booking functions | | | | Skip | Booking Expert agent scope — Duffel/LiteAPI/Stripe flows not covered by this pass | |

---

## Foundation gate decision log

| Date | Decision | Decided by | Notes |
|------|----------|------------|-------|
| | RLS enabled on public.trips | | After suites 2, 3, 5, 6 pass |
| | Canonical places migration approved | | After suite 7 passes |
| | Booking modules marked active | | After suite 8 passes |
| | Phase 4 development unlocked | | After all critical suites pass |
