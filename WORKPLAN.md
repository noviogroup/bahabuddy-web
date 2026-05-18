# Baha Buddy Web Dashboard — Workplan

> Single source of truth for task status across Phases A–D + C.11 + C.12 of the web parity rebuild.
> Pairs with `PROGRESS.md` (architecture), `CHANGELOG.md` (session log), `PERF-AUDIT.md` (D.10 playbook), `README.md` (orientation).
>
> **Last updated: end of Session 13 follow-up** — Edge Function mutation-safety regex hardened, `socialVideo` + `travelerStory` Studio schemas authored, ExploreTabs refactored to receive Community content as props with Sanity-first + hardcoded fallback. Code on disk; build verification still owned by Valdez.

## Status legend

| Symbol | Meaning |
|---|---|
| ✅ | Done — code shipped |
| 🟡 | In progress / partial |
| ⏳ | Not started |
| 🔵 | Blocked on user action (Valdez owns) |
| ⏭ | Deferred — explicitly punted, see notes |
| ❌ | Won't do — see notes |

---

## Phase A — Foundation & Shell  (15 / 15 done)

| ID | Task | Status | Notes |
|---|---|---|---|
| A.1  | Port BahaTheme tokens to `tailwind.config.ts` | ✅ | brand/gold/coral/palm/sand/night with 50–900 scales |
| A.2  | Plus Jakarta Sans wired in root `layout.tsx` | ✅ | |
| A.3  | Brand CSS variables in `globals.css` | ✅ | |
| A.4  | Tempo CDN whitelisted in `next.config.mjs` | ✅ | for tambourine.com photo URLs |
| A.5  | `<BahaCard>` primitive | ✅ | |
| A.6  | `<HeroCard>` primitive | ✅ | image hero with badges + overlay variants |
| A.7  | `<PillButton>` primitive | ✅ | |
| A.8  | `<SegmentedToggle>` primitive | ✅ | sliding-pill animation, 2–4 options |
| A.9  | `<BuddyAvatar>` primitive | ✅ | SVG with 7 state names matching mobile |
| A.10 | `<SuggestionChip>` primitive | ✅ | |
| A.11 | `<EmptySlot>` primitive | ✅ | dotted-outline tappable empty slot |
| A.12 | `<Sidebar>` (responsive: 64/240/280px) | ✅ | D.9: aria-label, aria-current, focus rings |
| A.13 | `<ChatPanel>` (docked + standalone modes) | ✅ | D.9.7 a11y + C.9.7 wires savedTripId to RichCards |
| A.14 | `<DashboardShell>` (3-col + drawer + chat overlay) | ✅ | D.9.5: role=dialog + aria-modal + focus management on both overlays |
| A.15 | `<ConversationSidebar>` re-themed light | ✅ | C.6: Skeleton loading + emoji empty state. D.9: nav landmark + focus rings |

---

## Phase B — Home & Chat Polish  (16 / 16 done)

| ID | Task | Status | Notes |
|---|---|---|---|
| B.1  | `lib/baha-images.ts` photo catalog | ✅ | 16 photos + ISLANDS array |
| B.2  | `<GreetingStrip>` widget | ✅ | |
| B.3  | `<IslandExplorerRow>` widget | ✅ | horizontal scroll of 9 islands |
| B.4  | `<AdaptiveHeroCard>` widget | ✅ | 3 states via `deriveUserState()` |
| B.5  | `lib/derive-user-state.ts` | ✅ | new / planner / booked |
| B.6  | `<QuickActionsRow>` widget | ✅ | |
| B.7  | `<HomeCardCarousel>` widget | ✅ | |
| B.8  | `<BuddyPickCard>` widget | ✅ | C.7 / Session 13: sources from `fetchFeaturedArticles`, Studio canonical |
| B.9  | `<WeatherGlanceCard>` widget | ✅ | |
| B.10 | `<TravelTipCard>` widget | ✅ | C.7 / Session 13: sources from `fetchTips`, 8-category → 3-tone mapping |
| B.11 | `<MobileChatEntryBar>` widget | ✅ | |
| B.12 | `lib/adaptive-chips.ts` rule table | ✅ | suggestion chips |
| B.13 | `useTripRealtime` hook + `<TripRealtimeListener>` | ✅ | needs `enable_trip_realtime.sql` 🔵 |
| B.14 | Canonical mobile system prompt with cache_control | ✅ | `{{TODAY_DATE}}` / `{{CURRENT_YEAR}}` runtime substitution. Session 11: backtick escape fix |
| B.15 | BuddyAvatar state machine in ChatPanel | ✅ | |
| B.16 | Native tool_use migration (Sonnet 4.5 + 9 tools) | ✅ | MAX_TURNS=4, MAX_TOOL_CALLS=8. Session 12: cards carry `place_id` for detail-page links |

