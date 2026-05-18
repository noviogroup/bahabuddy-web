# Baha Buddy — Web Dashboard Parity (`bahabuddy-web`)

> **Goal:** Feature parity between the Flutter mobile app (`Baha-Buddy-V2/`) and the Next.js web dashboard (`bahabuddy-web/`). Mobile is canonical. Web is being upgraded — not rebuilt — phase by phase.

> **NOT** pixel parity. The web has its own layout (sidebar + main + chat panel on desktop, drawer + overlay on mobile) but uses the same design system, the same Supabase backend, the same AI engine, and offers the same features.

---

## Quick orientation

| What | Where |
|---|---|
| Mobile (canonical) Flutter app | `/Users/ShowmanIT/Downloads/Novio Group/Baha Buddy/Baha-Buddy-V2/` |
| Web (in progress) Next.js app | `/Users/ShowmanIT/Downloads/Novio Group/Baha Buddy/bahabuddy-web/` |
| Sanity Studio (canonical for content) | `/Users/ShowmanIT/Downloads/Novio Group/Baha Buddy/studio/` (project `593u37vh`) |
| Marketing website | `/Users/ShowmanIT/Downloads/Novio Group/Baha Buddy/website/` |
| Admin panel | `/Users/ShowmanIT/Downloads/Novio Group/Baha Buddy/Baha Buddy/Baha-Buddy-Admin/` |
| Supabase project ID | `cxcfymhoncysyloutvkh` (shared) |
| Mobile Edge Functions | `/Baha-Buddy-V2/supabase/functions/` |
| Workplan tracker (markdown, live) | `bahabuddy-web/WORKPLAN.md` |
| Perf audit playbook | `bahabuddy-web/PERF-AUDIT.md` |
| Session-by-session changelog | `bahabuddy-web/CHANGELOG.md` |

---

## Phase status

| Phase | Description | Status | Done |
|---|---|---|---|
| A | Foundation & Shell | ✅ Complete | 15 / 15 |
| B | Home & Chat Polish | ✅ Complete | 16 / 16 |
| C | Trip Detail + Routes + Profile + Explore + Sanity + Stripe | ✅ Complete | 12 / ~12 |
| C.11 | Detail-page architecture (Session 12) | ✅ Complete | 6 / 6 |
| C.12 | Sanity alignment + Community port + schemas (Sessions 13 + follow-up) | ✅ Complete | 10 / 10 |
| D | Polish + Performance + A11y | ✅ Effectively complete | 9.5 / ~10 |

**Live counter:** ~68.5 / ~69 tasks done (~99%).

What's left:
- **Deploy `sanity-proxy` Edge Function** with the Session 13 follow-up mutation-safety regex
- **D.7b** — RichCards photos + detail-page heroes → `next/image` (deferred — needs known photo-CDN hostnames)
- **D.10** — performance audit pass (deferred until `npm run build` is green)

---

## Web app file map (end of Session 13 follow-up)

