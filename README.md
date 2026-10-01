# Baha Buddy Web

The web companion to the [Baha Buddy mobile app](../Baha-Buddy-V2/) is a Next.js 14 App Router
application backed by the shared Supabase project.

This repository owns the **public marketplace and marketing pages**, **authenticated dashboard**,
**Buddy chat**, **stays/flights booking funnels**, **Explore content**, **concierge funnel**, and
**partner/vendor surfaces**. The web chat route currently uses `claude-sonnet-4-6`.

---

## Quick start

```bash
# Install exactly what CI and Netlify install (npm is the only package
# manager; package-lock.json is the only lockfile; .npmrc sets legacy-peer-deps)
npm ci

# Dev server
npm run dev

# Checks CI runs
npm run lint && npm run typecheck && npm run test:coverage

# Production build
npm run build && npm run start
```

Open [http://localhost:3000](http://localhost:3000).

Use **Node 20** (Netlify and CI build on Node 20; `engines` allows 20–22). On Apple Silicon,
the Node binary must be the **arm64** build (check with `node -p process.arch`): an x64 Node
running under Rosetta installs the wrong native SWC/esbuild binaries and `next dev`, `next build`
and Vitest fail. With nvm: `arch -arm64 nvm install 20`. Do not use pnpm or yarn.

---

## Environment variables

Set these in `.env.local` (and in Netlify for production). Generated from the
`process.env.*` keys read under `src/`. Missing optional values produce a **graceful fallback**,
not a crash, but the related feature is degraded. "Prod" marks values required in production.

| Variable | Prod | Purpose | Without it |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL | App can't run |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key (also used by the cookie-free public catalog client) | App can't run |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only Supabase admin key | Chat, booking, concierge and admin writes fail |
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical origin for metadata, sitemap, share and email links | Canonicals/links fall back to defaults |
| `ANTHROPIC_API_KEY` | yes | Claude API key (server only) | Chat API returns an unavailable state |
| `TRAVEL_BOOKING_API_KEY` | yes | LiteAPI key for stays + flights (server only). **Takes precedence over `LITEAPI_API_KEY`.** | Live search/booking return friendly unavailable states |
| `LITEAPI_API_KEY` | — | Legacy fallback name for the LiteAPI key, used only when `TRAVEL_BOOKING_API_KEY` is unset | — |
| `TRAVEL_BOOKING_API_BASE_URL` / `TRAVEL_BOOKING_BOOK_BASE_URL` | — | Override LiteAPI data / booking base URLs | Defaults to `api.liteapi.travel` / `book.liteapi.travel` v3.0 |
| `TRAVEL_BOOKING_API_AUTH_HEADER` | — | Auth header name for the provider | `X-API-Key` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | yes | Stripe Elements (client) | `/checkout` shows a "not configured" screen; Book CTAs hide |
| `STRIPE_SECRET_KEY` | yes | Stripe server API | Payment intents / concierge checkout fail |
| `STRIPE_CONCIERGE_WEBHOOK_SECRET` | yes | Verifies `/api/stripe/concierge-webhook` signatures | Concierge orders never get marked paid |
| `RESEND_API_KEY` | yes | Transactional email | Booking/concierge emails are silently skipped |
| `MAIL_FROM` | yes | Sender address for transactional email | Email send fails |
| `ADMIN_NOTIFICATION_EMAILS` | yes | Comma-separated ops recipients for new orders/leads | No internal notifications |
| `SANITY_REVALIDATE_SECRET` | yes | Shared secret for the Sanity webhook at `/api/revalidate` | Webhook is rejected; edits wait for ISR |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` / `NEXT_PUBLIC_SANITY_API_VERSION` | — | Editorial content | Built-in content keeps rendering |
| `GOOGLE_MAPS_API_KEY` | — | Server-side maps/geocoding | Map features hide |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` / `GOOGLE_MAPS_MAP_ID` | — | Browser map embeds (domain-restrict the key) | Map embeds hide |
| `NEXT_PUBLIC_MIXPANEL_TOKEN` | — | Analytics | Analytics disabled |
| `BOOKING_READINESS_TOKEN` | — | Protects the booking-readiness diagnostics endpoint | Endpoint stays locked |
| `ENABLE_DEMO_BOOKING_STATES` | no (never in prod) | Enables demo booking states for screenshots/QA | Demo states off |

See `.env.example` for format examples.

### One-time Supabase setup

Run `supabase/enable_trip_realtime.sql` once in the Supabase SQL Editor. Idempotent. Without it, the trip-detail Realtime listener never fires.

---

## Documentation

Start with the workspace [`documentation map`](../docs/README.md) and
[`go-live command center`](../docs/2026-06-25-GO-LIVE-COMMAND-CENTER.md). The web-local documents
below preserve the architecture and implementation journal for this surface:

| Doc | Purpose | Read when… |
|---|---|---|
| **[`PROGRESS.md`](./PROGRESS.md)** | Web parity architecture journal. | Understanding earlier design decisions. |
| **[`WORKPLAN.md`](./WORKPLAN.md)** | Historical Phases A–D task record. | Looking up the parity rebuild history. |
| **[`CHANGELOG.md`](./CHANGELOG.md)** | Session-by-session historical record. | Catching up on earlier changes. |
| **[`PERF-AUDIT.md`](./PERF-AUDIT.md)** | Playbook for the D.10 performance pass. Bundle analyzer, route budgets, Lighthouse targets. | Running the perf audit (after a green build). |

For Sanity setup specifically, see [`src/lib/sanity/README.md`](./src/lib/sanity/README.md).

---

## Architecture in 30 seconds

- **Route group `(dashboard)/`** wraps every authenticated route, so the chat panel state persists across navigation.
- **`<DashboardShell>`** is a 3-column responsive layout: sidebar (left) + content (center) + chat panel (right, ≥1280px) or floating button / overlay (narrower).
- **Server components by default.** `'use client'` is the exception — applied only where state, hooks, or browser APIs are needed.
- **Mobile is canonical.** Web mirrors mobile: same Supabase schema, same Edge Functions for Stripe + webhooks, same Claude system prompt, same design tokens.
- **Streaming SSE chat** with native tool use. Buddy calls 9 tools (hotels, restaurants, activities, flights, weather, etc.) inside the agentic loop bounded at `MAX_TURNS=4` / `MAX_TOOL_CALLS=8`.
- **Graceful degradation.** Stripe, Sanity, and LiteAPI can each be missing and the app still works — features degrade quietly with friendly fallbacks, never a crash.

Full architecture detail is in `PROGRESS.md`.

---

## Project structure

```
src/
├── app/
│   ├── (dashboard)/        ← authenticated routes (shared shell); the group
│   │                         name is not in the URL, e.g. (dashboard)/checkout → /checkout
│   ├── api/                ← route handlers (chat SSE, booking/*, payments, concierge, stripe webhooks)
│   ├── login/, auth/       ← sign-in (password + magic link; there is no /signup route)
│   ├── stays/, flights/, restaurants/, tours/, explore/, deals/ ← public marketplace
│   ├── share/              ← public trip share pages
│   └── ...
├── components/
│   ├── ui/                 ← 8 primitives (BahaCard, HeroCard, etc.)
│   ├── dashboard/          ← Shell, Sidebar, ChatPanel
│   ├── home/               ← Home widgets
│   ├── profile/            ← ProfileForm
│   ├── explore/, checkout/ ← Feature-specific
│   └── *.tsx               ← Top-level components (RichCards, TripCard, etc.)
├── lib/
│   ├── supabase/           ← server (cookie), client, public (cookie-free catalog reads), admin (service role)
│   ├── stripe/             ← Stripe.js loader + Edge Function caller
│   ├── sanity/             ← Sanity read client + queries (schemas live in ../studio)
│   └── *.ts                ← Shared utilities
├── hooks/                  ← useTripRealtime
└── types/                  ← Database types
```

---

## Common tasks

### Add a new authenticated route

1. Create `src/app/(dashboard)/<route>/page.tsx` — server component by default.
2. Add a `loading.tsx` sibling using Skeleton primitives (see `src/app/(dashboard)/trip/loading.tsx` for the pattern).
3. Add the route to `<Sidebar>`'s `NAV_ITEMS` if it should appear in the nav.
4. Auth is handled by `(dashboard)/layout.tsx` — no per-page guard needed.

### Add a new chat tool

1. Define the tool schema in `src/lib/chat-tools.ts`.
2. Add the execution branch in `src/app/api/chat/route.ts` (look for the `switch (toolUse.name)` block).
3. If the tool returns visual data, define a new `CardData` type in `src/components/RichCards.tsx` and a renderer for it.

### Touch the design system

Tokens live in `tailwind.config.ts` under `theme.extend.colors` and `theme.extend.borderRadius`. Brand scales: `brand`, `gold`, `coral`, `palm`, `sand`, `night` — each with 50–900 steps. **Don't add new tokens without checking mobile** (`Baha-Buddy-V2/lib/theme/`) — they need to match.

### Verify Stripe

Without a publishable key, `/checkout` shows a friendly "not configured" screen. With one, use Stripe's test card `4242 4242 4242 4242` with any future expiry and any CVC — full booking flow should complete and the booking row should land in Supabase with `status='confirmed'` (after webhook fires).

---

## Conventions

- **Comments explain *why*, not what.** If a comment just restates the code, delete it. Hot spots (system prompt, model routing, agentic loop limits, a11y patterns) document the choices.
- **A11y is part of done.** New interactive elements ship with `type="button"`, `aria-label` where the visual label is implicit, focus-visible rings, `motion-reduce:animate-none` on animations.
- **Server components first.** Only mark `'use client'` when you actually need state, refs, browser APIs, or event handlers.
- **No env var should crash the app.** Every external dependency has a degraded fallback path.
- **The `_archive/` folder is for historical reference only.** It's excluded from typechecking and the build. Move legacy code there instead of deleting if you might need to refer back to it.

---

## Deployment

Configured for Netlify (see `netlify.toml`). Vercel deployment also works — Next.js is the same on either platform. The image config (`next.config.mjs` `remotePatterns`) is preset for the photo CDNs we use.

The Supabase project and all Edge Functions (Stripe payment, webhook, etc.) are **shared with the mobile app**. There's no separate web backend.

---

## Current status

The public marketplace, dashboard, chat, trips, Explore, stay/flight funnels, concierge, and
partner/vendor foundations are implemented in source. Launch approval remains blocked by the
cross-surface operational gates in the root command center, especially live LiteAPI/Stripe lifecycle
proof, deployed-runtime readiness, key rotation, and backend deployment ownership.