---

## Phase C — Trip Detail + Routes + Profile + Explore + Sanity + Stripe  (12 / ~12 done)

| ID | Task | Status | Notes |
|---|---|---|---|
| C.1  | Route group `(dashboard)/` migration | ✅ | Chat state persists across nav |
| C.2  | Trip detail page rebuild | ✅ | Status badge + segmented toggle + empty slots |
| C.3  | `/trip` index page + `<TripCard>` | ✅ | smart sort: active→booked→planned→draft→completed |
| C.4  | `/profile` page + `<ProfileForm>` + `updateProfile` server action | ✅ | `lib/profile-options.ts` PARTY_TYPES + 10 INTEREST_TAGS |
| C.5  | `/explore` Discover ↔ Community tabs | ✅ | Session 13: Community tab populated. Session 13 follow-up: now props-driven so Community is Sanity-first |
| C.6  | Empty-state polish audit | ✅ | All surfaces covered |
| C.7  | Sanity CMS prep — read-only client + schemas + 3 wired consumers | ✅ | Session 11: client.ts imports `@sanity/client` directly. Session 13: queries + types rewritten to match canonical Studio at `/Baha Buddy/studio/` |
| C.7b | `/explore/articles/[slug]` article pages with Portable Text | ✅ | **Closed in Session 13.** Article reader prefers Sanity `article.body` (Portable Text rendered via `<PortableTextBody>`) and falls back to hardcoded `lib/article-content.ts`. `generateStaticParams` takes union of both sources. `revalidate = 300` |
| C.8  | Global search in sidebar/header | ⏭ | Deferred — chat IS the search for current scope |
| C.9  | Stripe checkout end-to-end | ✅ | Reuses mobile's `stripe-payment` and `stripe-webhook` Edge Functions unchanged |
| C.10 | Migrate `/profile/bookings` + `/explore/quiz` into route group | ✅ | `/explore/places` intentionally kept outside as marketing |

**Phase C is complete.** C.7b closed in Session 13. C.8 remains explicitly deferred.

---

## Phase C.11 — Detail-page architecture  (6 / 6 done — Session 12 new scope)

> **Why this phase exists:** Mobile UX spec calls for "Read more" + "Plan this" on every Explore card. The web initially shipped with only the chat funnel — every clickable card sent users back into chat. Session 12 added the detail-page layer.

| ID | Task | Status | Notes |
|---|---|---|---|
| C.11.1 | `/explore/articles/[slug]` article reader route | ✅ | Session 13: switched to Sanity-first with `<PortableTextBody>` + `revalidate = 300`; hardcoded `lib/article-content.ts` is the fallback |
| C.11.2 | `/hotels/[id]` detail route | ✅ | `force-dynamic`. Queries `google_places` WHERE `place_id` AND `type IN ('lodging','hotel','resort')` |
| C.11.3 | `/activities/[id]` detail route | ✅ | Queries `google_places` for attraction-style types |
| C.11.4 | `/restaurants/[id]` detail route | ✅ | Queries `google_places` WHERE `type='restaurant'` |
| C.11.5 | RichCards rewiring — wrap clickable cards in `<Link>` | ✅ | `CardData` adds `place_id` + `island_id` |
| C.11.6 | ExploreTabs rewiring — Discover cards link to article reader | ✅ | Plain `<Link href="/explore/articles/[slug]">` |

---

## Phase C.12 — Sanity alignment + Community tab  (10 / 10 done — Session 13 + follow-up)

> **Why this phase exists:** A real Sanity Studio at `/Baha Buddy/studio/` (project `593u37vh`) was created with richer schemas than the web's placeholders. Aligned web + mobile to the canonical Studio (Track A). Ported mobile's Community tab content to web (Track B). See `PROGRESS.md` § decision #27.
>
> **Follow-up:** Edge Function mutation-safety check tightened (was rejecting legitimate `_createdAt` ordering); `socialVideo` + `travelerStory` Studio schemas authored; ExploreTabs refactored to receive Community content as props so it's Sanity-first with hardcoded fallback.