```
bahabuddy-web/
├── PROGRESS.md                            ← this file
├── WORKPLAN.md                            ← live task tracker
├── PERF-AUDIT.md                          ← D.10 playbook
├── CHANGELOG.md                           ← session-by-session summary
├── tailwind.config.ts
├── next.config.mjs                        ← includes cdn.sanity.io, **.supabase.co
├── package.json                           ← Session 11: +@sanity/client direct dep
├── tsconfig.json                          ← excludes src/_archive
├── supabase/
│   └── enable_trip_realtime.sql           ← P0: run once
└── src/
    ├── _archive/                          ← excluded from build
    ├── app/
    │   ├── layout.tsx, globals.css
    │   ├── api/chat/route.ts              ← B.16 + Session 11 backtick fix
    │   ├── (dashboard)/                   ← C.1 route group
    │   │   ├── layout.tsx, loading.tsx, error.tsx, not-found.tsx
    │   │   ├── dashboard/page.tsx
    │   │   ├── trip/{page,loading,[id]/page,[id]/loading}.tsx
    │   │   ├── profile/{page,loading,actions,bookings/page}.tsx
    │   │   ├── explore/
    │   │   │   ├── page.tsx               ← Session 13 followup: Promise.all fetches articles + socialVideos + travelerStories
    │   │   │   ├── loading.tsx
    │   │   │   ├── quiz/page.tsx
    │   │   │   └── articles/[slug]/{page,loading}.tsx  ← Sanity-first article reader
    │   │   ├── hotels/[id]/{page,loading}.tsx          ← Session 12
    │   │   ├── activities/[id]/{page,loading}.tsx      ← Session 12
    │   │   ├── restaurants/[id]/{page,loading}.tsx     ← Session 12
    │   │   └── checkout/{page,loading,success/page}.tsx
    │   ├── dashboard/chat/page.tsx        ← Standalone chat
    │   ├── explore/places/                ← Marketing route — outside group
    │   ├── deals/, destinations/, share/  ← marketing
    │   ├── guides/{page,[slug]/page}.tsx  ← marketing — Session 13: aligned to canonical Studio
    │   ├── login/, signup/, auth/, onboarding/
    │   ├── opengraph-image.tsx, robots.ts, sitemap.ts
    │   └── page.tsx                       ← marketing landing
    │
    ├── components/
    │   ├── ui/                            ← 8 primitives + Skeleton
    │   ├── dashboard/                     ← DashboardShell, Sidebar, ChatPanel
    │   ├── detail/                        ← Session 12: BackLink + PlanWithBuddyCTA
    │   ├── home/                          ← BuddyPickCard + TravelTipCard (Sanity-aware)
    │   ├── profile/ProfileForm.tsx
    │   ├── explore/ExploreTabs.tsx        ← Session 13 follow-up: props-driven, supports avatar images
    │   ├── checkout/CheckoutForm.tsx
    │   ├── PortableTextBody.tsx           ← Renders Sanity Portable Text
    │   ├── RichCards.tsx                  ← Session 12: place_id + Link-wrapped
    │   └── (other widgets)
    ├── hooks/useTripRealtime.ts
    ├── lib/
    │   ├── baha-images.ts, adaptive-chips.ts, chat-utils.ts,
    │   ├── derive-user-state.ts, profile-options.ts
    │   ├── chat-tools.ts                  ← Session 12: cards carry place_id
    │   ├── article-content.ts             ← Session 12: 6 hardcoded article bodies (fallback)
    │   ├── sanity/                        ← Session 13: rewritten
    │   │   ├── README.md                  ← Points at top-level studio/
    │   │   ├── client.ts
    │   │   ├── queries.ts                 ← Session 13 follow-up: +fetchSocialVideos, +fetchTravelerStories
    │   │   ├── types.ts                   ← Session 13 follow-up: +SanitySocialVideo, +SanityTravelerStory, VIDEO_ACCENT_GRADIENT, PARTY_TYPE_TONE
    │   │   └── schemas.deprecated/        ← Old placeholder schemas — DO NOT USE
    │   ├── stripe/{client,edge-function}.ts
    │   └── supabase/{client,server}.ts
    └── types/database.ts
```

Outside `bahabuddy-web/`, but newly relevant:

```
/Baha Buddy/
├── studio/                                ← Canonical for schemas (project 593u37vh)
│   ├── sanity.config.ts, sanity.cli.ts
│   └── schemas/
│       ├── index.ts                       ← Session 13 follow-up: grouped registry with docstring
│       ├── article.ts                     ← Long-form editorial with Portable Text body
│       ├── tip.ts                         ← Short tips, 8 categories
│       ├── deal.ts                        ← Limited-time offers with discount math
│       ├── destination.ts                 ← Island profiles (pairs with Supabase islands)
│       ├── experience.ts                  ← Curated things-to-do
│       ├── socialVideo.ts                 ← Session 13 follow-up NEW: TikTok/Instagram/YouTube cards
│       ├── travelerStory.ts               ← Session 13 follow-up NEW: testimonial cards
│       └── siteSettings.ts                ← Site-wide singleton
└── Baha-Buddy-V2/
    ├── lib/core/services/sanity_service.dart   ← Session 13: GROQ projections aliased. Follow-up: deal query uses validFrom desc
    └── supabase/functions/sanity-proxy/index.ts  ← Session 13 follow-up: mutation-safety regex tightened
```

---

## Pending P0 items (Valdez)

