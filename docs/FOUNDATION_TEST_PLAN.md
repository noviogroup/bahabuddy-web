# Baha Buddy Foundation Test Plan

## Purpose

This test plan defines the minimum validation required before Baha Buddy proceeds with foundation changes such as enabling RLS on `public.trips`, introducing the canonical places layer, migrating app read paths, or building new modules like Cruise Day Planner and Self-Guided Tours.

The goal is to prove that Web, Mobile, Admin, Supabase, and Edge Functions are aligned before new feature development continues.

---

## Test environments

Run these tests in this order:

1. Local development where possible.
2. Staging or Supabase branch if available.
3. Production only after pre-checks pass.

Do not enable trip RLS or migrate place read paths directly in production without a controlled test window and rollback plan.

---

## Test user setup

Create or identify these test users:

| User | Purpose |
|---|---|
| User A | Trip owner |
| User B | Non-owner / unauthorized user |
| User C | Invited collaborator |
| Admin User | Admin dashboard tester |
| Anonymous User | Mobile/web anonymous onboarding tester |

Recommended test data:

- One stayover trip created by User A.
- One AI-generated trip created through chat by User A.
- One shared trip from User A to User C.
- At least one accommodation attached to User A's trip.
- At least one flight attached to User A's trip.
- At least one activity attached to User A's trip.
- One hotel and one restaurant visible from TripAdvisor data.
- One place visible from Google Places data.

---

# 1. Authentication + user profile tests

## 1.1 Web login/profile

Steps:

1. Log in as User A on web.
2. Open dashboard.
3. Open profile page.
4. Confirm profile data loads.
5. Update a non-sensitive profile field if supported.
6. Refresh and confirm persistence.

Expected result:

- User A can see only their own profile.
- Profile changes persist.
- No console/API errors.

## 1.2 Mobile anonymous onboarding

Steps:

1. Fresh install or clear app state.
2. Complete onboarding as anonymous user.
3. Confirm Supabase auth session exists.
4. Confirm public user profile row is created/updated.
5. Restart app and confirm user persists.

Expected result:

- Anonymous sign-in works.
- User profile is upserted with `id = auth.uid()`.
- App does not create orphan profile rows.

---

# 2. Saved trips tests

## 2.1 Web create trip from chat

Steps:

1. Log in as User A on web.
2. Start or open Buddy chat.
3. Ask Buddy to plan a 3-day Bahamas trip.
4. Trigger trip summary/save flow.
5. Go to saved trips/dashboard.
6. Open the trip detail page.

Expected result:

- Trip is created with `user_id = User A`.
- Trip appears in User A's saved trips.
- Trip detail page loads.
- Trip has expected islands, dates/status if provided.

## 2.2 Mobile create trip

Steps:

1. Log in or onboard as User A on mobile.
2. Create or save a trip.
3. Navigate to My Trips.
4. Open the trip detail screen.

Expected result:

- Trip is created with `user_id = User A`.
- Trip appears in mobile My Trips.
- Same trip appears on web for User A.

## 2.3 Cross-platform trip visibility

Steps:

1. Create a trip on web as User A.
2. Open mobile as User A.
3. Confirm the trip appears.
4. Create a trip on mobile as User A.
5. Open web as User A.
6. Confirm the trip appears.

Expected result:

- Web and mobile show the same trips for the same authenticated user.

## 2.4 Unauthorized trip access

Steps:

1. Log in as User A and copy a trip detail URL or trip ID.
2. Log out.
3. Log in as User B.
4. Attempt to open User A's trip detail URL.

Expected result:

- User B cannot view or modify User A's trip.
- Web should redirect, show not found, or show access denied.
- API should not return User A's trip data.

This test is required before and after enabling RLS on `public.trips`.

---

# 3. Trip item tests

## 3.1 Accommodation CRUD

Steps:

1. As User A, open a saved trip.
2. Add an accommodation/hotel to the trip.
3. Refresh.
4. Confirm the accommodation remains.
5. Update status or booking reference if supported.
6. Delete the accommodation if supported.

Expected result:

- Accommodation is tied to the correct `trip_id`.
- Owner can read/write/delete.
- Non-owner cannot access it.

## 3.2 Flight CRUD

Steps:

1. As User A, open a saved trip.
2. Add a flight to the trip.
3. Refresh.
4. Confirm the flight remains.
5. Update booking reference if supported.
6. Delete if supported.

Expected result:

- Flight is tied to the correct `trip_id`.
- Owner can read/write/delete.
- Non-owner cannot access it.

## 3.3 Activity CRUD

Steps:

1. As User A, open a saved trip.
2. Add an itinerary activity.
3. Refresh.
4. Confirm the activity remains.
5. Reorder/update if supported.
6. Delete if supported.

