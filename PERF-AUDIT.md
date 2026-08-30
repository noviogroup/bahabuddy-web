# Performance Audit Playbook (D.10)

> A self-contained checklist for running a performance pass after Baha Buddy Web ships a green build. Designed to be executed in ~1 hour for a baseline pass, ~4 hours for a thorough one.
>
> **Prerequisites:** `npm install` complete, `npm run build` exits 0, project deployed to a Vercel preview or running locally via `npm run start`.

---

## 1. Baseline numbers — get them first

Before touching anything, capture the current state. You can't tell what improved if you don't know where you started.

### 1a. Bundle size snapshot

After `npm run build`, Next.js prints a route-by-route bundle summary. Capture it.

```bash
npm run build 2>&1 | tee /tmp/build-baseline.txt
```

The interesting columns are **Size** (the route's own client JS) and **First Load JS** (route JS + framework + shared chunks). What to look for:

| Route | Size budget | First Load budget | If over | 
|---|---|---|---|
| `/dashboard` | < 50 KB | < 250 KB | check imports in `<HomeCardCarousel>` and `<AdaptiveHeroCard>` |
| `/dashboard/chat` | < 80 KB | < 280 KB | the largest expected — chat tools + cards live here |
| `/trip/[id]` | < 60 KB | < 250 KB | `<TripMap>` is heavy via Mapbox/Leaflet (if added) — keep dynamic |
| `/profile` | < 30 KB | < 220 KB | mostly form code, should be small |
| `/explore` | < 40 KB | < 230 KB | once Sanity is wired this may grow with Portable Text |
| `/dashboard/checkout` | < 100 KB | < 320 KB | Stripe.js dynamically loaded — won't show in bundle |

These budgets are starting points, not laws. Adjust based on what you find.

### 1b. Lighthouse baseline

Run Lighthouse against four critical routes — three from the authenticated experience, one from the public marketing surface.

```bash
# Local production server
npm run build && npm run start &
SERVER_PID=$!

# Audit each route in mobile mode (default — what users actually see)
npx lighthouse http://localhost:3000/ \
  --output html --output-path /tmp/lh-home.html
npx lighthouse http://localhost:3000/login \
  --output html --output-path /tmp/lh-login.html
# Authed routes need a logged-in session — use the Lighthouse Chrome extension
# instead, since CLI Lighthouse can't carry cookies easily.

kill $SERVER_PID
```

Targets: **Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90** for unauthenticated routes. Authenticated routes can be slightly lower on Performance (because the dashboard shell is real work) — aim for ≥ 80.

The numbers that matter most:
- **LCP (Largest Contentful Paint)** — should be < 2.5s. Hero images on `/`, `/dashboard`, and `/trip/[id]` are the typical LCP candidates.
- **CLS (Cumulative Layout Shift)** — must be < 0.1. Our use of `next/image` with `priority` on the trip hero should keep this near zero. Skeletons in `loading.tsx` files preserve layout.
- **TBT (Total Blocking Time)** — should be < 200ms. If higher, suspect a synchronous chunk in the chat or a chart library.

---

## 2. Bundle analyzer — find the heavy imports

If any route exceeded its budget in step 1, install the bundle analyzer and inspect.

```bash
npm install --save-dev @next/bundle-analyzer
```

Update `next.config.mjs`:

```js
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default withBundleAnalyzer({
  // ...existing config
})
```

Run:

```bash
ANALYZE=true npm run build
```

Two HTML reports open: client.html and server.html. Look in **client.html**.

### What to suspect

| Symptom | Likely culprit | Fix |
|---|---|---|
| `/dashboard` First Load > 280 KB | All chat code shipped to home | Use `next/dynamic` to lazy-load `<ChatPanel>` |
| `@stripe/stripe-js` in non-checkout bundles | Imported eagerly from `lib/stripe/client.ts` | Already lazy via `loadStripe`; verify in analyzer |
| `@stripe/react-stripe-js` in `/dashboard` | Eager import somewhere | Move `<Elements>` provider into the checkout page only |
| `lucide-react` or icon set 50+ KB | All icons imported | We're using hand-rolled SVGs — should be 0 KB. Verify. |
| `mapbox-gl` / `leaflet` in non-trip routes | `<TripMap>` not code-split | Wrap in `next/dynamic` with `ssr: false` |
| `@anthropic-ai/sdk` in client | Should only be server-side | Check `app/api/chat/route.ts` is server-only |
| `next-sanity` everywhere | Client component pulling Sanity types | Keep Sanity reads server-only via async server components |

### Quick wins that almost always help

1. **Split heavy client components with `next/dynamic`:**

   ```tsx
   import dynamic from 'next/dynamic'
   const TripMap = dynamic(() => import('@/components/TripMap'), {
     loading: () => <Skeleton className="h-64 w-full" />,
     ssr: false, // map libs typically can't SSR
   })
   ```

2. **Verify Stripe is lazy.** The Elements provider must only mount on `/dashboard/checkout`, never on parent layouts. Check by searching for `<Elements` — should appear only in `CheckoutForm.tsx`.

3. **Tree-shake icons.** If you ever swap hand-SVG icons for `lucide-react`, always use named imports: `import { Calendar } from 'lucide-react'` — never the default barrel.

---

## 3. Route-level revalidation

Server components fetched at request time on every visit are wasteful for content that changes infrequently. Audit each page's data freshness needs and apply ISR or `revalidate`.

| Route | Current behavior | Suggested |
|---|---|---|
| `/dashboard` | `dynamic` (per-request) | Keep — depends on user trips |
| `/trip` (index) | `dynamic` (per-request) | Keep — depends on user trips |
| `/trip/[id]` | `dynamic` (per-request) | Keep — depends on user trip state + realtime |
| `/profile` | `dynamic` (per-request) | Keep — user-specific |
| `/profile/bookings` | `dynamic` (per-request) | Keep — user-specific |
| `/explore` | static or ISR | **Add `export const revalidate = 1800`** (30 min). Once Sanity is wired, lower to 300 (5 min) for editorial refresh. |
| `/explore/quiz` | static | ✓ already static |
| `/dashboard/checkout` | dynamic | Must stay dynamic — server validates auth + ownership |

Apply `export const revalidate = 1800` to `src/app/(dashboard)/explore/page.tsx` only when Sanity is wired or fallback content is finalized. While the fallback is hardcoded into the bundle, it's effectively a static page already.

---

## 4. Image optimization

Routes we converted in D.7:
- `<HeroCard>` (used by AdaptiveHeroCard on /dashboard)
- `<TripCard>` (on /trip index)
- `<ExploreTabs>` article images (on /explore)
- Trip detail hero (with `priority` for LCP)

What's still using `<img>`:
- All RichCards photos (HotelCard, RestaurantCard, ActivityCard, DestinationCard) — D.7b deferred
- Stripe element previews — out of our control

### When/whether to do D.7b

The blocker is that LiteAPI, Viator/activity providers, backend-enriched place photo hosts, and Supabase Storage can all serve photos from different CDN domains. Each one has to be added to `next.config.mjs`'s `remotePatterns` before `next/image` can fetch it. Wrong pattern = 404 on every image.

To do D.7b safely:

1. Capture real photo URLs from a chat session that returns hotel + restaurant + activity + destination cards.
2. Extract their hostnames:
   ```bash
   grep -oP 'https://[^/]+/' /path/to/captured/cards.json | sort -u
   ```
3. Add each hostname to `next.config.mjs`:
   ```js
   images: {
     remotePatterns: [
       { protocol: 'https', hostname: 'cdn.sanity.io' },
       { protocol: 'https', hostname: 'tempo.cdn.tambourine.com' },
       { protocol: 'https', hostname: '**.supabase.co' },
       // Add the captured ones, e.g.:
       { protocol: 'https', hostname: 'static.cupid.travel' },     // LiteAPI
       { protocol: 'https', hostname: 'media.tacdn.com' },         // Viator
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // backend-enriched place photos
     ],
   },
   ```
4. Replace `<img>` with `<Image>` in `RichCards.tsx` — there are 4 sites: HotelCard, RestaurantCard, ActivityCard, DestinationCard.
5. Add `width` + `height` to each (the card layouts are fixed-size, so this is straightforward).
6. Test by sending each tool call type through the chat and confirming images load.

If any URL 404s after the conversion, either the pattern is wrong or the API returned an unexpected host — log it and add the host.

**Recommended approach:** ship D.7b in a separate branch and test against a real LiteAPI/Viator sandbox before merging. Don't combine with other changes.

---

## 5. Critical path scrutiny

Open Chrome DevTools → **Performance** tab → record a page load for each critical route. Look at:

### Main thread work
Long tasks (red bars in the Bottom-Up view) > 50ms each. The chat panel may show one long task during the first `useEffect` (Supabase client init + loadThreads). That's fine. Long tasks during scroll or interaction are not.

### Network waterfall
- The first HTML response should arrive < 200ms (or under a CDN if Vercel)
- Critical CSS should inline (Next.js handles this — verify)
- No render-blocking third-party scripts (Stripe.js is fine, it's lazy)

### Hydration time
React hydration after HTML stream. Aim for < 300ms on `/dashboard`. If higher, suspect a client component that should be a server component. Audit each `'use client'` file in `src/components/dashboard/` and `src/app/(dashboard)/`.

---

## 6. Quick checklist for this codebase

Things to specifically verify on Baha Buddy Web:

- [ ] `'use client'` is only on files that actually need it (any file using `useState`, `useEffect`, event handlers, hooks, etc.). Anything else should be a server component.
- [ ] `src/lib/sanity/queries.ts` is only imported from server components (never from `'use client'` files).
- [ ] `src/lib/stripe/client.ts`'s `loadStripe` only runs inside `getStripe()` (not at module scope).
- [ ] No `console.log` calls in production code (chat API and webhook handlers are exceptions).
- [ ] `next.config.mjs` `remotePatterns` doesn't have wildcard `**` for hostnames (security risk).
- [ ] Edge Function URLs in `lib/stripe/edge-function.ts` use `https://` only.
- [ ] Supabase client in `lib/supabase/client.ts` is created once (singleton-safe).
- [ ] No `useEffect` does anything that could be done at render time without it.

---

## 7. After the audit

Once you've captured baselines, made changes, and re-measured:

1. Update `bahabuddy-web/WORKPLAN.md` — mark D.10 ✅ with a one-line summary of what changed (`"+12 perf score on /dashboard via dynamic ChatPanel"`).
2. If you added `@next/bundle-analyzer`, decide whether to keep it. Either:
   - Keep in `devDependencies` for ongoing use, or
   - Remove and document the command in this playbook for ad-hoc runs.
3. If you applied `export const revalidate` anywhere, document the chosen interval in `PROGRESS.md`.
4. If you discovered something this playbook didn't anticipate, **add it here**. The next perf pass benefits from your findings.

---

## Reference: what we know about the build right now

- All routes ship as Next.js App Router (no Pages Router code)
- `force-dynamic` is set on all authenticated route pages (per-request rendering)
- `'use client'` boundary is at the components level (most pages are server components)
- The chat API uses streaming SSE, not buffered responses
- Stripe.js loads lazily via the `getStripe()` singleton
- Sanity client is server-only; falls back gracefully when env vars missing
- Realtime trip updates use a 500ms debounce + `router.refresh()` (no eager re-fetch)
- Anthropic SDK runs only in `app/api/chat/route.ts` (Node.js runtime, not Edge)

These are the design choices that should help perf out of the box. The audit is mostly about verifying they were preserved through the build.
