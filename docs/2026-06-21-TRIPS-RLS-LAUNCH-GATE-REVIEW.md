# Trips RLS Launch Gate Review - June 21, 2026

Review time: June 21, 2026, 07:47 EDT
Scope: web Supabase migration set and launch-readiness blocker for `public.trips`

## Executive Status

The web migration set now contains an explicit `public.trips` RLS launch gate, and the gate has been applied to the shared Supabase project.

This closes a source-control gap: mobile already had a migration that re-enabled `public.trips` RLS, but the active web migration set did not. The new web migration enables RLS, keeps `FORCE RLS` disabled until the controlled validation window, grants recursion-safe helper execution to app roles, and fails loudly if expected policies or helper functions are missing.

Live Supabase validation on project `cxcfymhoncysyloutvkh` now confirms the table-level RLS gate is active: `public.trips` and `public.trip_collaborators` have RLS enabled, `public.trips` does not force RLS yet, the expected policies exist, and the helper functions are `SECURITY DEFINER`.

The first live apply attempt exposed a PostgreSQL identifier detail: long policy names are stored in `pg_policies.policyname` as truncated identifiers. The source migration now validates policy table/name pairs and accepts both the source name and the 63-byte stored identifier form.

## Files Added

- `supabase/migrations/20260621120000_trips_rls_launch_gate.sql`
- `tests/unit/trips-rls-launch-gate.test.ts`

## Local Validation

Completed on June 21, 2026:

- `npm test -- tests/unit/trips-rls-launch-gate.test.ts` passed with 4 tests.
- `npm run lint` passed with the existing image-optimization warnings.
- `npm test` passed with 79 test files and 321 tests.
- `npm run build` passed with existing image-optimization, Sanity API-version, and localstorage-file warnings.
- `curl -I http://localhost:3011/` returned `200 OK` after restarting the dev server following the production build.

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

## Remaining Behavioral Validation

The catalog state is now proven. The remaining launch checks are behavioral:

- owner can create, read, update, and delete their trips
- non-owner cannot read a trip by direct ID
- accepted collaborator can read shared trip
- editor collaborator can write supported child trip items
- admin/service-role routes still work
- share and invite flows still resolve
- web and mobile trip lists still load for the same account

## Decision

The table-level trips RLS launch gate is now applied and live-verified. Do not mark the broader trips/security launch gate complete until owner, non-owner, collaborator, service-role, share/invite, and web/mobile trip-list behavior is exercised with real sessions.