Expected result:

- Activity is tied to the correct `trip_id`.
- Owner can read/write/delete.
- `trip_activities` begins showing real usage after tests.

---

# 4. Saved conversations tests

## 4.1 Web chat persistence

Steps:

1. Log in as User A on web.
2. Start a Buddy chat.
3. Send at least two messages.
4. Refresh the page.
5. Reopen the chat/thread.

Expected result:

- Chat thread remains.
- User and assistant messages reload.
- Rich cards render correctly.

## 4.2 Mobile chat persistence

Steps:

1. Log in as User A on mobile.
2. Start a Buddy chat.
3. Send at least two messages.
4. Close/reopen app.
5. Reopen chat.

Expected result:

- Chat thread remains.
- Messages reload in the correct order.
- Card data does not crash the UI.

## 4.3 Cross-platform chat consistency

Steps:

1. Start a general chat on mobile.
2. Confirm it appears or can be continued on web if product requires shared chat continuity.
3. Start a trip-attached chat on web.
4. Confirm mobile can access the same trip context if product requires this.

Expected result:

- Product decision is clear: either shared cross-platform chat is supported, or each platform has separate chat UX.
- No orphan or duplicated general threads are created unnecessarily.

---

# 5. Trip sharing + collaboration tests

## 5.1 Create share link

Steps:

1. As User A, open a saved trip.
2. Create a share link.
3. Confirm a share URL/code is generated.
4. Open the share URL in a logged-out browser/session.

Expected result:

- Share link resolves to a read-only trip snapshot.
- It does not expose private user data beyond intended trip details.
- `share_links` row is created.

## 5.2 Invite collaborator

Steps:

1. As User A, invite User C to a trip by email.
2. Open invite as User C.
3. Preview invitation.
4. Accept invitation.
5. Open shared trip as User C.

Expected result:

- `trip_invitations` row is created.
- `trip_collaborators` row is created after acceptance.
- User C can read the shared trip.
- User C can edit only if assigned editor role.

## 5.3 Collaborator realtime updates

Steps:

1. User A and User C open the same trip on separate devices.
2. User A adds an activity/accommodation/flight.
3. User C waits for realtime update or refresh.

Expected result:

- Realtime update fires if enabled.
- If realtime is not enabled, refresh still shows latest data.

---

# 6. RLS enablement validation

Run these tests before and after enabling RLS on `public.trips`.

## 6.1 Owner access

Expected:

- Trip owner can select, insert, update, and delete own trips where supported.

## 6.2 Non-owner restriction

Expected:

- Non-owner cannot select, update, or delete another user's trips.

## 6.3 Collaborator access

Expected:

- Accepted collaborator can read shared trips.
- Editor collaborator can modify trip item tables if policies allow.
- Viewer collaborator cannot edit if role separation is enforced.

## 6.4 Admin/service-role access

Expected:

- Admin APIs using service role can still access trips for operational views.
- Client-side admin code does not rely on unrestricted anon access.

## 6.5 Rollback readiness

Expected:

- Team has rollback command and knows when to use it.
- Rollback is only for emergency restoration.

---

# 7. Places data tests

## 7.1 Web hotel directory

Steps:

1. Open web `/hotels`.
2. Filter/search if supported.
3. Open a hotel detail page.

Expected result:

- Hotels load.
- Images, rating, reviews, island, and TripAdvisor link display correctly.
- No missing key fields.

## 7.2 Web restaurant directory

Steps:

1. Open web `/restaurants`.
2. Filter/search if supported.
3. Open a restaurant detail page.

Expected result:

- Restaurants load.
- Images, rating, reviews, cuisine/island, and TripAdvisor link display correctly.

## 7.3 Mobile hotel/restaurant screens

Steps:

1. Open mobile Explore or TripAdvisor hotel screen.
2. Load hotels.
3. Load restaurants.
4. Open detail views if supported.

Expected result:

- Same source data appears as web or intentional differences are documented.
- Mobile handles empty photos/ratings gracefully.

## 7.4 Google Places chat recommendation

Steps:

1. Ask Buddy for hotels, restaurants, or attractions.
2. Confirm recommendation cards display.
3. Compare whether the recommended places match known Google/TripAdvisor data.

Expected result:

- Chat recommendations work.
- Source is known and documented.
- No duplicate/conflicting place identity is shown to users.

## 7.5 Canonical places migration readiness

Before moving reads to canonical place views, verify:

- TripAdvisor rows can be mapped to canonical places.
- Google Places rows can be mapped to canonical places.
- Duplicate candidates are identified.
- Existing `place_photos` and `place_reviews` can be preserved or remapped.

