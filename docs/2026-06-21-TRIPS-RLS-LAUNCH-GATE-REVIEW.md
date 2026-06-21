# Trips RLS Launch Gate Review - June 21, 2026

Review time: June 21, 2026, 07:47 EDT
Updated: June 21, 2026, 11:10 EDT
Scope: web Supabase migration set and launch-readiness blocker for `public.trips`

## Executive Status

The web migration set now contains an explicit `public.trips` RLS launch gate, and the gate has been applied to the shared Supabase project.

This closes a source-control gap: mobile already had a migration that re-enabled `public.trips` RLS, but the active web migration set did not. The new web migration enables RLS, keeps `FORCE RLS` disabled until the controlled validation window, grants recursion-safe helper execution to app roles, and fails loudly if expected policies or helper functions are missing.

Live Supabase validation on project `cxcfymhoncysyloutvkh` now confirms the table-level RLS gate is active: `public.trips` and `public.trip_collaborators` have RLS enabled, `public.trips` does not force RLS yet, the expected policies exist, and the helper functions are `SECURITY DEFINER`.

The core live behavior is now also verified with temporary authenticated users: owner create/read/update/delete, non-owner direct-ID read/update denial, accepted collaborator read, editor collaborator child-item write, and service-role read for admin/support paths all pass against the linked Supabase project.

Share and invite behavior is now also live-verified. `npm run verify:share-invite-remote` proves owner share-link creation, public sanitized share resolution, no-email invitation setup, invite preview, invite acceptance, accepted collaborator reconciliation, invitation accepted state, and `trips.collaborator_ids` synchronization. The verification caught and fixed a deployed `resolve-share-link` issue where activity rows were silently dropped by a schema-drifted select list.

Web app-session trip-list behavior is now live-verified through the actual local web app and production Supabase data. `npm run verify:web-trip-list-session` creates temporary authenticated users, owned/shared/hidden trips, accepted collaborator state, signs in through `/login`, opens `/trip`, and proves the rendered page shows owned and accepted shared trips while hiding unrelated trips.

The first live apply attempt exposed a PostgreSQL identifier detail: long policy names are stored in `pg_policies.policyname` as truncated identifiers. The source migration now validates policy table/name pairs and accepts both the source name and the 63-byte stored identifier form.

## Files Added

- `supabase/migrations/20260621120000_trips_rls_launch_gate.sql`
- `scripts/verify-trips-rls-remote.mjs`
- `scripts/verify-share-invite-remote.mjs`
- `tests/unit/trips-rls-launch-gate.test.ts`
- `tests/unit/trips-rls-remote-verifier.test.ts`
- `tests/unit/share-invite-remote-verifier.test.ts`
- `src/lib/trips/visible-trips.ts`
- `scripts/verify-web-trip-list-session.mjs`
- `tests/unit/visible-trips.test.ts`
- `tests/unit/web-trip-list-session-verifier.test.ts`

## Local Validation

Completed on June 21, 2026:

- `npm test -- tests/unit/trips-rls-launch-gate.test.ts` passed with 4 tests.
- `node --check scripts/verify-trips-rls-remote.mjs` passed.
- `npm test -- tests/unit/trips-rls-remote-verifier.test.ts tests/unit/trips-rls-launch-gate.test.ts` passed with 7 tests.
- `npm test -- --run tests/unit/middleware-auth.test.ts tests/unit/share-invite-remote-verifier.test.ts` passed with 8 tests.
- `npm run lint` passed with the existing image-optimization warnings.
- `npm test` passed with 83 test files and 337 tests.
- `npm run build` passed with existing image-optimization, Sanity API-version, and localstorage-file warnings.
- `npm run verify:web-trip-list-session` passed against local web on `http://localhost:3011` and the linked Supabase project.
- `curl -I http://localhost:3011/` returned `200 OK` after restarting the dev server following the production build.
- `curl -I http://localhost:3011/trip/share123` returned `307 Temporary Redirect` to `/share/share123`.

