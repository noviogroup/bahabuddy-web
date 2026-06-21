# Web Booking Readiness Gate Review - June 21, 2026

Review time: June 21, 2026, 16:43 EDT
Scope: non-destructive hotel/flight booking readiness before live LiteAPI/Stripe lifecycle QA

## Executive Status

Added a web booking-readiness verifier that checks the source and environment contracts required before running real hotel or flight booking lifecycle tests.

This gate does not create payment intents, prebooks, provider bookings, or canonical booking rows. It is a preflight check for the real live-booking QA pass.

June 21 follow-up: the local web runtime now has `SUPABASE_SERVICE_ROLE_KEY` configured in ignored `.env.local`, and the full non-destructive readiness gate passes without dummy values.

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
- Local web env now has active `SUPABASE_SERVICE_ROLE_KEY`, and `.env.local` is ignored by git.
- LiteAPI non-booking rate smoke passes with network access.
- Supabase Edge Function URLs respond with protected `401` responses, proving the functions are deployed and not public.
- Local key-mode check shows Stripe keys are test-mode, while LiteAPI keys are production-mode.

The previous missing web service-role key blocker is closed locally. The remaining risk is not configuration for this local gate; it is operational safety. Because the LiteAPI key is production-mode, provider-book endpoints must only be exercised in a controlled QA run with cancellation/refund handling confirmed.

## Validation Evidence

Passed script syntax:

```bash
node --check scripts/verify-booking-readiness.mjs
```

Initial local failure before configuring the ignored web service-role env:

```bash
npm run verify:booking-readiness
```

Result:

- `SUPABASE_SERVICE_ROLE_KEY` failed.
- All other env, source, and public-secret exposure checks passed.

After configuring local ignored `.env.local`, the normal readiness gate passed without dummy values:

```bash
npm run verify:booking-readiness
```

Result:

- All non-remote readiness checks passed.
- No payments or provider bookings were created.

Remote Edge Function deployment check:

```bash
npm run verify:booking-readiness -- --remote-edge
```

Result:

- `stripe-payment`: `401`
- `liteapi-proxy`: `401`

Meaning: both functions are deployed and protected. The check did not authenticate or mutate data.

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
- Local web runtime can create the server-side admin client needed for canonical booking persistence.

## What This Does Not Prove

- Real Stripe PaymentIntent creation from the authenticated web flow.
- Real LiteAPI hotel prebook/book completion.
- Real LiteAPI flight prebook/book completion.
- Canonical row reconciliation after real provider booking.
- Admin display of a real web-created hotel or flight booking.

## Required Next Step

Before live lifecycle QA, confirm the deployed web runtime also has server-only `SUPABASE_SERVICE_ROLE_KEY` configured. Local QA is now configured, but deployment config still needs proof from the hosting environment.

Then keep this preflight green:

```bash
npm run verify:booking-readiness
npm run verify:booking-readiness -- --remote-edge
npm run smoke:liteapi
```

After these pass without dummy values, proceed to controlled Stripe/LiteAPI hotel and flight lifecycle tests with test travelers and confirmed cancellation/refund handling. Do not run provider-book endpoints casually: the LiteAPI key is production-mode.
