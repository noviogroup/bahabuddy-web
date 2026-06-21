# Web Public Booking UI Dated Review - June 20, 2026

Review time: June 20, 2026, 21:35 EDT
Updated: June 21, 2026, 16:21 EDT
Scope: Public web marketplace UI, booking parity surfaces, and validation status

## Executive Status

The web app now passes the public booking/UI validation gates for the current implementation pass.

The current web worktree includes the marketplace-style public UI, compact inner-page headers, public Explore page, flight marketplace search with sidebar/right promo structure, stay filters and starter island defaults, direct card actions, no-emoji customer-facing checks, and web booking parity tests for hotel and flight APIs.

June 21 follow-up: booking parity tests now also prove that successful hotel and flight provider booking responses persist into canonical `bookings`, the related trip item table, and `travel_booking_records` audit rows.

June 21 local-save follow-up: hotel and flight booking routes now return explicit `localStatus`, `localError`, and `supportRequired` fields. If the provider booking succeeds but the canonical booking row or trip item cannot be saved, the route returns HTTP 202 and the checkout client stops before confirmation with a support-required message instead of redirecting as if the booking were reconciled.

This does not prove live provider checkout is complete. The new coverage uses mocked provider responses to validate server persistence contracts. Live LiteAPI/Stripe hotel and flight transactions still need to be run against production-like data and verified in Supabase/Admin.

## What Was Verified

- Public web UI tests pass.
- Booking parity API tests pass for hotel and flight route contracts, including successful canonical persistence for provider booking responses and local-save-failed response states.
- Checkout client tests prove hotel and flight payment flows do not redirect to confirmation when provider booking succeeds but local booking persistence fails.
- Direct card action tests pass.
- Public Explore, Stays, Flights, utility pages, sitemap, and no-emoji tests pass.
- Production build passes after replacing the emoji sanitizer with a TypeScript-target-safe regex.

## Validation Commands

```bash
npm run lint
npm test
npm run build
npm run smoke:liteapi
```

Results:

- `npm run lint` passed with existing image optimization warnings.
- June 20 result: `npm test` passed with 78 test files and 317 tests.
- June 21 follow-up result: `npm run test` passed with 83 test files and 344 tests, including the provider-booking persistence assertions and local-save-failed checkout guards.
- `npm run build` passed and generated 96 static pages.
- `npm run smoke:liteapi` passed against live, non-booking LiteAPI rate endpoints:
  - `/flights/rates` for MIA to NAS returned HTTP 200.
  - `/hotels/rates` for known Bahamas hotel IDs returned HTTP 200.
- June 21 follow-up result: `npm run smoke:liteapi` passed against live, non-booking LiteAPI rate endpoints:
  - `/flights/rates` for MIA to NAS returned HTTP 200 with one result.
  - `/hotels/rates` for `lp22731` and `lp383da` returned HTTP 200 with one result.

## Build Notes

Warnings remain but are not blocking:

- Existing `<img>` warnings in archived/profile share code.
- Sanity client warns that an explicit API version should be configured.
- The test/build process prints `--localstorage-file` warnings from the local environment.

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
- Resolve Sanity API-version warning and any remaining image optimization warnings in a later polish pass.

## Decision

The web implementation is validation-ready for the current plan slice, and live LiteAPI rate connectivity is confirmed. The broader booking parity plan remains open until real provider/payment lifecycle checks prove prebook, payment, provider booking, local booking rows, and Admin reconciliation end to end.
