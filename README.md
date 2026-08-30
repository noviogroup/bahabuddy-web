# Baha Buddy Web

The web companion to the [Baha Buddy mobile app](../Baha-Buddy-V2/) is a Next.js 14 App Router
application backed by the shared Supabase project.

This repository owns the **public marketplace and marketing pages**, **authenticated dashboard**,
**Buddy chat**, **stays/flights booking funnels**, **Explore content**, **concierge funnel**, and
**partner/vendor surfaces**. The web chat route currently uses `claude-sonnet-4-6`.

---

## Quick start

```bash
# Install (use --legacy-peer-deps if React 18 peer mismatches surface)
npm install

# Dev server
npm run dev

# Production build
npm run build && npm run start
```

Open [http://localhost:3000](http://localhost:3000).

Use Node 20–22, matching the package `engines` contract.

---

## Required environment variables

Set these in `.env.local`. Missing any one of them produces a **graceful fallback**, not a crash — but features will be degraded.

| Variable | Purpose | Without it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | App can't run |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | App can't run |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase admin key | Chat API can't write trips |
| `ANTHROPIC_API_KEY` | Claude API key (server only) | Chat API returns 500 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Elements (client) | `/dashboard/checkout` shows "not configured" screen. Trip detail + chat SummaryCard hide Book CTA. |
| `LITEAPI_API_KEY` | Hotel and flight search/booking (server only) | Live travel search and booking routes return friendly unavailable states. |
| `LITEAPI_PUBLIC_KEY` | LiteAPI payment SDK support when required | Flight payment flows cannot initialize provider-side payment when required. |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Editorial content | Hardcoded content keeps rendering. App fully usable. |
| `NEXT_PUBLIC_SANITY_DATASET` | Editorial content | Same as above. |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Editorial content | Same as above. |

See `.env.example` for the full list including format examples.

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
│   ├── (dashboard)/        ← authenticated routes (shared shell)
│   ├── api/chat/           ← streaming SSE chat with tool use
│   ├── login/, signup/     ← unauthenticated
│   ├── deals/, share/      ← marketing routes
│   └── ...
├── components/
│   ├── ui/                 ← 8 primitives (BahaCard, HeroCard, etc.)
│   ├── dashboard/          ← Shell, Sidebar, ChatPanel
│   ├── home/               ← Home widgets
│   ├── profile/            ← ProfileForm
│   ├── explore/, checkout/ ← Feature-specific
│   └── *.tsx               ← Top-level components (RichCards, TripCard, etc.)
├── lib/
│   ├── supabase/           ← Server + client Supabase factories
│   ├── stripe/             ← Stripe.js loader + Edge Function caller
│   ├── sanity/             ← Sanity client + schemas (read-only)
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

Without a publishable key, `/dashboard/checkout` shows a friendly "not configured" screen. With one, use Stripe's test card `4242 4242 4242 4242` with any future expiry and any CVC — full booking flow should complete and the booking row should land in Supabase with `status='confirmed'` (after webhook fires).

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
