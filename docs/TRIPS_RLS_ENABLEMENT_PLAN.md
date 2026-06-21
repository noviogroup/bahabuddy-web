# Trips RLS Enablement Plan

## Purpose

This document defines the safe path to enable Row Level Security on `public.trips`.

Live Supabase inventory showed that `public.trips` is the only core user-facing table with RLS disabled. The table already has owner and collaborator policies defined, but the table-level RLS switch is currently off.

This plan now has a web migration counterpart:

- `supabase/migrations/20260621120000_trips_rls_launch_gate.sql`

That migration enables the table-level RLS switch and asserts the expected policy/helper surface. It still must be applied and validated in the shared Supabase project before the gate can be marked complete.

---

## Live findings

### `public.trips` columns confirmed

- `id` uuid
- `user_id` uuid
- `name` text
- `status` text
- `date_start` date
- `date_end` date
- `islands` array
- `party_type` text
- `party_size` integer
- `budget_estimate` numeric
- `budget_actual` numeric
- `chat_thread_id` uuid
- `hero_image_url` text
- `collaborator_ids` array
- `created_at` timestamptz
- `updated_at` timestamptz

### Existing trip policies confirmed

The following policies already exist on `public.trips`:

- `Users can read own or collaborated trips` — SELECT
- `Users can insert own trips` — INSERT
- `Users can update own trips` — UPDATE
- `Users can delete own trips` — DELETE

### Existing helper functions confirmed

The following helper functions exist:

- `public.is_trip_owner(p_trip_id uuid)`
- `public.is_trip_collaborator(p_trip_id uuid)`
- `public.is_trip_editor(p_trip_id uuid)`

These functions are `SECURITY DEFINER` functions with `search_path` set to `public`.

---

## Why this matters

Saved trips are central to Baha Buddy. They connect:

- AI-generated trips
- Saved itineraries
- Trip detail pages
- Chat threads
- Flights
- Accommodations
- Activities
- Share links
- Invitations
- Collaborators
- Bookings

Because `trips` is user-owned data, RLS should be enabled before broader beta or before adding new trip-based modules such as Cruise Day Planner and Self-Guided Tours.

---

## Required pre-checks before enabling RLS

Before enabling RLS, confirm these flows work in staging or during a controlled test window:

1. Web user can create a trip from chat.
2. Web user can view their own trip detail page.
3. Web user cannot view another user's trip by direct URL.
4. Mobile user can create a trip.
5. Mobile user can load their saved trips.
6. Mobile user can load trip accommodations, flights, and activities.
7. Chat threads attached to a trip still load.
8. Share links still resolve through the public share function/page.
9. Invited collaborator can accept invite and read the shared trip.
10. Admin/service-role routes still work.

---

## Intended migration action

The intended database change is simple because the policies already exist:

```sql
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
```

Do not force RLS yet. `FORCE ROW LEVEL SECURITY` should only be considered after web, mobile, admin, and Edge Function code paths are fully validated.

The current launch-gate migration also runs policy/function checks so migration application fails if the expected owner/collaborator policy surface is missing.

---

## Post-change validation

After enabling RLS, validate:

```sql
select relrowsecurity, relforcerowsecurity
from pg_class
where oid = 'public.trips'::regclass;
```

Expected:

- `relrowsecurity = true`
- `relforcerowsecurity = false`

Then validate app behavior:

- Owner can read/write their trip.
- Other users cannot read/write it.
- Accepted collaborators can read it.
- Editor collaborators can modify supported child tables.
- Share-link resolution still uses server/service role or approved public function behavior.

---

## Rollback plan

If a production flow breaks immediately after enabling RLS, temporarily disable RLS again while policies/code paths are corrected:

```sql
ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;
```

This rollback should only be used as an emergency restoration step.

---

## Recommendation

Enable RLS only after the foundation test plan is ready. Since the policies already exist, the main risk is not missing policy definitions; the risk is untested app flows that may rely on unrestricted trip reads/writes.
