# Web Booking Readiness Gate Review - June 21, 2026

Review time: June 21, 2026, 16:43 EDT
Updated: June 23, 2026, 17:47 EDT
Scope: non-destructive hotel/flight booking readiness before live LiteAPI/Stripe lifecycle QA

## Executive Status

Added a web booking-readiness verifier that checks the source and environment contracts required before running real hotel or flight booking lifecycle tests.

This gate does not create payment intents, prebooks, provider bookings, or canonical booking rows. It is a preflight check for the real live-booking QA pass.

June 21 follow-up: the local web runtime now has `SUPABASE_SERVICE_ROLE_KEY` configured in ignored `.env.local`, and the full non-destructive readiness gate passes without dummy values.

June 21 deployed-runtime follow-up: web now exposes a protected `GET /api/internal/booking-readiness` endpoint and the verifier can call it with `--runtime-url` or `BOOKING_READINESS_RUNTIME_URL` to prove deployed web env/schema readiness without creating payments, prebooks, provider bookings, canonical booking rows, trip items, or audit rows.

June 21 Netlify follow-up: two Netlify MCP upload attempts reached the upload step but failed with `502 Bad Gateway`. The alternate Netlify CLI path succeeded: production deploy `6a3879a3d33124694477b840` is now live from the local web repo at `f7347c4`. Deployed runtime proof remains open because site-level visitor password protection returns Netlify HTML `401` before requests reach `/api/internal/booking-readiness`.

June 23 documentation audit: this gate remains correctly documented as a preflight, not as booking lifecycle completion. The open production gate is still deployed runtime proof plus controlled live LiteAPI/Stripe hotel and flight lifecycle QA.

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
- Added protected deployed web runtime mode:
  - `GET /api/internal/booking-readiness`
  - `npm run verify:booking-readiness -- --runtime-url <deployed-web-url>`
  - `BOOKING_READINESS_RUNTIME_URL=<deployed-web-url> npm run verify:booking-readiness`
  - authentication via server-side `BOOKING_READINESS_TOKEN` or `INTERNAL_API_SECRET`
  - redacted response; no secret values are returned
  - canonical source model reports `bookings`, `trip_accommodations`, and `trip_flights` as operational, with `travel_booking_records` as audit-only
- Added `.env.example` entries for `BOOKING_READINESS_TOKEN` and `BOOKING_READINESS_RUNTIME_URL`.
- Improved the deployed runtime verifier message when Netlify returns an HTML `401`, which can happen when visitor password protection or an old deploy blocks the readiness route.

## Current Findings

- Source contract checks pass.
- Local web env now has active `SUPABASE_SERVICE_ROLE_KEY`, and `.env.local` is ignored by git.
- Protected deployed-runtime readiness endpoint source and tests pass locally.
- `.env.example` now documents the readiness token/runtime URL contract.
- LiteAPI non-booking rate smoke passes with network access.
- Supabase Edge Function URLs respond with protected `401` responses, proving the functions are deployed and not public.
- Local key-mode check shows Stripe keys are test-mode, while LiteAPI keys are production-mode.
- Hosted Netlify runtime proof is still pending because visitor password protection blocks requests before they reach the readiness route.

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

Protected web runtime endpoint and verifier coverage:

```bash
npm run test -- tests/components/public-shell-neutral-layout.test.tsx tests/api/internal-booking-readiness.test.ts tests/unit/booking-readiness-runtime-verifier.test.ts
```

Result:

- 3 files passed
- 12 tests passed

Full web validation after the deployed-runtime endpoint and nav-label test update:

```bash
npm run test
npm run verify:booking-readiness
npm run lint
npm run build
```

Result:

- `npm run test`: 85 files passed, 350 tests passed
- `npm run verify:booking-readiness`: passed without creating payments or provider bookings
- `npm run lint`: no ESLint warnings or errors
- `npm run build`: production build passed and included `/api/internal/booking-readiness`

Netlify deployment status check:

- Project: `bahabuddy-web`
- Primary URL: `https://bahabuddy.com`
- Current production deploy: `6a3879a3d33124694477b840`
- Current production deploy published: June 21, 2026
- Unique deploy URL: `https://6a3879a3d33124694477b840--bahabuddy-web.netlify.app`
- Netlify MCP deploy attempts failed twice during upload with `502 Bad Gateway`.
- Netlify CLI deploy succeeded with `npx -y netlify-cli@latest deploy --build --prod`.
- Site-level visitor password protection is enabled, so `curl -I https://bahabuddy.com/api/internal/booking-readiness` and the unique deploy URL both return Netlify HTML `401` before they can prove the Next.js readiness route.

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

Before live lifecycle QA, confirm the deployed web runtime has server-only `SUPABASE_SERVICE_ROLE_KEY` plus `BOOKING_READINESS_TOKEN` or `INTERNAL_API_SECRET` configured. Local QA is now configured and the current code is deployed, but deployment runtime config still needs proof from the hosting environment. If Netlify visitor password protection remains enabled, provide an access path that lets the verifier reach the Next.js route instead of the Netlify password gate.

Then keep this preflight green:

```bash
npm run verify:booking-readiness
npm run verify:booking-readiness -- --runtime-url <deployed-web-url>
npm run verify:booking-readiness -- --remote-edge
npm run smoke:liteapi
```

After these pass without dummy values, proceed to controlled Stripe/LiteAPI hotel and flight lifecycle tests with test travelers and confirmed cancellation/refund handling. Do not run provider-book endpoints casually: the LiteAPI key is production-mode.
