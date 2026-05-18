# Sanity CMS — Baha Buddy editorial content (web consumer)

This directory is the **read-only Sanity client** for the web app. The actual content schemas, editing UI, and editorial workflow live in a separate Sanity Studio at the top of the monorepo:

```
/Baha Buddy/
├── studio/                ← Sanity Studio (where editors author content)
│   ├── sanity.config.ts   ← projectId: 593u37vh, dataset: production
│   └── schemas/           ← Canonical schema definitions
└── bahabuddy-web/
    └── src/lib/sanity/    ← This folder — read-only client + queries
```

The web app queries published content from Sanity's CDN. The mobile app at `Baha-Buddy-V2` does the same (via a `sanity-proxy` Supabase Edge Function so the project ID is server-side).

## Status (Session 13 — aligned)

Five content types are wired end-to-end with **hardcoded fallbacks** so the app keeps working before Studio has content:

| Content type      | Web consumer                                                | Fallback location                                |
|-------------------|-------------------------------------------------------------|--------------------------------------------------|
| `article`         | `/explore` Discover grid + `/explore/articles/[slug]` reader | `(dashboard)/explore/page.tsx` + `lib/article-content.ts` |
| `article` (featured) | `<BuddyPickCard>` on the home dashboard                   | `BuddyPickCard.tsx` (4 entries)                  |
| `tip`             | `<TravelTipCard>` on the home dashboard                     | `TravelTipCard.tsx` (8 entries)                  |
| `deal`            | _(reserved — not yet on a live surface)_                    | n/a                                              |
| `destination`     | _(reserved — `/explore/places/[island]` will join with Supabase)_ | n/a                                        |
| `experience`      | _(reserved — Explore expansion in a future phase)_          | n/a                                              |
| `siteSettings`    | _(reserved — marketing chrome)_                              | n/a                                              |

The home cards use deterministic rotation (ISO-week for Buddy's Pick, day-of-year for Travel Tip) regardless of source — every user sees the same content on the same day.

## How to enable Sanity

1. **Stand up the Studio locally** (one-time):
   ```bash
   cd "/Users/ShowmanIT/Downloads/Novio Group/Baha Buddy/studio"
   npm install
   npm run dev
   ```
   Open http://localhost:3333 to author content.

2. **Set env vars** in `bahabuddy-web/.env.local` and on Netlify:
   ```bash
   NEXT_PUBLIC_SANITY_PROJECT_ID=593u37vh
   NEXT_PUBLIC_SANITY_DATASET=production
   NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
   ```
   Without `NEXT_PUBLIC_SANITY_PROJECT_ID`, every Sanity query returns `null` and the hardcoded fallbacks take over — the app keeps working.

3. **Author content** in the Studio. As soon as published documents exist, they replace the hardcoded fallbacks on the next page render (5-minute revalidation window).

## Files

- `client.ts` — read-only client + `isSanityConfigured` flag + `safeFetch` wrapper that returns null on missing config or fetch failure
- `queries.ts` — GROQ queries + typed fetch helpers (`fetchArticles`, `fetchFeaturedArticles`, `fetchArticleBySlug`, `fetchAllArticleSlugs`, `fetchTips`, `fetchActiveDeals`, `fetchDestinations`, `fetchDestinationByIsland`, `fetchExperiences`, `fetchSiteSettings`)
- `types.ts` — TypeScript shapes that mirror the Studio document types, plus the 8→3 tip-category-to-tone mapping
- `schemas.deprecated/` — old placeholder schemas from the C.7 phase, **do not use**

## Schema rules of thumb

Use the right type for the right surface:

- **`article`** — long-form editorial. Has a Portable Text body. Cards on Explore + full reader at `/explore/articles/[slug]`. Featured articles also rotate through Buddy's Pick.
- **`tip`** — short text tip with one of 8 categories. Categories map to 3 visual tones via `TIP_CATEGORY_TONE`.
- **`deal`** — limited-time offer with discount math and an external CTA.
- **`destination`** — island profile pairs with Supabase `islands.slug` via the `islandId` field. Has overview Portable Text, highlights, and a gallery.
- **`experience`** — curated things-to-do. Distinct from chat-tool Activities, which are live database queries.
- **`siteSettings`** — singleton for site-wide chrome (hero, social links, app store URLs, announcement bar).

## Why graceful fallbacks matter

Editorial content is high-frequency change, but the *code* shouldn't be coupled to it. Hardcoded fallbacks let you:

- Deploy the web app before Sanity is connected
- Run integration tests without a live Sanity dependency
- Survive Sanity downtime without breaking the home dashboard

Don't remove the fallbacks even when the Studio is fully populated.