---

# 8. Booking and revenue tests

## 8.1 Flight search

Steps:

1. Search for a flight.
2. Select a flight offer.
3. Add to trip if supported.

Expected result:

- Flight search returns valid offers.
- Selected offer can be saved to `trip_flights`.

## 8.2 Duffel order flow

Steps:

1. Proceed through a test booking flow.
2. Confirm Duffel order creation or sandbox equivalent.
3. Confirm booking reference is saved.
4. Confirm `bookings` row is created if intended.

Expected result:

- Order lifecycle is traceable.
- Admin can see booking or booking-related status.

## 8.3 Hotel booking/prebook flow

Steps:

1. Search/select hotel.
2. Save accommodation to trip.
3. Run prebook or checkout flow if available.
4. Confirm status and references update.

Expected result:

- Accommodation is saved.
- LiteAPI/prebook/order data is persisted.
- User sees correct status.

## 8.4 Stripe checkout test

Steps:

1. Use Stripe test mode.
2. Purchase a supported product/booking if available.
3. Confirm webhook/order handling.
4. Confirm revenue dashboard reflects transaction.

Expected result:

- Payment succeeds in test mode.
- Booking/order row is created or updated.
- Admin billing reflects transaction.

---

# 9. Admin tests

## 9.1 Admin login

Steps:

1. Log in as Admin User.
2. Open admin dashboard.
3. Confirm access is granted.
4. Log in as non-admin user and confirm access is denied.

Expected result:

- Admin access is server-enforced.
- Non-admin cannot reach protected API responses.

## 9.2 User detail visibility

Steps:

1. Open a user detail page.
2. Confirm user profile, trips, bookings, chat threads, and usage data load.

Expected result:

- Admin can see required operational data.
- Sensitive user detail access is logged or scheduled for audit logging.

## 9.3 Billing/service dashboard

Steps:

1. Open billing/services dashboard.
2. Confirm API credits, AI usage, and costs load.
3. Confirm empty booking/revenue states are handled.

Expected result:

- Dashboard loads without crashing.
- Empty states are clear.
- Cost data aligns with `ai_usage_log` and `api_credit_status`.

---

# 10. Edge Function tests

## 10.1 AI/chat function

Test:

- `claude-chat-proxy` or current active chat function responds correctly.
- Auth is enforced where required.
- Messages are saved correctly.
- Trip context does not leak across users.

## 10.2 Google Places sync/photo functions

Test:

- Sync function runs without errors.
- Photo function returns usable image references.
- Disabled/inactive places are not shown publicly.

## 10.3 Share/invite functions

Test:

- Create share link.
- Resolve share link.
- Send trip invite.
- Accept invite.

## 10.4 Booking functions

Test:

- Flight proxy.
- Duffel create order.
- Duffel order management.
- Duffel webhook.
- Hotels proxy.
- Hotel order management.
- Restaurant order management if still active.

Expected result:

- Active functions are identified.
- Legacy functions are documented.
- No function silently fails in production logs.

---

# 11. Pass/fail criteria

Foundation is considered ready when:

- Web and mobile show the same saved trips for the same user.
- Web and mobile saved conversations work or product-specific differences are documented.
- Non-owner trip access is blocked.
- `public.trips` RLS can be enabled without breaking core flows.
- Trip sharing and invite flows work end-to-end or are explicitly paused.
- Hotel and restaurant data works on both web and mobile.
- Google Places and TripAdvisor usage are documented clearly.
- Admin can view core users/trips/bookings/usage.
- Booking flows either work or are marked inactive until completed.
- The team has a clear canonical places migration path.

---

# 12. Recommended execution order

1. Run authentication/profile tests.
2. Run saved trip tests.
3. Run saved conversation tests.
4. Run unauthorized access tests.
5. Run sharing/collaboration tests.
6. Enable `public.trips` RLS in a controlled test environment.
7. Re-run saved trip and unauthorized access tests.
8. Run places data tests.
9. Run booking tests.
10. Run admin tests.
11. Run Edge Function tests.
12. Approve the next foundation migration.

---

# 13. Test result log template

Use this format when running tests:

| Test ID | Tester | Environment | Date | Result | Notes | Follow-up issue |
|---|---|---|---|---|---|---|
| 2.1 Web create trip from chat | | | | Pass/Fail | | |
| 2.2 Mobile create trip | | | | Pass/Fail | | |
| 2.4 Unauthorized trip access | | | | Pass/Fail | | |
| 5.2 Invite collaborator | | | | Pass/Fail | | |
| 7.1 Web hotel directory | | | | Pass/Fail | | |
| 8.4 Stripe checkout test | | | | Pass/Fail | | |
