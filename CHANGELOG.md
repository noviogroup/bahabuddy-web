# Baha Buddy Web — Changelog

> **Historical session log.** Current launch status lives in the root go-live command center.

Session-by-session record of changes to `bahabuddy-web/`. Newest first.

For task-level status tracking, see `WORKPLAN.md`. For architecture, see `PROGRESS.md`. For the performance pass that's still to run, see `PERF-AUDIT.md`.

---

## Session 13 follow-up — Edge Function hardening + Community schemas

**Status:** Extends Session 13 below. After the initial port shipped, two follow-ups closed remaining gaps.

**Why the follow-up:** Reading the `sanity-proxy` Edge Function to verify the Session 13 mobile-alias approach revealed a latent bug — the proxy's mutation-safety check used substring matching that would falsely flag the system field `_createdAt` (contains "create") whenever paired with `(` elsewhere in the query. My Session 13 mobile deal query used `order(_createdAt desc)` and would have been rejected before reaching Sanity. Fix in two places: tighten the proxy regex, and switch the mobile query to a safer ordering field.

Separately, Session 13's Community port shipped with hardcoded videos and stories. That's fine as a v1, but editors had no path to curate. Added `socialVideo` and `travelerStory` Studio schemas plus matching web queries/types and an ExploreTabs refactor to receive them as props. Hardcoded fallbacks stay (decision §6 — graceful degradation always).

### Code — sanity-proxy + mobile

**`Baha-Buddy-V2/supabase/functions/sanity-proxy/index.ts`** — mutation-safety check rewritten
- Old check: substring match on `'create'` + `'('`, plus standalone substring matches on `'patch'`, `'delete'`, `'replace'`. Trips on legitimate field names that contain those keywords as substrings.
- New check: a single regex `\b(createIfNotExists|createOrReplace|create|patch|delete|replace)\s*\(`. Word boundary prevents false positives on `_createdAt`, `patches`, `deleted`, etc.
- Sanity itself rejects mutation-shaped requests to the `/query/` endpoint, so this is defense-in-depth. The new check is strictly tighter than the old — no read queries that previously passed will now fail.
- File header expanded to document the rewrite.
- **Requires redeploy:** `supabase functions deploy sanity-proxy --project-ref cxcfymhoncysyloutvkh`.

**`Baha-Buddy-V2/lib/core/services/sanity_service.dart`** — deal query ordering
- Deal query changed from `order(_createdAt desc)` to `order(validFrom desc)`. Two reasons:
  - Defensive against any deploy lag where the old proxy is still live.
  - `validFrom` is also more semantically correct — "newest valid deals first" matches user intent better than "newest created documents first" (editors often update deals long after creation).
- File header expanded with a "Proxy quirk worth knowing" note that documents the new regex and the defensive ordering choice.

### Code — Studio schemas

**`studio/schemas/socialVideo.ts`** (new) — editor-curated TikTok/Instagram/YouTube cards
- Fields: `title`, `creator` (handle with `@` prefix, validated), `platform` (radio: tiktok/instagram/youtube), `thumbnailImage` (with alt), `videoUrl` (https-only URL), `viewsLabel` (display-ready string like "2.3M views"), `accentTone` (radio: sky/coral/amber/brand — drives the dark gradient overlay color), `buddyPrompt` (text), `destination` (optional ref), `featured`, `order`, `publishedAt`.
- Two orderings: "Manual order (featured first)" and "Most recent first".
- Validation: creator handle must start with `@`, buddyPrompt 15–200 chars, viewsLabel ≤20 chars.
- Preview shows `"TikTok · @creator"` as the subtitle.

**`studio/schemas/travelerStory.ts`** (new) — editor-curated testimonial cards
- Fields: `name`, `tripSummary` ("5 days in Exuma"), `quote` (20–280 char text), `partyType` (radio: solo/couple/family/friends — drives the colored pill), `destination` (optional ref), `tripDurationDays` (optional int), `avatarImage` (optional — card falls back to first-initial circle when omitted), `featured`, `order`, `publishedAt`.
- Friends added as a fourth party-type for parity with mobile's planned expansion (Session 13 originally shipped only Solo/Couple/Family in hardcoded form).
- Preview shows `"Couple · 5 days in Exuma"` as the subtitle.

