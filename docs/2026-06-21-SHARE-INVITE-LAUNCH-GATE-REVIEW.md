# Share And Invite Launch Gate Review - June 21, 2026

Review time: June 21, 2026, 10:44 EDT
Scope: public trip share links, sanitized shared-trip resolution, collaborative invite acceptance, and web route compatibility

## Executive Status

The share/invite launch gate is now live-verified against the shared Supabase project `cxcfymhoncysyloutvkh`.

The validation pass found and fixed a real issue: `resolve-share-link` returned stays and flights but silently dropped trip activities because the function selected newer activity columns that are not guaranteed in the deployed schema and did not check the query error. The function now selects stable activity columns and returns a server error if any itinerary item query fails instead of sending an incomplete shared-trip snapshot.

The web middleware now preserves compatibility with mobile-generated share URLs. Legacy/public share links in the form `/trip/<short-code>` redirect to `/share/<short-code>`, while UUID-backed `/trip/<tripId>` app routes remain authenticated.

## Changes

### Web

- Added `getPublicShareCodeFromTripPath()` in `src/middleware.ts`.
- Redirects non-UUID `/trip/<code>` paths to `/share/<code>` before the auth gate.
- Keeps UUID trip detail routes protected.
- Added `scripts/verify-share-invite-remote.mjs`.
- Added `npm run verify:share-invite-remote`.
- Added unit coverage for middleware share-code handling and the no-email remote verifier.

### Supabase Edge Function

- Updated `Baha-Buddy-V2/supabase/functions/resolve-share-link/index.ts`.
- Deployed `resolve-share-link` to project `cxcfymhoncysyloutvkh`.
- Activity snapshot now uses stable columns:
  - `day_number`
  - `time_slot`
  - `activity_name`
  - `activity_type`
  - `place_id`
  - `notes`
  - `sort_order`
- The function now fails loudly on accommodation, flight, or activity lookup errors.

## Live Verification

`npm run verify:share-invite-remote` passed against production Supabase.

The verifier:

- creates temporary `bb-share-*@example.invalid` auth users and matching `public.users` profiles
- creates a temporary trip through an authenticated owner anon-key session
- adds stay, flight, and activity trip items with private booking references using the service role
- calls `create-share-link` as the owner
- calls public `resolve-share-link`
- confirms the public payload includes trip, stay, flight, and activity data
- confirms the public payload does not leak:
  - owner email
  - `user_id`
  - `booking_reference`
  - inserted private hotel reference
  - inserted private flight reference
  - payment/customer identifiers
- inserts a pending `trip_invitations` row directly with the service role, avoiding `send-trip-invite` and therefore avoiding email delivery
- calls `accept-invite` preview as the invitee
- calls `accept-invite` accept as the invitee
- verifies:
  - accepted `trip_collaborators` row
  - invitation `status = accepted`
  - invitation `invitee_user_id`
  - invitation `accepted_at`
  - trip `collaborator_ids` includes invitee
- cleans up temporary trips, share links, invitations, public users, and auth users

Local route compatibility also passed:

```text
curl -I http://localhost:3011/trip/share123
HTTP/1.1 307 Temporary Redirect
location: /share/share123
```

## Validation Commands

Completed on June 21, 2026:

- `node --check scripts/verify-share-invite-remote.mjs`
- `npm test -- --run tests/unit/middleware-auth.test.ts tests/unit/share-invite-remote-verifier.test.ts`
- `npm run verify:share-invite-remote`
- `curl -I http://localhost:3011/trip/share123`
- `npm run lint`
- `npm test` passed with 81 files and 329 tests
- `npm run build`
- `curl -I http://localhost:3011/`

Known warnings remain unchanged:

- existing `<img>` optimization warnings in archived/profile source and `src/app/share/[code]/page.tsx`
- existing Sanity API-version warning during production build
- existing `--localstorage-file` warning during tests/build

## Remaining Trips Launch Gate

The trips RLS and sharing gates are now proven at the database, Edge Function, and route compatibility level.

Remaining trips/security validation:

- web trip-list loading through an actual authenticated browser session
- mobile trip-list loading through the simulator/device with the same shared backend
- collaborator-owned trip visibility through real app surfaces, not only direct Supabase verifier scripts

## Decision

The share/invite launch gate is passed. Do not describe the full trips/security launch gate as complete until web/mobile app-surface trip-list validation is also complete.
