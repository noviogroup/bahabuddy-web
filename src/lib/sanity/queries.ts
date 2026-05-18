/**
 * Sanity GROQ queries — aligned with the canonical Studio at
 * `/Baha Buddy/studio/schemas/` (projectId `593u37vh`).
 *
 * Session 13 rewrite: all queries now target the Studio's real document
 * types (`article`, `tip`, `deal`, `destination`, `experience`,
 * `siteSettings`). Earlier queries targeted placeholder types
 * (`buddyPick`, `travelTip`, `discoverArticle`) that didn't exist in
 * the live Studio — so authored content would never have rendered.
 *
 * Session 13 follow-up: added `socialVideo` + `travelerStory` queries
 * to back the Explore Community tab. Both have graceful fallback in
 * ExploreTabs to the hardcoded lists from the original Session 13
 * port.
 *
 * Pattern: each helper returns the typed result or null. Null signals
 * "Sanity unavailable or empty, use hardcoded fallback".
 *
 * Draft filtering: every query excludes `path("drafts.**")` so we only
 * surface published documents.
 */

import { safeFetch } from './client'
import type {
  SanityArticleCard,
  SanityArticleFull,
  SanityTip,
  SanityDeal,
  SanityDestination,
  SanityExperience,
  SanitySiteSettings,
  SanitySocialVideo,
  SanityTravelerStory,
} from './types'

// ─── Article ────────────────────────────────────────────────────────────────

const ARTICLE_CARD_PROJECTION = /* groq */ `
  _id,
  "slug": slug.current,
  title,
  excerpt,
  category,
  "imageUrl": heroImage.asset->url,
  readTimeMinutes,
  publishedAt,
  "featured": coalesce(featured, false)
`

const ARTICLES_QUERY = /* groq */ `
  *[_type == "article" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
    ${ARTICLE_CARD_PROJECTION}
  }
`

const FEATURED_ARTICLES_QUERY = /* groq */ `
  *[_type == "article" && featured == true && !(_id in path("drafts.**"))] | order(publishedAt desc) {
    ${ARTICLE_CARD_PROJECTION}
  }
`

const ARTICLE_BY_SLUG_QUERY = /* groq */ `
  *[_type == "article" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
    ${ARTICLE_CARD_PROJECTION},
    body
  }
`

const ALL_ARTICLE_SLUGS_QUERY = /* groq */ `
  *[_type == "article" && !(_id in path("drafts.**"))].slug.current
`

/**
 * List all published articles, newest first. Used by /explore Discover.
 */
export async function fetchArticles(): Promise<SanityArticleCard[] | null> {
  return safeFetch<SanityArticleCard[]>(ARTICLES_QUERY)
}

/**
 * Featured articles only. Used as the Buddy's Pick rotation source on
 * the home dashboard. Editors flip the `featured` boolean in Studio to
 * include an article in the rotation.
 */
export async function fetchFeaturedArticles(): Promise<SanityArticleCard[] | null> {
  return safeFetch<SanityArticleCard[]>(FEATURED_ARTICLES_QUERY)
}

/**
 * Full article (card fields + Portable Text body) by slug. Used by the
 * `/explore/articles/[slug]` reader. Returns null if not found.
 */
export async function fetchArticleBySlug(slug: string): Promise<SanityArticleFull | null> {
  return safeFetch<SanityArticleFull>(ARTICLE_BY_SLUG_QUERY, { slug })
}

/**
 * Every published article slug, for `generateStaticParams`. Returns an
 * empty array (never null) so consumers can call it unconditionally.
 */
export async function fetchAllArticleSlugs(): Promise<string[]> {
  const slugs = await safeFetch<string[]>(ALL_ARTICLE_SLUGS_QUERY)
  return slugs ?? []
}

// ─── Tip ────────────────────────────────────────────────────────────────────

const TIP_PROJECTION = /* groq */ `
  _id,
  title,
  body,
  category,
  "destinationName": destination->name,
  emoji,
  "featured": coalesce(featured, false)
`

const TIPS_QUERY = /* groq */ `
  *[_type == "tip" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
    ${TIP_PROJECTION}
  }
`

const FEATURED_TIPS_QUERY = /* groq */ `
  *[_type == "tip" && featured == true && !(_id in path("drafts.**"))] | order(publishedAt desc) {
    ${TIP_PROJECTION}
  }
`

