# Trips RLS Launch Gate Review - June 21, 2026

Review time: June 21, 2026
Scope: web Supabase migration set and launch-readiness blocker for `public.trips`

## Executive Status

The web migration set now contains an explicit `public.trips` RLS launch gate.

This closes a source-control gap: mobile already had a migration that re-enabled `public.trips` RLS, but the active web migration set did not. The new web migration enables RLS, keeps `FORCE RLS` disabled until the controlled validation window, grants recursion-safe helper execution to app roles, and fails loudly if expected policies or helper functions are missing.

This does not prove the live Supabase project is fixed. The migration still needs to be applied and validated against the shared project before the RLS gate can be marked complete.

## Files Added

- `supabase/migrations/20260621120000_trips_rls_launch_gate.sql`
- `tests/unit/trips-rls-launch-gate.test.ts`

## Local Validation

Completed on June 21, 2026:

- `npm test -- tests/unit/trips-rls-launch-gate.test.ts` passed with 4 tests.
- `npm run lint` passed with the existing image-optimization warnings.
- `npm test` passed with 79 test files and 321 tests.
- `npm run build` passed.

## Migration Contract

The migration:

- enables RLS on `public.trips`
- enables RLS on `public.trip_collaborators`
- keeps `NO FORCE ROW LEVEL SECURITY` on `public.trips`
- grants `is_trip_owner(uuid)`, `is_trip_collaborator(uuid)`, and `is_trip_editor(uuid)` to `anon` and `authenticated`
- verifies `relrowsecurity = true`
- verifies `relforcerowsecurity = false`
- verifies required trip and collaborator policies exist
- verifies trip helper functions are `SECURITY DEFINER`

## Required Live Validation

After applying the migration to staging or production, run:

```sql
select relrowsecurity, relforcerowsecurity
from pg_class
where oid = 'public.trips'::regclass;
```

Expected:

- `relrowsecurity = true`
- `relforcerowsecurity = false`

Then validate:

- owner can create, read, update, and delete their trips
- non-owner cannot read a trip by direct ID
- accepted collaborator can read shared trip
- editor collaborator can write supported child trip items
- admin/service-role routes still work
- share and invite flows still resolve
- web and mobile trip lists still load for the same account

## Decision

Do not mark trips RLS complete until the migration is applied to the shared Supabase project and the live validation evidence is recorded in `FOUNDATION_TEST_RESULTS.md`.