| Item | Owner | Action |
|---|---|---|
| **Deploy `sanity-proxy` Edge Function** | Valdez | `cd Baha-Buddy-V2 && supabase functions deploy sanity-proxy --project-ref cxcfymhoncysyloutvkh` |
| **`npm install --legacy-peer-deps`** | Valdez | Session 11 added `@sanity/client` as a direct dep |
| **`npm run build`** | Valdez | Sessions 11+12+13+followup should all be clear |
| **Set `NEXT_PUBLIC_SANITY_PROJECT_ID=593u37vh`** | Valdez | In `.env.local` and Netlify env |
| **Launch Studio locally** | Valdez | `cd studio && npm install && npm run dev` |
| **Author test content** | Valdez | One each `article`, `tip`, `deal`, `socialVideo`, `travelerStory` |
| **Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** | Valdez | Without it: graceful "not configured" screen |
| **Verify Stripe webhook URL** | Valdez | `https://cxcfymhoncysyloutvkh.supabase.co/functions/v1/stripe-webhook` |
| **Run `supabase/enable_trip_realtime.sql`** | Valdez | Idempotent |
| **Set `DUFFEL_API_TOKEN`** on web | Valdez | Graceful degradation when absent |
| **Supabase Service Role Key rotation** | Valdez | Pre-existing P0 |
| **Anthropic API key rotation** | Valdez | Pre-existing P0 |
| **Domain-restrict Google Maps API key** | Valdez | Pre-existing P0 |
| **Clean up empty route-group leftover dirs** | Valdez | `src/app/profile/`, `src/app/trip/`, `src/app/explore/quiz/`. Harmless |
| **Delete `src/lib/sanity/schemas.deprecated/`** | Valdez (later) | Keep until git history is sufficient |

---

## Architecture decisions

(Decisions 1–25 unchanged. See git history if you need to recover specifics.)

### 26. Chat vs Detail Page split (Session 12) — the "Read more" affordance

The mobile UX spec is explicit: every Explore card has both **"Read more"** (opens a detail view) and **"Plan this"** (opens chat with Buddy pre-loaded). The web shipped initially with only the chat funnel. Decision: cards in chat are previews → click goes to detail page; detail pages carry the chat affordance via the shared `PlanWithBuddyCTA` component.

Stable identifiers come from `google_places.place_id` for hotel/restaurant/activity, and from `islands.slug` for destinations. `chat-tools.ts` threads `place_id` from every tool result into card data. `FlightCard` is intentionally non-linking (Duffel offers expire). DestinationCard goes to marketing `/explore/places/[island]`.

Article reader at `/explore/articles/[slug]` replaces the chat-funnel from Explore Discover. Article content lives in `lib/article-content.ts` keyed by slug. Session 13 made this the **fallback** layer: Sanity content (when present) takes precedence.

### 27. Sanity Studio is canonical for schemas (Session 13) — alignment + alias pattern

For most of C.7's life, the web shipped with placeholder Sanity schemas defined inside the web app (`src/lib/sanity/schemas/`). When the actual Studio was created at `/Baha Buddy/studio/` (project `593u37vh`), its schemas were richer and didn't match what the web was querying. Mobile had a similar mismatch in field names. Session 13 made the Studio canonical and aligned both web and mobile to it.

The rules now:

- **Studio defines schemas, apps consume.** Top-level `studio/` is the single source of truth.
- **When field names don't match what apps want, alias in the projection — don't rename the model.** Examples:
  - Studio `heroImage` → projection `"imageUrl": heroImage.asset->url`
  - Studio `destination` (reference) → projection `"island": destination->name`
- **The web's old placeholder schemas live in `src/lib/sanity/schemas.deprecated/`** as historical reference.
- **Graceful fallback stays.** Every fetch helper returns `T | null`. Null means "Sanity unavailable or empty" and triggers the hardcoded fallback. Non-negotiable.
- **Article reader prefers Sanity body, falls back to `lib/article-content.ts`** (C.7b complete).
- **`generateStaticParams` takes the union of both sources** so either authoring path produces a valid URL at build time.

**Session 13 follow-up extensions to this decision:**

- **Two new schemas added to Studio:** `socialVideo` and `travelerStory` give editors a curation path for the Explore Community tab. Web has new types + queries + UI wiring that consumes them. Hardcoded fallback in ExploreTabs stays (each surface falls back independently).
- **`sanity-proxy` Edge Function mutation-safety hardened.** The original substring-based mutation check rejected legitimate read queries containing `_createdAt` (system field contains the substring "create"). Rewritten as a word-boundary regex `\b(create|patch|delete|replace)\s*\(` that matches actual GROQ mutation function calls. Defense-in-depth on top of Sanity's own endpoint enforcement.
- **Mobile defensive ordering.** Even with the proxy fix, mobile's deal query was switched from `order(_createdAt desc)` to `order(validFrom desc)` — safer against any deploy lag where the old proxy is still live, and `validFrom` is also more semantically correct ("newest valid deal first" matches user intent better than "newest document first").

---

## Session log

(Sessions 1–11 unchanged. See CHANGELOG.md for specifics.)

### Session 12 — Detail-page architecture (C.11 new scope)
Closed the "every tap goes to chat" gap. 4 new detail routes (articles/hotels/activities/restaurants), `RichCards` rewired with `<Link>` wrappers, `ExploreTabs` cards link to article reader. See decision #26.

