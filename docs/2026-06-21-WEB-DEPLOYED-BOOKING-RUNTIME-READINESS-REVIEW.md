# Web Deployed Booking Runtime Readiness Review - June 21, 2026

Review time: June 21, 2026, 18:25 EDT
Scope: protected deployed-runtime readiness proof for web hotel and flight booking

## Executive Status

Web now has a non-destructive internal runtime endpoint that can prove whether a deployed web runtime has the server-only booking environment and canonical Supabase schema required before running real LiteAPI/Stripe lifecycle QA.

This does not create Stripe PaymentIntents, LiteAPI prebooks, LiteAPI bookings, canonical booking rows, trip items, or audit rows. It is a deployment safety gate.

## What Changed

- Added `GET /api/internal/booking-readiness`.
- The route requires a server-side readiness secret from `BOOKING_READINESS_TOKEN` or `INTERNAL_API_SECRET`.
- The request can authenticate with `Authorization: Bearer <token>` or `x-baha-readiness-token`.
- Missing readiness secret returns `503` with `booking_readiness_token_not_configured`.
- Invalid token returns `401` and does not call Supabase.
- Successful responses are redacted and include only readiness state, not secret values.
- The response explicitly reports:
  - provider: `liteapi`
  - payment: `stripe_edge_function`
  - operational source tables: `bookings`, `trip_accommodations`, `trip_flights`
  - audit-only table: `travel_booking_records`
- The route validates live schema access for:
  - `bookings`
  - `trip_accommodations`
  - `trip_flights`
  - `travel_booking_records`
- Extended `npm run verify:booking-readiness` with deployed runtime support:
  - `--runtime-url <url>`
  - `BOOKING_READINESS_RUNTIME_URL=<url>`
- The verifier sends the readiness bearer token, checks the deployed JSON, and fails if the response leaks local secret values.

## How To Run

Local non-destructive source/env gate:

```bash
npm run verify:booking-readiness
```

Deployed runtime gate:

```bash
BOOKING_READINESS_TOKEN=<server-side-token> npm run verify:booking-readiness -- --runtime-url https://example.com
```

Equivalent env-driven run:

```bash
BOOKING_READINESS_TOKEN=<server-side-token> BOOKING_READINESS_RUNTIME_URL=https://example.com npm run verify:booking-readiness
```

The token value must remain server-side and should not be committed, logged, or exposed to the browser.

## Validation Evidence

Focused tests passed:

```bash
npm run test -- tests/components/public-shell-neutral-layout.test.tsx tests/api/internal-booking-readiness.test.ts tests/unit/booking-readiness-runtime-verifier.test.ts
```

Result: 3 files passed, 12 tests passed.

Full web test suite passed:

```bash
npm run test
```

Result: 85 files passed, 350 tests passed.

Booking readiness verifier passed:

```bash
npm run verify:booking-readiness
```

Lint passed:

```bash
npm run lint
```

Result: no ESLint warnings or errors.

Production build passed:

```bash
npm run build
```

Result: Next.js production build completed successfully and included `/api/internal/booking-readiness` in the app route manifest.

## What This Proves

- The web source contract includes a protected deployed-runtime readiness endpoint.
- The endpoint can verify server-only environment presence without exposing values.
- The endpoint can verify the deployed runtime's Supabase schema access for canonical booking and audit tables.
- The operational source model remains canonical `bookings` plus trip item tables.
- `travel_booking_records` remains provider/audit logging only.
- The runtime verifier can be pointed at the deployed web app before any live provider lifecycle test.

## What This Does Not Prove

- Real Stripe PaymentIntent creation from the authenticated web flow.
- Real LiteAPI hotel prebook/book completion.
- Real LiteAPI flight prebook/book completion.
- Webhook reconciliation after provider/payment state changes.
- Admin display of a real web-created hotel or flight booking.

## Required Next Step

After this commit is deployed, set a server-side `BOOKING_READINESS_TOKEN` or `INTERNAL_API_SECRET` in the hosting environment, then run:

```bash
BOOKING_READINESS_TOKEN=<server-side-token> npm run verify:booking-readiness -- --runtime-url <deployed-web-url>
```

Only after the deployed runtime gate passes should the team run controlled LiteAPI/Stripe hotel and flight lifecycle QA.