| ID | Task | Status | Notes |
|---|---|---|---|
| C.12.1 | Rewrite `src/lib/sanity/types.ts` to match Studio schemas | ✅ | All six Studio document types + enums + lookup tables |
| C.12.2 | Rewrite `src/lib/sanity/queries.ts` with aliased projections | ✅ | 13 fetchers, all exclude drafts, all alias Studio fields |
| C.12.3 | Update web consumers (BuddyPickCard, TravelTipCard, /explore page) | ✅ | `featured` article rotation; 8→3 category-to-tone mapping; readTime formatter |
| C.12.4 | Article reader: Sanity-first with hardcoded fallback | ✅ | `<PortableTextBody>` for Sanity, `lib/article-content.ts` for fallback. **Closes C.7b** |
| C.12.5 | Deprecate `src/lib/sanity/schemas/` (Studio is canonical) | ✅ | Moved to `src/lib/sanity/schemas.deprecated/` with README. README at `src/lib/sanity/README.md` rewritten |
| C.12.6 | Mobile alignment: fix GROQ field-name mismatches | ✅ | Projections aliased; Dart models unchanged; draft filtering added |
| C.12.7 | Port mobile Community tab content to web | ✅ | 5 videos + 3 stories + Share CTA |
| **C.12.8** | **Audit `sanity-proxy` Edge Function for pass-through correctness** | ✅ | Verified mostly pass-through. Caught latent bug: substring-based mutation check would reject `_createdAt`. Tightened to word-boundary regex `\b(create\|patch\|delete\|replace)\s*\(`. **Requires redeploy** 🔵 |
| **C.12.9** | **Author `socialVideo` + `travelerStory` Studio schemas** | ✅ | Both schemas at `studio/schemas/`, registered in `index.ts`. Mobile deal query also reordered to `validFrom desc` (defensive against deploy lag) |
| **C.12.10** | **Wire ExploreTabs to fetch Community content from Sanity with fallback** | ✅ | Web types + queries extended. Page does parallel `Promise.all` fetch + map per surface. ExploreTabs refactored to accept videos/stories as props. TravelerStoryCard supports `next/image` avatar with initial-circle fallback |

---

## Phase D — Polish + Performance + A11y  (9.5 / ~10 done)

| ID | Task | Status | Notes |
|---|---|---|---|
| D.1  | `<Skeleton>` primitive + barrel export | ✅ | `motion-reduce:animate-none` |
| D.2  | `loading.tsx` for `(dashboard)` root + `/trip` | ✅ | |
| D.3  | `loading.tsx` for `/trip/[id]` + `/checkout` | ✅ | |
| D.4  | `loading.tsx` for `/profile` + `/explore` | ✅ | |
| D.5  | `error.tsx` for `(dashboard)` group root | ✅ | |
| D.6  | `not-found.tsx` for `(dashboard)` group | ✅ | |
| D.7  | `next/image` conversion — high-traffic surfaces | ✅ | HeroCard, TripCard, ExploreTabs, trip detail hero. Session 12: article reader. Session 13: Community Trending Video cards. Session 13 follow-up: TravelerStory avatar |
| D.7b | `next/image` for RichCards photos + detail page heroes | ⏭ | Deferred — variable photo URL domains need careful remotePatterns expansion |
| D.8  | next.config.mjs remotePatterns includes cdn.sanity.io | ✅ | Used by Session 13 article rendering AND Session 13 follow-up's Studio-uploaded avatars/thumbnails |
| D.9  | Accessibility audit pass | ✅ | 9 components hardened |
| D.10 | Performance audit pass | ⏳ | **Playbook ready at `PERF-AUDIT.md`.** Run after `npm run build` is green. Include 4 C.11 routes + Session 13 Community surface + Session 13 follow-up's avatar image rendering |

---

## Documentation deliverables  (5 / 5 done)

| Doc | Purpose | Status |
|---|---|---|
| `README.md` | Project orientation, env vars, quick-start, common tasks | ✅ Session 10 |
| `PROGRESS.md` | Architecture of record — file map, decisions, session log | ✅ Session 13 follow-up |
| `WORKPLAN.md` | This file — task tracker | ✅ Session 13 follow-up (C.12.8–C.12.10 added) |
| `CHANGELOG.md` | Session-by-session log | ✅ Session 13 follow-up (entry prepended above Session 13) |
| `PERF-AUDIT.md` | D.10 playbook — bundle analyzer, Lighthouse, route budgets | ✅ Session 10 |

---

## Pre-existing P0 (blocked on Valdez)