/**
 * All published tips. Used as the home dashboard's TravelTipCard
 * rotation source.
 */
export async function fetchTips(): Promise<SanityTip[] | null> {
  return safeFetch<SanityTip[]>(TIPS_QUERY)
}

/**
 * Featured tips only. Reserved for editor-curated rotation when the
 * full tip pool gets large enough that a curated subset is preferred.
 * Today's TravelTipCard uses `fetchTips` — switch the fetcher when the
 * editorial bench grows.
 */
export async function fetchFeaturedTips(): Promise<SanityTip[] | null> {
  return safeFetch<SanityTip[]>(FEATURED_TIPS_QUERY)
}

// ─── Deal ───────────────────────────────────────────────────────────────────

const DEAL_PROJECTION = /* groq */ `
  _id,
  "slug": slug.current,
  title,
  "imageUrl": heroImage.asset->url,
  category,
  description,
  "destinationName": destination->name,
  discountPercent,
  originalPrice,
  dealPrice,
  "ctaLabel": coalesce(ctaLabel, "Book Now"),
  ctaUrl,
  validFrom,
  validUntil,
  "active": coalesce(active, false),
  "featured": coalesce(featured, false)
`

const ACTIVE_DEALS_QUERY = /* groq */ `
  *[_type == "deal" && active == true && !(_id in path("drafts.**"))] | order(_createdAt desc) {
    ${DEAL_PROJECTION}
  }
`

/**
 * All currently-active deals. Used on /explore/deals and as a card
 * surface on the home dashboard during active campaigns.
 *
 * Web queries Sanity directly via `@sanity/client` so the sanity-proxy
 * Edge Function's mutation-safety check doesn't apply here — we can
 * safely `order(_createdAt desc)`. Mobile orders by `validFrom desc`
 * for proxy-safety reasons; see `sanity_service.dart` for the
 * matching commentary.
 */
export async function fetchActiveDeals(): Promise<SanityDeal[] | null> {
  return safeFetch<SanityDeal[]>(ACTIVE_DEALS_QUERY)
}

// ─── Destination ────────────────────────────────────────────────────────────

const DESTINATION_PROJECTION = /* groq */ `
  _id,
  "slug": slug.current,
  name,
  islandId,
  "imageUrl": heroImage.asset->url,
  tagline,
  overview,
  "highlights": coalesce(highlights[]{ label, "icon": coalesce(icon, null) }, []),
  bestTimeToVisit,
  gettingThere,
  "gallery": coalesce(gallery[].asset->url, []),
  "featured": coalesce(featured, false),
  "order": coalesce(order, 99)
`

const DESTINATIONS_QUERY = /* groq */ `
  *[_type == "destination" && !(_id in path("drafts.**"))] | order(order asc, name asc) {
    ${DESTINATION_PROJECTION}
  }
`

const FEATURED_DESTINATIONS_QUERY = /* groq */ `
  *[_type == "destination" && featured == true && !(_id in path("drafts.**"))] | order(order asc) {
    ${DESTINATION_PROJECTION}
  }
`

const DESTINATION_BY_ISLAND_QUERY = /* groq */ `
  *[_type == "destination" && islandId == $islandId && !(_id in path("drafts.**"))][0] {
    ${DESTINATION_PROJECTION}
  }
`

export async function fetchDestinations(): Promise<SanityDestination[] | null> {
  return safeFetch<SanityDestination[]>(DESTINATIONS_QUERY)
}

export async function fetchFeaturedDestinations(): Promise<SanityDestination[] | null> {
  return safeFetch<SanityDestination[]>(FEATURED_DESTINATIONS_QUERY)
}

/**
 * Fetch a single destination by its Supabase island slug (e.g.
 * "nassau-paradise-island"). Used by /explore/places/[island] to merge
 * editorial overview with database-driven place lists.
 */
export async function fetchDestinationByIsland(islandId: string): Promise<SanityDestination | null> {
  return safeFetch<SanityDestination>(DESTINATION_BY_ISLAND_QUERY, { islandId })
}

// ─── Experience ─────────────────────────────────────────────────────────────

const EXPERIENCE_PROJECTION = /* groq */ `
  _id,
  "slug": slug.current,
  title,
  "imageUrl": heroImage.asset->url,
  category,
  "destinationName": destination->name,
  shortDescription,
  description,
  priceRange,
  durationHours,
  bookingUrl,
  "tips": coalesce(tips, []),
  "featured": coalesce(featured, false)
`