**`studio/schemas/index.ts`** — added both new schemas to the registry. Grouped logically (content / curation / commerce / **social** / configuration) with a docstring documenting the order.

### Code — Web alignment

**`src/lib/sanity/types.ts`** — extended with two new interfaces and several supporting exports
- `SanitySocialVideo` and `SanityTravelerStory` interfaces.
- Three new union types: `SanitySocialPlatform`, `SanityVideoAccent`, `SanityPartyType`.
- `SOCIAL_PLATFORM_LABEL` (lowercase → titlecase mapping for the platform pill).
- `VIDEO_ACCENT_GRADIENT` — single source of truth for the four Tailwind gradient class strings (sky/coral/amber/brand). Keeps the schema's accent enum and the UI's overlay colors in lockstep.
- `PARTY_TYPE_LABEL` (lowercase → titlecase).
- `PARTY_TYPE_TONE` — party enum → Tailwind background/text class for the pill (brand/coral/palm/gold).

**`src/lib/sanity/queries.ts`** — added `fetchSocialVideos` and `fetchTravelerStories`
- Both projections alias `thumbnailImage.asset->url` → `imageUrl` and `avatarImage.asset->url` → `avatarUrl`, alias `destination->name` → `destinationName`, default missing `featured` and `order` to false/99 via `coalesce`.
- Both order by `featured desc, order asc, publishedAt desc` — featured items first, then manual order, then recency tiebreaker.
- Both return `T[] | null` matching the existing fetcher contract.

**`src/app/(dashboard)/explore/page.tsx`** — fetches all three Sanity surfaces in parallel
- `Promise.all([fetchArticles(), fetchSocialVideos(), fetchTravelerStories()])` so a slow Sanity response on one surface doesn't block the others' fallbacks.
- Maps Sanity → component-ready shape with hardcoded fallback per surface. Each surface's map is independent (one being null doesn't affect the others).
- Helpers `partyToneClass()` and `partyTypeLabel()` mirror what the previous hardcoded constants encoded inline.
- Passes `articles`, `socialVideos`, `travelerStories` as separate props to ExploreTabs.

**`src/components/explore/ExploreTabs.tsx`** — refactored to accept videos/stories as props
- New exported interfaces: `SocialVideo` and `TravelerStory`. Both pre-resolved (no enum-to-class lookup happens in the client component).
- `SocialVideoCard` now reads pre-resolved `platformLabel` + `viewsLabel` + `overlayClass` — the parent server page did the Sanity → Tailwind translation.
- `TravelerStoryCard` renders `next/image` avatar when `avatarUrl` is non-null, falls back to the first-initial circle otherwise. Both paths share the same outer card shell.
- Community tab gracefully hides empty sections — if Sanity returns zero videos AND zero stories, only the Share Your Trip panel renders. The previous version always rendered all three sections regardless of data.

### Why props-up-from-server, not client-side fetch in ExploreTabs

ExploreTabs is a client component (it manages tab state). Sanity fetches are server-side in the parent page. The pattern is identical to how Discover articles were already handled — keep the resolution layer (Sanity + fallback) in the server component, hand the client component a clean array. This avoids:
- Shipping the `@sanity/client` library to the browser bundle.
- Loading states on tab switch (data is already there).
- Auth/CDN config bleeding to the client.

### Action items for Valdez

1. **Deploy the updated Edge Function:**
   ```
   cd "/Users/ShowmanIT/Downloads/Novio Group/Baha Buddy/Baha-Buddy-V2"
   supabase functions deploy sanity-proxy --project-ref cxcfymhoncysyloutvkh
   ```