| Item | Status | Action |
|---|---|---|
| **Deploy updated `sanity-proxy` Edge Function** | 🔵 | `cd "/Users/ShowmanIT/Downloads/Novio Group/Baha Buddy/Baha-Buddy-V2" && supabase functions deploy sanity-proxy --project-ref cxcfymhoncysyloutvkh`. Mobile defaults to `validFrom desc` ordering so it works against the old proxy too, but new schemas need the regex update for safety in the future |
| **Re-run `npm install --legacy-peer-deps`** | 🔵 | Session 11 added `@sanity/client@^7.22.0` as a direct dep |
| **Re-run `npm run build`** | 🔵 | Sessions 11+12+13 + Session 13 follow-up should all be clear |
| **Set `NEXT_PUBLIC_SANITY_PROJECT_ID=593u37vh`** | 🔵 | Required to read content from Studio. Without it, hardcoded fallbacks keep rendering |
| **Launch Studio locally** | 🔵 | `cd "/Users/ShowmanIT/Downloads/Novio Group/Baha Buddy/studio" && npm install && npm run dev` → http://localhost:3333 |
| **Author one each `socialVideo` + `travelerStory`** | 🔵 | Verify the Session 13 follow-up wiring end-to-end. Both should replace the fallback list on Community tab |
| Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` env var | 🔵 | Without it, /checkout shows "not configured" screen gracefully |
| Verify Stripe webhook URL still active in Stripe Dashboard | 🔵 | `https://cxcfymhoncysyloutvkh.supabase.co/functions/v1/stripe-webhook` |
| Run `supabase/enable_trip_realtime.sql` | 🔵 | Idempotent |
| Set `DUFFEL_API_TOKEN` env var | 🔵 | Without it, `search_flights` returns graceful "unavailable" |
| Rotate Supabase Service Role Key | 🔵 | Pre-existing P0 |
| Rotate Anthropic API key | 🔵 | Pre-existing P0 |
| Domain-restrict Google Maps API key | 🔵 | Pre-existing P0 |
| Clean up empty route-group leftover dirs | 🔵 | `src/app/profile/`, `src/app/trip/`, `src/app/explore/quiz/`. Harmless |
| Delete `src/lib/sanity/schemas.deprecated/` | 🔵 (later) | Keep until git history is sufficient |
| Update `BahaBuddy-Web-Dashboard-Workplan.xlsx` to match this file | 🔵 | Mechanical transcription |

---

## Final counter

- **A:** 15 / 15 ✅
- **B:** 16 / 16 ✅
- **C:** 12 / ~12 ✅ (C.7b closed in Session 13; C.8 explicitly out-of-scope)
- **C.11:** 6 / 6 ✅ (Session 12 — detail-page architecture)
- **C.12:** 10 / 10 ✅ (Session 13 + Session 13 follow-up — Sanity alignment + Community port + schemas + proxy hardening)
- **D:** 9.5 / ~10 (only D.10 perf audit remaining; playbook ready)
- **Docs:** 5 / 5 ✅

**~68.5 / ~69 ≈ 99%**

---

## What's left, ranked

1. **Deploy the `sanity-proxy` Edge Function update.** One supabase CLI command. Tightens mutation-safety regex.
2. **`npm install --legacy-peer-deps && npm run build`** — verify Sessions 11+12+13+followup all compile cleanly.
3. **Set `NEXT_PUBLIC_SANITY_PROJECT_ID=593u37vh`** + launch Studio + author test content. End-to-end Sanity smoke test across web + mobile.
4. **Smoke-test C.11 routes** (carried from Session 12) and Session 13's Community surface.
5. **D.10 Performance audit.** Needs a green `npm run build` first. Now includes Session 13 follow-up's Sanity-rendered Community surface.
6. **D.7b RichCards + detail-page heroes → `next/image`.** Low priority.
7. **Stripe + Realtime + Duffel env config.** Mechanical.
8. **xlsx workplan transcription.** Mechanical.

---

## Handoff state

This codebase is **production-ready pending Edge Function redeploy, build verification, environment configuration, and the D.10 perf pass**. All features land cleanly:

- Authenticated dashboard with chat, trips, profile, explore, bookings, checkout
- AI chat with native tool use (9 tools) on Claude Sonnet 4.5, streaming SSE, prompt caching
- End-to-end Stripe checkout from chat Summary card or trip detail page
- Editorial content via canonical Sanity Studio with hardcoded fallback. **Community tab fully Sanity-aware (Session 13 follow-up): socialVideo + travelerStory schemas curate-ready in Studio**
- Article reader supports both Portable Text from Sanity and hardcoded markdown-style sections (Session 13: C.7b closed)
- Realtime trip updates
- Phase 1 accessibility complete
- Skeleton loading states per route, error boundary, 404 inside shell
- Detail-page layer (Session 12): articles, hotels, activities, restaurants
- Edge Function mutation-safety hardened (Session 13 follow-up): word-boundary regex replaces brittle substring match

The next session should focus on:
1. Deploy updated `sanity-proxy` Edge Function
2. Verify the build is green
3. If green: set `NEXT_PUBLIC_SANITY_PROJECT_ID=593u37vh`, launch Studio, publish test content (including one socialVideo + one travelerStory to verify Session 13 follow-up), verify end-to-end
4. If green: execute `PERF-AUDIT.md` § 1–2 (baselines + bundle analyzer)
5. If not green: paste errors, patch, retry

Either way, the project is at a stable handoff point.