### Session 13 — Sanity alignment + Community port (C.12 new scope)
Two parallel tracks. Track A: aligned web + mobile to canonical Studio at `/Baha Buddy/studio/`. Track B: ported mobile's Community tab content to web. See decision #27.

### Session 13 follow-up — Edge Function hardening + Community schemas
Audited `sanity-proxy` to verify the mobile-alias approach. Caught and fixed a latent substring-match bug in the mutation-safety check. Added `socialVideo` + `travelerStory` Studio schemas. Web types + queries extended; ExploreTabs refactored to receive Community content as props (Sanity-first with hardcoded fallback). TravelerStoryCard now supports avatar images.

---

## Verification checklist (post-Session 13 follow-up)

Build:
- [ ] `cd Baha-Buddy-V2 && supabase functions deploy sanity-proxy --project-ref cxcfymhoncysyloutvkh`
- [ ] `cd bahabuddy-web && npm install --legacy-peer-deps`
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

Sanity smoke tests:
- [ ] Web boots **without** `NEXT_PUBLIC_SANITY_PROJECT_ID` → all fallbacks render
- [ ] Set `NEXT_PUBLIC_SANITY_PROJECT_ID=593u37vh` with empty Studio → still falls back gracefully
- [ ] `cd studio && npm install && npm run dev` opens http://localhost:3333
- [ ] Publish one `tip` with `category: weather, featured: true` → home `TravelTipCard` shows it with seasonal tone
- [ ] Publish one `article` with Portable Text body → appears on `/explore`; click renders via `<PortableTextBody>`
- [ ] Publish one `socialVideo` → replaces fallback video list on `/explore` Community
- [ ] Publish one `travelerStory` with avatar → renders image avatar
- [ ] Publish one `travelerStory` without avatar → renders initial circle

Edge Function:
- [ ] After deploy: trigger mobile `fetchDeals` / `fetchTips` / `fetchArticles` and verify no `Mutations are not allowed` 400

Detail-page smoke tests (Session 12, still valid):
- [ ] Visit `/explore/articles/pink-sand-harbour-island` → article renders
- [ ] Plan via chat → click hotel/activity/restaurant card → detail page loads
- [ ] `/hotels/INVALID_ID` → renders 404 inside shell

Environment (carried from Session 10):
- [ ] `enable_trip_realtime.sql` run
- [ ] `DUFFEL_API_TOKEN`, `ANTHROPIC_API_KEY` set
- [ ] Stripe OFF / ON paths still work

Performance (after build is green):
- [ ] Execute `bahabuddy-web/PERF-AUDIT.md` § 1

---

## What's NOT done (and why)

### Deferred (not blocking MVP)
- **Editor-curated `buddyPrompt` per article** — derived from title for now
- **Real social video embeds** — Trending Videos use stable BahaImages thumbnails with decorative play affordance; TikTok/Instagram oEmbed is a later phase
- **C.8 Global search** — chat IS the search
- **D.7b next/image for RichCards + detail page heroes** — variable photo-CDN domains need careful remotePatterns expansion

### Pending (executable post-build)
- **D.10 Performance audit** — playbook ready at `PERF-AUDIT.md`. Now includes Session 13 follow-up's Sanity-rendered Community surface in route-level analysis

### Future hardening (not part of this scope)
- Server-side amount derivation for checkout
- Stripe webhook signature verification refresh
- Sentry / OpenTelemetry instrumentation
- E2E tests for booking flow (Playwright)
- Bundle splitting for chat panel
- **Island detail page parity** — currently DestinationCard links to marketing `/explore/places/[island]`. A dashboard-shell `/(dashboard)/islands/[id]` would persist the chat panel

---

## Next session preview

If `npm run build` is green:
1. Deploy `sanity-proxy` with the new regex
2. Set `NEXT_PUBLIC_SANITY_PROJECT_ID=593u37vh`, launch Studio, publish test content (including socialVideo + travelerStory)
3. Verify both web and mobile pick everything up
4. Run `PERF-AUDIT.md` § 1–2 baselines (now includes Session 13 follow-up surfaces)
5. Mark D.10 ✅
6. Done with Phase A-D web parity + chat-vs-detail split + Sanity alignment + Community curation. Ready for production.

If `npm run build` fails:
1. Paste errors
2. Most likely issues now: stale type import from old Sanity names somewhere I missed, or a Tailwind class on the Community tab that needs a real screen test
3. Patch, re-build, proceed