2. **Build the web:** `cd bahabuddy-web && npm install --legacy-peer-deps && npm run build` to verify both Session 13 and this follow-up compile.
3. **Author test content** in Studio: one `socialVideo` (use any Bahamas image, pick a tone, set `viewsLabel: "500K views"`, write a `buddyPrompt`) and one `travelerStory` (pick a party type, write a quote, optionally upload an avatar). Both should appear on `/explore` Community within 5 minutes.

### Verification (smoke tests for the follow-up)

- [ ] Edge Function: after redeploy, mobile providers still receive deal/tip/article responses. Spot-check: trigger `fetchDeals`/`fetchTips`/`fetchArticles` and verify no `Mutations are not allowed` 400.
- [ ] Web: `/explore` Community tab — without any published Sanity content, fallback videos + stories render exactly as Session 13's initial port.
- [ ] Web: publish one `socialVideo` document → it replaces the fallback list on next page render (5-minute revalidation).
- [ ] Web: publish one `travelerStory` with `avatarImage` populated → card renders the image, not the initial circle.
- [ ] Web: publish one `travelerStory` without `avatarImage` → card renders the initial circle.
- [ ] Web: with zero published documents, the Community tab shows only fallbacks + Share panel — no broken sections.

---

## Session 13 — Sanity alignment + Community tab (port from mobile)

**Status:** Two parallel tracks shipped in one pass.

**Track A — Sanity alignment.** A real Sanity Studio was created at the monorepo root (`/Baha Buddy/studio/`, project `593u37vh`) with richer schemas than the web app's old placeholders. The web was querying document types that didn't exist in the live Studio (`buddyPick`, `travelTip`, `discoverArticle`) — so authored content would never have rendered. Aligned the web's queries and types to the Studio's canonical schemas: `article`, `tip`, `deal`, `destination`, `experience`, `siteSettings`. Mobile's GROQ projections (`Baha-Buddy-V2/lib/core/services/sanity_service.dart`) had similar field-name mismatches (`mainImage`/`readTime`/`isActive` instead of `heroImage`/`readTimeMinutes`/`active`) — fixed in-place via aliased projections so the Dart models didn't need to change.

**Track B — Community tab.** The web's Explore Community tab was a "coming soon" placeholder. Mobile has rich Community content (5 TikTok/Reels-style social videos, 3 traveler stories, share CTA). Ported the entire surface to web.

Both tracks were prerequisites for the same outcome: editors finally have a working Studio, web finally has feature parity with mobile on Explore.

### Code — Track A (Sanity)

**`src/lib/sanity/types.ts` — rewritten end-to-end**
- New types mirror the Studio's six document types: `SanityArticleCard`, `SanityArticleFull` (extends Card with `body`), `SanityTip`, `SanityDeal`, `SanityDestination`, `SanityExperience`, `SanitySiteSettings`.
- Plus three exported enum unions: `SanityArticleCategory` (6 values), `SanityTipCategory` (8 values), `SanityDealCategory` (6 values), `SanityExperienceCategory` (10 values), and a 4-value `priceRange` union.
- Two lookup tables exported for UI use:
  - `ARTICLE_CATEGORY_LABEL` — maps `travel_guide` → "Travel Guide", etc.
  - `TIP_CATEGORY_TONE` — maps Studio's 8 tip categories to the UI's 3 visual tones (`practical | cultural | seasonal`). Keeps editors thinking about content categories, not visual buckets.
