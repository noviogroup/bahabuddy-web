# Web Deployed Booking Runtime Readiness Review - June 21, 2026

Review time: June 21, 2026, 18:25 EDT
Updated: June 23, 2026, 17:47 EDT
Scope: protected deployed-runtime readiness proof for web hotel and flight booking

## Executive Status

Web now has a non-destructive internal runtime endpoint that can prove whether a deployed web runtime has the server-only booking environment and canonical Supabase schema required before running real LiteAPI/Stripe lifecycle QA.

This does not create Stripe PaymentIntents, LiteAPI prebooks, LiteAPI bookings, canonical booking rows, trip items, or audit rows. It is a deployment safety gate.

Current deployment status: local/source readiness is complete and the current code has been deployed to Netlify production. Netlify project `bahabuddy-web` now reports production deploy `6a3879a3d33124694477b840` as ready. The deployed readiness endpoint still has not been proven because site-level visitor password protection returns Netlify HTML `401` before requests reach `/api/internal/booking-readiness`.

June 23 documentation audit: this remains an open launch gate. The route and verifier exist, but deployed runtime readiness is not proven until the hosted environment can be reached past visitor protection and returns redacted readiness with server-only booking env present.

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
- Documented readiness env keys in `.env.example`:
  - `BOOKING_READINESS_TOKEN`
  - `BOOKING_READINESS_RUNTIME_URL`
- Improved deployed verifier diagnostics for Netlify HTML `401` responses caused by visitor password protection or old deploys.

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

## Netlify Runtime Notes

Current Netlify project evidence:

- site name: `bahabuddy-web`
- primary URL: `https://bahabuddy.com`
- current production deploy: `6a3879a3d33124694477b840`
- current production deploy state: `ready`
- current production deploy published: June 21, 2026
- current production deploy source: Netlify CLI production deploy from the local web repo at `f7347c4`
- unique deploy URL: `https://6a3879a3d33124694477b840--bahabuddy-web.netlify.app`
- project access controls: visitor password required for all projects

Operational implications:

- The protected readiness route is present in the deployed build output.
- Site-level visitor password protection can return a Netlify HTML `401` before the request reaches `/api/internal/booking-readiness`.
- Runtime proof still requires the readiness token/service-role env keys to be configured in the deployed runtime.
- If visitor password remains enabled, the runtime check needs a deploy target or access path that allows the readiness request to reach the Next.js route.

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

Netlify deploy attempt on June 21, 2026:

```bash
npx -y @netlify/mcp@latest --site-id 62ca52b6-3f97-4443-b393-e74ab6738f41 --proxy-path <redacted-proxy-url>
```

Result:

- Attempt 1 reached Netlify upload, then failed with `502 Bad Gateway`.
- Attempt 2 reached Netlify upload, then failed with `502 Bad Gateway`.
- No new production deploy was published by these MCP attempts.

Netlify CLI deploy on June 21, 2026:

```bash
npx -y netlify-cli@latest deploy --build --prod
```

Result:

- Build completed successfully.
- Production deploy went live.
- Production URL: `https://bahabuddy.com`
- Unique deploy URL: `https://6a3879a3d33124694477b840--bahabuddy-web.netlify.app`
- Build output included `/api/internal/booking-readiness`.

Post-deploy access check:

```bash
curl -I https://bahabuddy.com/api/internal/booking-readiness
curl -I https://6a3879a3d33124694477b840--bahabuddy-web.netlify.app/api/internal/booking-readiness
```

Result:

- Both requests returned Netlify HTML `401`.
- This proves the project access-control layer is still in front of the app route.
- It does not prove the Next.js readiness route or runtime env yet.

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

Immediate next action: configure server-only `BOOKING_READINESS_TOKEN` plus `SUPABASE_SERVICE_ROLE_KEY` on the hosted runtime, then provide a readiness access path past Netlify visitor password protection and run the deployed verifier against the deploy URL.
