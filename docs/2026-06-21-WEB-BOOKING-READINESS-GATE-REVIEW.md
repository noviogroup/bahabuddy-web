# Web Booking Readiness Gate Review - June 21, 2026

Review time: June 21, 2026, 16:42 EDT
Scope: non-destructive hotel/flight booking readiness before live LiteAPI/Stripe lifecycle QA

## Executive Status

Added a web booking-readiness verifier that checks the source and environment contracts required before running real hotel or flight booking lifecycle tests.

This gate does not create payment intents, prebooks, provider bookings, or canonical booking rows. It is a preflight check for the real live-booking QA pass.

## What Changed

- Added `npm run verify:booking-readiness`.
- The verifier checks:
  - Supabase URL, anon key, service-role key, Stripe publishable key, and LiteAPI private key presence.
  - LiteAPI search/rate and book base URLs.
  - unexpected `NEXT_PUBLIC_*` secret-like env leakage.
  - server-side LiteAPI provider usage.
  - Stripe PaymentIntent handoff through the Supabase `stripe-payment` Edge Function.
  - hotel and flight prebook endpoints stay server-side.
  - hotel and flight provider-book routes persist canonical `bookings`, trip item rows, and audit rows.
  - hotel and flight provider-book routes expose `localStatus` and `supportRequired` for provider-success/local-save-failed states.
- Added optional `--remote-edge` mode to check that `stripe-payment` and `liteapi-proxy` Edge Function URLs are deployed without authenticating or mutating data.

## Current Findings

- Source contract checks pass.
- LiteAPI non-booking rate smoke passes with network access.
- Supabase Edge Function URLs respond with protected `401` responses, proving the functions are deployed and not public.
- Local `bahabuddy-web/.env.local` is missing `SUPABASE_SERVICE_ROLE_KEY`; the line exists but is commented out.

The missing web service-role key is a real blocker for local full booking QA. After payment and provider booking succeed, the web provider-book routes call `createAdminClient()` to save canonical `bookings`, `trip_accommodations` or `trip_flights`, and `travel_booking_records`. Without `SUPABASE_SERVICE_ROLE_KEY`, the route correctly returns `localStatus: failed` and `supportRequired: true`, but it cannot prove a successful reconciled booking.

## Validation Evidence

Passed script syntax:

```bash
node --check scripts/verify-booking-readiness.mjs
```

Expected local failure because web service-role env is not configured:

```bash
npm run verify:booking-readiness
```

Result:

- `SUPABASE_SERVICE_ROLE_KEY` failed.
- All other env, source, and public-secret exposure checks passed.

Verifier behavior with a dummy service-role value:

```bash
SUPABASE_SERVICE_ROLE_KEY=dummy npm run verify:booking-readiness
```

Result:

- All non-remote readiness checks passed.
- No payments or provider bookings were created.

Remote Edge Function deployment check using unauthenticated `curl`:

```bash
curl -s -o /private/tmp/baha-stripe-payment-edge.txt -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{}" https://cxcfymhoncysyloutvkh.supabase.co/functions/v1/stripe-payment
curl -s -o /private/tmp/baha-liteapi-proxy-edge.txt -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{}" https://cxcfymhoncysyloutvkh.supabase.co/functions/v1/liteapi-proxy
```

Result:

- `stripe-payment`: `401`
- `liteapi-proxy`: `401`

Live non-booking LiteAPI rate smoke with network access:

```bash
npm run smoke:liteapi
```

Result:

- flight rates MIA to NAS: HTTP 200, one result
- hotel rates `lp22731`, `lp383da`: HTTP 200, one result

## What This Proves

- Web booking source contracts are ready for a real lifecycle test.
- LiteAPI search/rate connectivity is working.
- Supabase booking/payment Edge Functions are deployed and protected.
- Public env exposure does not show unexpected secret-like keys.

## What This Does Not Prove

- Real Stripe PaymentIntent creation from the authenticated web flow.
- Real LiteAPI hotel prebook/book completion.
- Real LiteAPI flight prebook/book completion.
- Canonical row reconciliation after real provider booking.
- Admin display of a real web-created hotel or flight booking.

## Required Next Step

Before live lifecycle QA, set `SUPABASE_SERVICE_ROLE_KEY` in the web runtime environment, including local `bahabuddy-web/.env.local` for local QA and the deployed web environment for production-like QA.

Then run:

```bash
npm run verify:booking-readiness
npm run smoke:liteapi
```

After both pass without dummy values, proceed to controlled Stripe/LiteAPI hotel and flight lifecycle tests with test travelers and confirmed cancellation/refund handling.