const EXPERIENCES_QUERY = /* groq */ `
  *[_type == "experience" && !(_id in path("drafts.**"))] | order(featured desc, title asc) {
    ${EXPERIENCE_PROJECTION}
  }
`

const FEATURED_EXPERIENCES_QUERY = /* groq */ `
  *[_type == "experience" && featured == true && !(_id in path("drafts.**"))] {
    ${EXPERIENCE_PROJECTION}
  }
`

export async function fetchExperiences(): Promise<SanityExperience[] | null> {
  return safeFetch<SanityExperience[]>(EXPERIENCES_QUERY)
}

export async function fetchFeaturedExperiences(): Promise<SanityExperience[] | null> {
  return safeFetch<SanityExperience[]>(FEATURED_EXPERIENCES_QUERY)
}

// ─── Site Settings ──────────────────────────────────────────────────────────

const SITE_SETTINGS_QUERY = /* groq */ `
  *[_type == "siteSettings"][0] {
    _id,
    heroHeadline,
    heroSubheadline,
    "heroImageUrl": heroImage.asset->url,
    "featuredDestinationSlugs": coalesce(featuredDestinations[]->slug.current, []),
    "featuredExperienceSlugs": coalesce(featuredExperiences[]->slug.current, []),
    "featuredArticleSlug": featuredArticle->slug.current,
    "announcementBar": coalesce(announcementBar, null),
    "socialLinks": {
      "instagram": coalesce(socialLinks.instagram, null),
      "facebook": coalesce(socialLinks.facebook, null),
      "tiktok": coalesce(socialLinks.tiktok, null),
      "twitter": coalesce(socialLinks.twitter, null)
    },
    appStoreUrl,
    googlePlayUrl
  }
`

/**
 * The single site-wide settings document. Returns null if Sanity is
 * unconfigured OR the document hasn't been created yet — consumers
 * should treat null as "use default chrome".
 */
export async function fetchSiteSettings(): Promise<SanitySiteSettings | null> {
  return safeFetch<SanitySiteSettings>(SITE_SETTINGS_QUERY)
}

// ─── Social Video (Community tab) ───────────────────────────────────────────

const SOCIAL_VIDEO_PROJECTION = /* groq */ `
  _id,
  title,
  creator,
  platform,
  "imageUrl": thumbnailImage.asset->url,
  videoUrl,
  viewsLabel,
  "accentTone": coalesce(accentTone, "sky"),
  buddyPrompt,
  "destinationName": destination->name,
  "featured": coalesce(featured, false),
  "order": coalesce(order, 99)
`

const SOCIAL_VIDEOS_QUERY = /* groq */ `
  *[_type == "socialVideo" && !(_id in path("drafts.**"))] | order(featured desc, order asc, publishedAt desc) {
    ${SOCIAL_VIDEO_PROJECTION}
  }
`

/**
 * Trending social videos for the Explore Community tab. Editors
 * curate manually via `featured` and `order`. Returns null when
 * Sanity is unconfigured OR there are no published videos — consumers
 * fall back to the hardcoded list in ExploreTabs.
 */
export async function fetchSocialVideos(): Promise<SanitySocialVideo[] | null> {
  return safeFetch<SanitySocialVideo[]>(SOCIAL_VIDEOS_QUERY)
}

// ─── Traveler Story (Community tab) ─────────────────────────────────────────

const TRAVELER_STORY_PROJECTION = /* groq */ `
  _id,
  name,
  tripSummary,
  quote,
  partyType,
  "destinationName": destination->name,
  tripDurationDays,
  "avatarUrl": avatarImage.asset->url,
  "featured": coalesce(featured, false),
  "order": coalesce(order, 99)
`

const TRAVELER_STORIES_QUERY = /* groq */ `
  *[_type == "travelerStory" && !(_id in path("drafts.**"))] | order(featured desc, order asc, publishedAt desc) {
    ${TRAVELER_STORY_PROJECTION}
  }
`

/**
 * Traveler testimonial stories for the Explore Community tab.
 * Same curation model as social videos. Returns null when Sanity is
 * unconfigured OR there are no stories — consumers fall back to the
 * hardcoded list in ExploreTabs.
 */
export async function fetchTravelerStories(): Promise<SanityTravelerStory[] | null> {
  return safeFetch<SanityTravelerStory[]>(TRAVELER_STORIES_QUERY)
}
