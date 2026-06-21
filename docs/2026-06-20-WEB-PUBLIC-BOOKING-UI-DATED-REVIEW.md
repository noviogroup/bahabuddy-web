# Web Public Booking UI Dated Review - June 20, 2026

Review time: June 20, 2026, 21:35 EDT
Updated: June 21, 2026, 16:34 EDT
Scope: Public web marketplace UI, booking parity surfaces, and validation status

## Executive Status

The web app now passes the public booking/UI validation gates for the current implementation pass.

The current web worktree includes the marketplace-style public UI, compact inner-page headers, public Explore page, flight marketplace search with sidebar/right promo structure, stay filters and starter island defaults, direct card actions, no-emoji customer-facing checks, and web booking parity tests for hotel and flight APIs.

June 21 follow-up: booking parity tests now also prove that successful hotel and flight provider booking responses persist into canonical `bookings`, the related trip item table, and `travel_booking_records` audit rows.

June 21 local-save follow-up: hotel and flight booking routes now return explicit `localStatus`, `localError`, and `supportRequired` fields. If the provider booking succeeds but the canonical booking row or trip item cannot be saved, the route returns HTTP 202 and the checkout client stops before confirmation with a support-required message instead of redirecting as if the booking were reconciled.

June 21 warning-cleanup follow-up: the remaining app-owned image optimization warnings and Sanity API-version warning are resolved. The active share page now uses `next/image`, the archived pre-C4 profile snapshot has an explicit archive-only lint suppression, and both Sanity clients now set an explicit API version. Supported-runtime validation should use Node 20 or 22; the project engine is `>=20 <23`.

This does not prove live provider checkout is complete. The new coverage uses mocked provider responses to validate server persistence contracts. Live LiteAPI/Stripe hotel and flight transactions still need to be run against production-like data and verified in Supabase/Admin.

## What Was Verified

- Public web UI tests pass.
- Booking parity API tests pass for hotel and flight route contracts, including successful canonical persistence for provider booking responses and local-save-failed response states.
- Checkout client tests prove hotel and flight payment flows do not redirect to confirmation when provider booking succeeds but local booking persistence fails.
- Direct card action tests pass.
- Public Explore, Stays, Flights, utility pages, sitemap, and no-emoji tests pass.
- Production build passes after replacing the emoji sanitizer with a TypeScript-target-safe regex.
- Production build still passes after the June 21 warning cleanup. In this restricted local environment, Sanity CDN DNS failures can print during static generation and then fall back to hardcoded/default content; this is an environment/network caveat, not a failed build.

## Validation Commands

```bash
npm run lint
npm test
npm run build
npm run smoke:liteapi
```

Results:

- `PATH=/Users/ShowmanIT/.nvm/versions/node/v22.22.2/bin:$PATH npm run lint` passed with no ESLint warnings or errors.
- June 20 result: `npm test` passed with 78 test files and 317 tests.
- June 21 follow-up result: `PATH=/Users/ShowmanIT/.nvm/versions/node/v22.22.2/bin:$PATH npm run test` passed with 83 test files and 344 tests, including the provider-booking persistence assertions and local-save-failed checkout guards.
- `PATH=/Users/ShowmanIT/.nvm/versions/node/v22.22.2/bin:$PATH npm run build` passed and generated 96 static pages.
- `npm run smoke:liteapi` passed against live, non-booking LiteAPI rate endpoints:
  - `/flights/rates` for MIA to NAS returned HTTP 200.
  - `/hotels/rates` for known Bahamas hotel IDs returned HTTP 200.
- June 21 follow-up result: `npm run smoke:liteapi` passed against live, non-booking LiteAPI rate endpoints:
  - `/flights/rates` for MIA to NAS returned HTTP 200 with one result.
  - `/hotels/rates` for `lp22731` and `lp383da` returned HTTP 200 with one result.

## Build Notes

Resolved in this pass:

- The active `/share/[code]` page no longer uses a raw `<img>` element for the trip hero.
- The archived pre-C4 profile snapshot is explicitly marked as archive-only for the `no-img-element` lint rule.
- `PortableTextBody` now configures Sanity with `NEXT_PUBLIC_SANITY_API_VERSION` or the `2024-01-01` default.
- The prior `--localstorage-file` warning is avoided when commands run under the supported Node 22 runtime instead of the shell's out-of-engine Node 25.

Remaining non-blocking build output:

- Next.js still prints `Using edge runtime on a page currently disables static generation for that page`.
- In this sandbox, `npm run build` can print Sanity CDN `ENOTFOUND` fallback output because `593u37vh.apicdn.sanity.io` is not resolvable from the restricted local network. Static generation still completes and fallback content is used.

## Still Open

- Run live LiteAPI hotel prebook/book checkout with Stripe and verify:
  - `bookings`
  - `trip_accommodations`
  - `travel_booking_records`
  - Admin Revenue, Payments, Billing, Support, Trips, and Travelers
- Run live LiteAPI flight prebook/book checkout with Stripe and verify:
  - `bookings`
  - `trip_flights`
  - `travel_booking_records`
  - Admin Revenue, Payments, Billing, Support, Trips, and Travelers
- Capture stakeholder screenshots after the validated app is running with representative data.
- Keep using Node 20 or 22 for web validation until the engine range changes.

## Decision

The web implementation is validation-ready for the current plan slice, and live LiteAPI rate connectivity is confirmed. The broader booking parity plan remains open until real provider/payment lifecycle checks prove prebook, payment, provider booking, local booking rows, and Admin reconciliation end to end.