- Removed: `SanityBuddyPick`, `SanityTravelTip`, `SanityDiscoverArticle` (placeholder types that didn't exist in the live Studio).

**`src/lib/sanity/queries.ts` — rewritten end-to-end**
- Shared GROQ projections defined as constants (`ARTICLE_CARD_PROJECTION`, `TIP_PROJECTION`, etc.) and composed into queries. Reduces drift between e.g. "list articles" and "fetch by slug" projections.
- All queries exclude `path("drafts.**")` so we only surface published documents.
- Every projection aliases Studio field names to client-friendly shapes (e.g. `"imageUrl": heroImage.asset->url`, `"destinationName": destination->name`).
- Exported fetchers: `fetchArticles`, `fetchFeaturedArticles`, `fetchArticleBySlug`, `fetchAllArticleSlugs`, `fetchTips`, `fetchFeaturedTips`, `fetchActiveDeals`, `fetchDestinations`, `fetchFeaturedDestinations`, `fetchDestinationByIsland`, `fetchExperiences`, `fetchFeaturedExperiences`, `fetchSiteSettings`. Every fetcher returns `T | null` (or `[]` for `fetchAllArticleSlugs`); null means "Sanity unavailable, use fallback".
- Removed: `fetchBuddyPicks`, `fetchTravelTips`, `fetchDiscoverArticles`, `fetchDiscoverArticleBySlug` (consumed by the old placeholder types).

**`src/components/home/BuddyPickCard.tsx` — sources from featured articles**
- The Studio doesn't have a dedicated "BuddyPick" content type. The equivalent editor workflow is to flip `featured: true` on an Article. The card now pulls from `fetchFeaturedArticles()` and rotates by ISO week.
- When a featured Sanity article is the pick, the card links to `/explore/articles/[slug]` (the reader page). When the fallback pool is in play, the click still opens chat with a pre-filled prompt, since fallback picks have no article body.
- Fallback list of 4 picks unchanged.

**`src/components/home/TravelTipCard.tsx` — switched to Studio `tip` type with category mapping**
- Uses `fetchTips()` for the source pool.
- Maps Studio's 8 categories to the 3 visual tones via `TIP_CATEGORY_TONE` (e.g. `safety` → `practical`, `culture_etiquette` → `cultural`, `weather` → `seasonal`). Defaults to `practical` when a tip has no category set.
- Day-of-year rotation preserved.
- Fallback 8 tips unchanged.

**`src/app/(dashboard)/explore/page.tsx` — Discover sources from `fetchArticles()`**
- Maps `SanityArticleCard.category` (enum) → display label via `ARTICLE_CATEGORY_LABEL`. Unknown enum values pass through as-is so editors can add new categories in the schema without code edits.
- `readTimeMinutes` (number) formatted to `"7 min"` string by `formatReadTime()` helper. Defaults to "5 min" when null.
- `buddyPrompt` derived from `Tell me more about ${title}` since the Studio's `article` schema has no dedicated prompt field. (Future Studio extension: add a `buddyPrompt` field for editor-curated prompts.)
- Fallback 6 hardcoded articles unchanged.

**`src/app/(dashboard)/explore/articles/[slug]/page.tsx` — Sanity-first article reader (closes C.7b)**
- `revalidate = 300` (was `force-static`). Newly-published articles appear within 5 minutes without a deploy.
- `generateStaticParams` now takes the **union** of Sanity slugs and the hardcoded slugs, so either authoring path produces a valid URL.
- Page handler tries `fetchArticleBySlug(slug)` first. If a published Sanity article exists with a Portable Text body, renders via `<PortableTextBody>` (the existing component from Session 12 — already installed). Otherwise falls through to the hardcoded `getArticle()` lookup. 404 if neither has the slug.
- Render extracted into helper components: `<ArticleBackLink>`, `<ArticleFooterLink>`, `<PlanWithBuddyPanel>` — both rendering paths reuse them.
- `generateMetadata` also tries Sanity first (richer OG metadata when available).

**`src/lib/sanity/schemas/` → `src/lib/sanity/schemas.deprecated/`**
- The web's placeholder schema definitions (`buddyPick.ts`, `travelTip.ts`, `discoverArticle.ts`, `index.ts`) moved out of the active path. README inside marks them deprecated and points at the canonical Studio location.
- Kept (rather than deleted) as reference until the git diff is sufficient to recover them. Safe to delete in a future cleanup.

**`src/lib/sanity/README.md` — rewritten**
- Documents the actual architecture: top-level Studio (`/Baha Buddy/studio/`, project `593u37vh`) authors content; web's `lib/sanity/` is the read-only consumer; mobile's `sanity_service.dart` is the parallel consumer.
- Lists which content types power which surfaces.
- Documents the graceful-fallback contract and why it stays even after Studio is populated.

### Code — Track A (mobile)

**`Baha-Buddy-V2/lib/core/services/sanity_service.dart` — GROQ projections aligned to Studio**
- Article query: `mainImage.asset->url` → `heroImage.asset->url`; `"readTimeMinutes": readTime` → `readTimeMinutes` (Studio field is already named that).
- Tip query: bare `island` → `"island": destination->name` (Studio normalizes destinations as references, web mirrors this).
- Deal query: `isActive == true` → `active == true`; `mainImage` → `heroImage`; `island` → `destination->name`; `priceLabel` → `ctaLabel`.
- All queries now exclude `path("drafts.**")` so we don't surface draft documents to mobile users.
- Dart models (`SanityArticle`, `SanityTip`, `SanityDeal`) intentionally **unchanged** — projections alias the new Studio field names back to the model's expected shape, so no consumer of these models needs to update.
- File header rewritten to document the alignment.

### Code — Track B (Community tab)

**`src/components/explore/ExploreTabs.tsx` — Community tab built out**
- `CommunityPlaceholder` removed.
- New `CommunityContent` component renders three sections, mirroring mobile's `_CommunityContent`:
  - **Trending Videos** — 5 social video cards (TikTok + Instagram mix). Each card: 180×240 on mobile (horizontal scroll), responsive grid 2-up/3-up on `sm:`/`lg:`. Background image (BahaImages photography), tone-variant gradient overlay, decorative play-button affordance, platform badge + view count + title + creator handle, and a white "Plan this" pill that links to `/dashboard/chat?q=...` with a contextual prompt.
  - **Traveler Stories** — 3 testimonial cards. Avatar initial in a circle, name, trip duration, party-type pill (Solo → brand, Couple → coral, Family → palm), italic blockquote.
  - **Share Your Trip** — CTA panel with a disabled "Upload Content · Soon" button. Mirrors mobile's no-op state for UGC upload, which is reserved for a later phase.
- Thumbnail strategy: mobile uses `encrypted-tbn0.gstatic.com` placeholder URLs which are fragile on web (hotlink blocks, cache invalidation). Web swapped those for stable `BahaImages` photography URLs — same visual story, no broken images. When the real TikTok/Instagram oEmbed integration lands, the play affordance becomes interactive.
- Scrollbar hiding via arbitrary variants (`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`) instead of a Tailwind plugin — no config change needed.

### Documentation

- **`PROGRESS.md`** — Session 13 added to session log. File map updated to reflect deprecated schemas folder and the new Community content section. Architecture decision §27 added (Sanity canonical-Studio alignment + the field-name aliasing pattern).
- **`CHANGELOG.md`** (this file) — Session 13 entry at top.
- **`WORKPLAN.md`** — new C.12 section with the 7-task breakdown for the Sanity alignment + Community port. Counter updated.

### Why the Studio is canonical, not the web's old schemas

The Studio's schemas were authored with marketing-grade thoughtfulness: Articles have Portable Text bodies (enabling rich editing), Destinations have galleries and overview Portable Text, Experiences have price ranges and durations, Deals have proper discount math (discountPercent + dealPrice + originalPrice). The web's old placeholders were minimum-viable shapes designed for a single home-dashboard card each. The Studio also pairs naturally with the marketing surfaces (siteSettings for the hero, featuredDestinations etc.).

The cost of alignment was zero because the Studio is empty — no authored content to migrate. The cost of *not* aligning would have been: editors author rich content, none of it appears on the web, six weeks of debugging.

### Why the `island` field was aliased instead of renamed

The mobile Dart model `SanityTip` has an `island` field (a string). The Studio normalizes destinations as references (`destination: reference → destination`), which is the right data model — but the projection now aliases `destination->name` as `island` so the Dart model doesn't need to change. Same trick for `SanityDeal.island`. This is the projection pattern that lets the data shape evolve without coordinating mobile model migrations.

### Verification (smoke tests for Session 13)

After `npm run build` is green:

**Track A — Sanity**
- Web boots without `NEXT_PUBLIC_SANITY_PROJECT_ID` set → hardcoded fallbacks render (BuddyPick rotation, TravelTip rotation, 6 Discover articles). No errors.
- Set the env var to `593u37vh`. Studio has no content yet → still falls back gracefully (every fetcher returns null).
- Open `cd studio && npm run dev`, publish one `tip` document with `title`, `body`, `category: "weather"`, `featured: true` → next page render on `/dashboard` shows that tip in `TravelTipCard` (seasonal tone, mapped from `weather`).
- Publish one `article` document with all fields filled including a Portable Text `body` → `/explore` Discover grid shows the new article alongside the fallback. Click it → `/explore/articles/[slug]` renders the Portable Text body via `<PortableTextBody>`. Refresh → Sanity content still wins, hardcoded `lib/article-content.ts` is bypassed.

**Track B — Community**
- Visit `/explore`, toggle to Community → see 5 video cards in a horizontal scroller on mobile, 2/3-column grid on `sm:`/`lg:`. Each card has gradient overlay, play affordance, platform badge, view count, title, creator. Click "Plan this" → opens `/dashboard/chat` with the contextual prompt prefilled.
- Three traveler stories render below with correct party-type pill colors.
- "Upload Content · Soon" button shows disabled state with the "Soon" pill.
- Toggle back to Discover → article grid renders normally.

### Action items for Valdez

1. `npm install --legacy-peer-deps` then `npm run build` to verify the web still compiles.
2. Set `NEXT_PUBLIC_SANITY_PROJECT_ID=593u37vh` in `.env.local` + Netlify environment.
3. `cd "/Users/ShowmanIT/Downloads/Novio Group/Baha Buddy/studio" && npm install && npm run dev` to launch Studio at http://localhost:3333.
4. (Optional) Author one of each document type to verify both web and mobile render Studio content.
5. Decide whether the mobile `sanity-proxy` Edge Function needs a redeploy. The Dart-side projection changes are client-side — the Edge Function itself doesn't need updating unless it does anything beyond proxying the GROQ query string (verify by reading `Baha-Buddy-V2/supabase/functions/sanity-proxy/index.ts` — if it just forwards the query, no redeploy needed).

---

## Session 12 — Detail-page architecture (the chat-vs-detail split)

**Status:** New scope (C.11). Closed the "every tap goes to chat" UX gap. The mobile spec is explicit — every Explore card has both "Read more" (opens a detail view) and "Plan this" (opens chat with Buddy pre-loaded). The web shipped initially with only the chat funnel. Session 12 added the missing detail-page layer for articles, hotels, activities, and restaurants.

See `PROGRESS.md` § Architecture decision #26 for the full rationale.

### Code — new files

**Shared detail-page components** (`src/components/detail/`)
- **`PlanWithBuddyCTA.tsx`** — gradient panel rendered at the bottom of every detail page. Two CTAs both feeding `/dashboard/chat?q=...`:
  - "Ask Buddy about this" — opens chat with a question-style prompt
  - "Add to my trip" — opens chat with an itinerary-action prompt
  - Three copy variants by `kind`: `stay` (hotels), `experience` (activities, articles), `meal` (restaurants)
- **`BackLink.tsx`** — shared "← Back to …" link. Detail pages choose where back goes: hotels/activities/restaurants → `/dashboard/chat`; articles → `/explore`.

**Article content store** (`src/lib/article-content.ts`, new)
- Full bodies for all 6 Discover article slugs. Each article: `slug`, `title`, `subtitle`, `category`, `readTime`, `heroImage`, `intro` (lead paragraphs), `sections[{heading, body}]` (3-4 body sections), optional `callout`, `buddyPrompt`.
- Articles are ~500 words each, written for travelers who actually want to read about a place before planning.
- Slugs match the `FALLBACK_ARTICLES` in `/(dashboard)/explore/page.tsx`.

**Article reader** (`src/app/(dashboard)/explore/articles/[slug]/`)
- **`page.tsx`** — server component, `force-static` with `generateStaticParams` from `getAllArticleSlugs()`. `generateMetadata` for SEO (title, description, OG image from hero). Layout: back link, hero with `priority` for LCP, category + readtime pills, h1 + subtitle, intro prose, sections, optional callout aside, `PlanWithBuddyCTA` panel, footer nav. 404s via `notFound()` for unknown slugs.
- **`loading.tsx`** — Skeleton mirroring the article reader layout.

**Hotel / Activity / Restaurant detail** (`src/app/(dashboard)/{hotels,activities,restaurants}/[id]/`)
- Server components. Each reads Supabase cached/source place inventory with the right type filter. Hero, identifying metadata, "About …" prose section, type-specific chips (amenities / vibe tags / cuisine), and a `PlanWithBuddyCTA` panel. 404 inside the shell when the stable place id isn't found.

### Code — file updates

**`src/components/RichCards.tsx` — rewritten for the chat-vs-detail split**
- `CardData` exposes `place_id` (stable Baha Buddy place/source identifier) and `island_id` (kebab-case slug).
- New `CardShell` helper centralizes the "wrap in `<Link>` if href, else plain `<div>`" logic.
- HotelCard / RestaurantCard / ActivityCard each link to `/{type}/[place_id]`. DestinationCard links to `/explore/places/[island-slug]`. FlightCard intentionally non-linking.

**`src/lib/chat-tools.ts`** — getHotels / getRestaurants / getActivities thread `place_id` (and `island_id`) into card data.

**`src/components/explore/ExploreTabs.tsx`** — Discover cards link to article reader instead of pushing into chat. Footer text changed from "Ask Buddy about this →" to "Read article →".

---

## Session 11 — Build-failure recovery

**Status:** Two compile errors blocking `npm run build` after Session 10. Both fixed.

### Fix 1 — Unescaped triple-backticks in chat route system prompt

**File:** `src/app/api/chat/route.ts`. Three raw backticks inside a JS template literal terminated the literal mid-string. Fixed by escaping each (` \` ` × 3).

### Fix 2 — `next-sanity` dragged in `styled-components` via Visual Editing barrel

**Files:** `src/lib/sanity/client.ts`, `package.json`. Swapped to import `createClient` from `@sanity/client` directly. Pinned `@sanity/client@^7.22.0` in package.json as a direct dep.

---

## Session 10 — Final polish + documentation

**Status:** Phase C functionally complete. Phase D effectively complete (only D.10 perf audit remaining). **~52.5 / 53 tasks (~99%)**.

### Code

**D.9.7 — ChatPanel a11y.** Textarea label via useId(), message list as role=log, tool aria-live pill, thread switcher as role=menu.
**D.9.8 — ProfileForm a11y.** Party-type radiogroup with roving tabindex (arrow keys / Home / End), interest tags as toggle buttons.
**C.9.7 — Summary card → checkout.** SummaryCard CTA when tripId && total_cost && Stripe configured.
**C.6 — ConversationSidebar polish.** Skeleton loading, emoji empty state, nav landmark.

### Documentation

PERF-AUDIT.md (new), PROGRESS.md decisions §21–§25, CHANGELOG.md (new), WORKPLAN.md counter to 99%.

---

## Session 9 — D.9 a11y pass, batch 1 (6 components)

ShareButton, InviteCompanions (full disclosure), SignOutButton, Skeleton (motion-reduce), DashboardShell (both overlays as role=dialog + focus-on-open), Sidebar (nav landmark + aria-current + active-indicator positioning fix).

---

## Session 8 — Phase D foundation (D.1 → D.8)

Skeleton primitive. loading.tsx across 7 routes. error.tsx + not-found.tsx in `(dashboard)` group. next/image on HeroCard, TripCard, ExploreTabs articles, trip detail hero (with priority). next.config.mjs remotePatterns: cdn.sanity.io + **.supabase.co.

**Build fix:** BookingsList moved Booking type in-component to break stale import path.

---

## Session 7 — Phase C end-to-end (C.1 → C.10 + C.7 + C.9)

Route group migration. Trip detail rebuild + status badge taxonomy. Trip index with smart sort. Profile + server action + 10 interest tags. Explore Discover/Community. Sanity CMS read-only infra (Session 13 later aligned to canonical Studio). Stripe Elements end-to-end reusing mobile's `stripe-payment` + `stripe-webhook` Edge Functions unchanged. /profile/bookings + /explore/quiz migrated into route group.

---

## Sessions 1–6 — A.1 → B.16

Foundation work. Theme tokens, fonts, 7 UI primitives. Responsive dashboard shell. Home dashboard widgets. Chat panel with BuddyAvatar state machine. Native tool_use migration to Sonnet 4.5 with 9 tools. Realtime trip updates with debounced refresh.

---

## Conventions

- **Mobile is canonical.** Web mirrors mobile, doesn't reinvent. Schema, Edge Functions, auth, design language all shared.
- **Server components by default.** `'use client'` is the exception, applied only where state or browser APIs are needed.
- **Graceful degradation everywhere.** Stripe off → checkout shows friendly screen. Sanity off → hardcoded content. LiteAPI off → Buddy says live travel inventory is unavailable. No env var should crash the app.
- **A11y is part of done.** New components ship with focus rings, aria-labels, motion-reduce, role semantics. Old components get audited and lifted (D.9).
- **Comments document the why.** Headers explain choices that aren't obvious from the code. Hot spots (system prompt, model routing, agentic loop limits) link back to the mobile reference.
- **Chat is the action layer; detail pages are the content layer.** (Session 12 / decision §26.) Cards in chat are previews; clicking opens a detail page. Detail pages carry the chat handoff via the shared `PlanWithBuddyCTA` panel.
- **Sanity Studio is canonical for content schemas.** (Session 13 / decision §27.) Top-level `studio/` defines schemas; web's `src/lib/sanity/` and mobile's `sanity_service.dart` are read-only consumers. Field-name mismatches between app expectations and Studio fields are resolved with GROQ projection aliases, not model rewrites.

---

## Glossary

- **The shell** — `<DashboardShell>` in `src/components/dashboard/`. The responsive 3-column layout that wraps every authenticated route.
- **The route group** — `src/app/(dashboard)/`. Single layout, chat state persists.
- **The chat panel** — `<ChatPanel mode>` with two modes: `docked` (right rail or overlay) and `standalone` (full-screen `/dashboard/chat`).
- **The agentic loop** — the chat API's tool-use round-trip in `src/app/api/chat/route.ts`. Bounded by `MAX_TURNS=4` and `MAX_TOOL_CALLS=8`.
- **The detail layer** — Session 12 routes: `/explore/articles/[slug]`, `/hotels/[id]`, `/activities/[id]`, `/restaurants/[id]`. Content pages with `PlanWithBuddyCTA` panels that bridge back into chat.
- **Buddy** — the AI assistant. Persona defined in the system prompt. Avatar state machine: `idle` / `thinking` / `presenting` / `celebrating` / `listening` / `excited` / `greeting`.
- **The mobile Edge Functions** — `Baha-Buddy-V2/supabase/functions/`. Web's chat API in Next.js, but Stripe and Realtime piggyback on mobile's functions.
- **The Studio** — Sanity Studio at `/Baha Buddy/studio/`, project `593u37vh`. Where editors author content. Read-only consumers: web (`src/lib/sanity/`) and mobile (`sanity_service.dart` via `sanity-proxy` Edge Function).