## Migration Contract

The migration:

- enables RLS on `public.trips`
- enables RLS on `public.trip_collaborators`
- keeps `NO FORCE ROW LEVEL SECURITY` on `public.trips`
- grants `is_trip_owner(uuid)`, `is_trip_collaborator(uuid)`, and `is_trip_editor(uuid)` to `anon` and `authenticated`
- verifies `relrowsecurity = true`
- verifies `relforcerowsecurity = false`
- verifies required trip and collaborator policies exist
- tolerates PostgreSQL's 63-byte truncation of long policy identifiers while still checking the expected table
- verifies trip helper functions are `SECURITY DEFINER`

## Live Validation

Applied to Supabase on June 21, 2026:

- Project: `cxcfymhoncysyloutvkh`
- Recorded migration: `20260621114605 trips_rls_launch_gate`
- `public.trips.relrowsecurity = true`
- `public.trips.relforcerowsecurity = false`
- `public.trip_collaborators.relrowsecurity = true`
- `is_trip_owner(uuid)`, `is_trip_collaborator(uuid)`, and `is_trip_editor(uuid)` are `SECURITY DEFINER`
- Required owner/collaborator policies are present. The collaborator read policy is stored by PostgreSQL as the truncated identifier `Users can read collaborators for own trips or where they are co`.

## Live Behavioral Validation

Completed with `npm run verify:trips-rls-remote` on June 21, 2026:

- owner can create, read, update, and delete their trips
- non-owner cannot read a trip by direct ID
- accepted collaborator can read shared trip
- editor collaborator can write supported child trip items
- admin/service-role routes still work

The verifier creates temporary `bb-rls-*@example.invalid` auth users and matching `public.users` profiles, performs the checks through anon-key authenticated sessions, and cleans up temporary trip/user rows and auth users after the run.

Completed with `npm run verify:share-invite-remote` on June 21, 2026:

- owner can create a tracked share link through `create-share-link`
- public users can resolve the shared trip through `resolve-share-link`
- public share payload includes trip, stay, flight, and activity data
- public share payload does not leak owner email, `user_id`, booking references, or payment/customer identifiers
- verifier creates a pending invitation directly with the service role and does not call `send-trip-invite`
- invitee can preview and accept through `accept-invite`
- accepted collaborator row is created
- invitation status, `invitee_user_id`, and `accepted_at` reconcile
- trip `collaborator_ids` includes the invitee

The pass required redeploying `resolve-share-link` after fixing activity snapshot schema drift. The deployed function now selects stable activity columns and returns explicit errors for itinerary item lookup failures instead of returning incomplete arrays.

Completed with `npm run verify:web-trip-list-session` on June 21, 2026:

- temporary owner and traveler users were created with completed profiles
- traveler-owned, owner-shared, and owner-hidden trips were created
- accepted collaborator state was inserted for the shared trip
- traveler RLS client could read both the shared trip and accepted collaborator row
- browser signed in through `/login?redirect=%2Ftrip`
- rendered `/trip` showed the traveler-owned trip
- rendered `/trip` showed the accepted shared trip
- rendered `/trip` did not show the unrelated owner trip
- rendered trip count showed owned plus shared trips

The verifier found and fixed two verifier-side issues while being built: unconfigured `example.invalid` image host test data and a strict Playwright `main` locator conflict caused by nested dashboard/page mains.

## Remaining App-Level Validation

The catalog state, core RLS behavior, share/invite behavior, and web trip-list app-session behavior are now proven. The remaining trips/security checks are mobile app-level flows:

- owned trip list loading in the mobile app
- accepted collaborator trip visibility in the mobile app
- unrelated trip non-visibility in the mobile app
- invite acceptance returning to the correct mobile trip surface

## Decision

The table-level trips RLS launch gate, core owner/collaborator behavior, share/invite behavior, and web trip-list app-session behavior are now live-verified. Do not mark the broader trips/security launch gate complete until mobile trip-list behavior is exercised through the actual app surface.
