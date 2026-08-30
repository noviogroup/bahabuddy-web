/**
 * Sanity content types — aligned with the canonical Studio at
 * `/Baha Buddy/studio/schemas/` (Sanity v3, projectId `593u37vh`).
 *
 * History:
 *   - C.7 (March 2026): web app shipped with placeholder schemas
 *     (`buddyPick`, `travelTip`, `discoverArticle`) defined inside the
 *     web project as a stand-in until a real Studio existed.
 *   - Session 13 (May 2026): a top-level Sanity Studio was created at
 *     `/Baha Buddy/studio/` with richer, marketing-grade schemas
 *     (`article`, `tip`, `deal`, `destination`, `experience`,
 *     `siteSettings`). The web's placeholder schemas were misaligned
 *     with the Studio, so authored content would never have rendered.
 *     The Studio is now canonical; this file mirrors its document
 *     shapes for the web consumer.
 *   - Session 13 follow-up: added `socialVideo` and `travelerStory`
 *     schemas to Studio for editor-curated Community tab content. Web
 *     types added below. Hardcoded fallback in ExploreTabs stays.
 *
 * The mobile app (`Baha-Buddy-V2/lib/core/services/sanity_service.dart`)
 * uses Dart models with similar field names. Keep these TypeScript
 * shapes in lockstep with the Studio + mobile so editors only ever
 * have to think about one data model.
 *
 * Graceful fallback: every fetcher returns null when Sanity isn't
 * configured (no `NEXT_PUBLIC_SANITY_PROJECT_ID`). Consumers fall back
 * to hardcoded data so the app keeps working without a live Studio
 * connection.
 */

// ─── Article ────────────────────────────────────────────────────────────────

/**
 * Article — long-form editorial pieces.
 *
 * Studio fields: title, slug, heroImage, excerpt, body (Portable Text),
 * category, relatedDestination, readTimeMinutes, publishedAt, featured,
 * tags, seo.
 *
 * Two surfaces consume articles on the web:
 *   1. /explore Discover grid — cards only (no body needed)
 *   2. /explore/articles/[slug] reader — full Portable Text body
 *
 * `SanityArticleCard` is the lightweight shape for the grid.
 * `SanityArticleFull` extends it with the Portable Text body for the
 * reader page.
 */
export interface SanityArticleCard {
  _id: string
  slug: string
  title: string
  excerpt: string
  /** Stored as machine-value like `travel_guide`, `food_dining`. */
  category: SanityArticleCategory
  /** Resolved from `heroImage.asset->url` in the GROQ projection. */
  imageUrl: string | null
  /** Read time in minutes. UI is responsible for formatting "7 min". */
  readTimeMinutes: number | null
  publishedAt: string | null
  featured: boolean
  /** Optional pre-filled chat prompt. Studio doesn't have a dedicated
   *  field for this yet — derived from the article title at render
   *  time. Kept on the interface so consumers can pass through a
   *  hand-tuned prompt where available. */
  buddyPrompt?: string
}

export interface SanityArticleFull extends SanityArticleCard {
  /** Portable Text body. The shape is opaque here — `<PortableText>`
   *  handles rendering. Use `unknown[]` to avoid coupling to
   *  `@portabletext/types` everywhere. */
  body: unknown[] | null
}

export type SanityArticleCategory =
  | 'travel_guide'
  | 'island_deep_dive'
  | 'food_dining'
  | 'adventure'
  | 'culture'
  | 'insider_tips'
  | 'cruise_planning'
  | 'planning_basics'
  | 'events_seasons'

/** Human-readable category labels. Match Studio's `options.list`. */
export const ARTICLE_CATEGORY_LABEL: Record<SanityArticleCategory, string> = {
  travel_guide: 'Travel Guide',
  island_deep_dive: 'Island Deep-Dive',
  food_dining: 'Food & Dining',
  adventure: 'Adventure',
  culture: 'Culture',
  insider_tips: 'Insider Tips',
  cruise_planning: 'Cruise Planning',
  planning_basics: 'Planning Basics',
  events_seasons: 'Events & Seasons',
}

// ─── Tip ────────────────────────────────────────────────────────────────────

/**
 * Tip — short editorial tips. Used on the home dashboard's rotating
 * TravelTipCard and (later) on island detail pages.
 *
 * Studio fields: title, body, category, destination (ref), emoji,
 * featured, publishedAt, tags.
 */
export interface SanityTip {
  _id: string
  title: string
  body: string
  category: SanityTipCategory | null
  /** Resolved via `destination->name` projection. Used to filter tips
   *  to a specific island on detail pages. */
  destinationName: string | null
  emoji: string | null
  featured: boolean
}

export type SanityTipCategory =
  | 'local_knowledge'
  | 'safety'
  | 'money_budget'
  | 'getting_around'
  | 'food_drink'
  | 'culture_etiquette'
  | 'weather'
  | 'packing'

/** Map Studio's 8 categories to the home card's 3 visual tones
 *  (practical | cultural | seasonal). Keeps the existing card visual
 *  language without forcing editors to think about UI buckets. */
export type TipTone = 'practical' | 'cultural' | 'seasonal'

export const TIP_CATEGORY_TONE: Record<SanityTipCategory, TipTone> = {
  local_knowledge: 'cultural',
  safety: 'practical',
  money_budget: 'practical',
  getting_around: 'practical',
  food_drink: 'cultural',
  culture_etiquette: 'cultural',
  weather: 'seasonal',
  packing: 'practical',
}

// ─── Deal ───────────────────────────────────────────────────────────────────

/**
 * Deal — limited-time hotel/resort/activity offers.
 *
 * Studio fields: title, slug, heroImage, category, destination (ref),
 * description, discountPercent, originalPrice, dealPrice, ctaLabel,
 * ctaUrl, validFrom, validUntil, active, featured.
 *
 * Surfaced on /explore/deals (when wired) and as cards on the home
 * dashboard during active campaigns.
 */
export interface SanityDeal {
  _id: string
  slug: string
  title: string
  imageUrl: string | null
  category: SanityDealCategory | null
  description: string | null
  destinationName: string | null
  discountPercent: number | null
  originalPrice: number | null
  dealPrice: number | null
  ctaLabel: string
  ctaUrl: string | null
  validFrom: string | null
  validUntil: string | null
  active: boolean
  featured: boolean
}

export type SanityDealCategory =
  | 'hotel'
  | 'resort'
  | 'package'
  | 'activity'
  | 'dining'
  | 'transport'

// ─── Destination ────────────────────────────────────────────────────────────

/**
 * Destination — editorial profile of a Bahamian island. Pairs with the
 * canonical record in Supabase `islands` (joined via `islandId`).
 *
 * Studio fields: name, slug, islandId, heroImage, tagline, overview
 * (Portable Text), highlights[], bestTimeToVisit, gettingThere,
 * gallery[], featured, order.
 */
export interface SanityDestination {
  _id: string
  slug: string
  name: string
  /** Slug matching the Supabase `islands.slug` value. The web's
   *  /explore/places/[island] route uses this to bridge editorial
   *  content with the database-driven place list. */
  islandId: string | null
  routeAliases: string[]
  imageUrl: string | null
  tagline: string | null
  overview: unknown[] | null
  highlights: Array<{ label: string; icon: string | null; description: string | null }>
  bestTimeToVisit: string | null
  gettingThere: string | null
  gateways: Array<{
    code: string | null
    name: string
    type: 'airport' | 'ferry' | 'port'
    note: string | null
  }>
  tripFit: {
    vibe: string | null
    recommendedStay: string | null
    pace: string | null
    bestFor: string[]
    notIdealFor: string | null
  } | null
  practicalNotes: unknown[] | null
  faqs: Array<{ question: string; answer: unknown[] | null }>
  gallery: string[]
  heroImage: SanityContentImage | null
  galleryItems: SanityContentImage[]
  featured: boolean
  order: number
}

export interface SanityContentImage {
  url: string | null
  alt: string | null
  caption: string | null
  credit: string | null
  sourceUrl: string | null
  subjectIdentity: string | null
  rightsStatus: string | null
  licenseName: string | null
}

// ─── Experience ─────────────────────────────────────────────────────────────

/**
 * Experience — curated things-to-do entries. Distinct from Activities
 * in the chat tools (those are live database queries). Experiences are
 * editorially-curated standouts: "Swim with the pigs", "Sunset sailing
 * from Nassau Harbor", etc.
 *
 * Studio fields: title, slug, heroImage, category, destination (ref),
 * description (Portable Text), shortDescription, priceRange,
 * durationHours, bookingUrl, tips[], featured, tags.
 */
export interface SanityExperience {
  _id: string
  slug: string
  title: string
  imageUrl: string | null
  category: SanityExperienceCategory | null
  destinationName: string | null
  shortDescription: string | null
  description: unknown[] | null
  priceRange: 'free' | '$' | '$$' | '$$$' | null
  durationHours: number | null
  bookingUrl: string | null
  tips: string[]
  featured: boolean
}

export type SanityExperienceCategory =
  | 'water_sports'
  | 'snorkeling_diving'
  | 'boating_sailing'
  | 'fishing'
  | 'nature_wildlife'
  | 'cultural'
  | 'food_culinary'
  | 'nightlife'
  | 'family'
  | 'wellness_spa'

// ─── Site Settings ──────────────────────────────────────────────────────────

/**
 * Site-wide settings, edited as a single document in Studio. Hero
 * headline, featured pointers, social links, app store URLs.
 *
 * Wired into the marketing site / app config. Not used directly by the
 * dashboard but available for any consumer that needs editor-controlled
 * site-wide chrome.
 */
export interface SanitySiteSettings {
  _id: string
  heroHeadline: string | null
  heroSubheadline: string | null
  heroImageUrl: string | null
  /** Resolved IDs of featured destinations — useful when you want to
   *  re-fetch the full destinations separately. */
  featuredDestinationSlugs: string[]
  featuredExperienceSlugs: string[]
  /** A pointer to the article that should sit in the hero slot on
   *  marketing surfaces. */
  featuredArticleSlug: string | null
  announcementBar: {
    enabled: boolean
    text: string | null
    url: string | null
  } | null
  socialLinks: {
    instagram: string | null
    facebook: string | null
    tiktok: string | null
    twitter: string | null
  }
  appStoreUrl: string | null
  googlePlayUrl: string | null
}

// ─── Social Video ───────────────────────────────────────────────────────────

/**
 * SocialVideo — editor-curated TikTok / Instagram / YouTube content
 * for the Explore Community tab's Trending Videos section.
 *
 * Studio fields: title, creator, platform, thumbnailImage, videoUrl,
 * viewsLabel, accentTone, buddyPrompt, destination (ref), featured,
 * order, publishedAt.
 *
 * The card is read-first; the play affordance is decorative until
 * TikTok/Instagram oEmbed integration lands. The `videoUrl` field
 * already exists in the schema so editors can store the source URL
 * today and the integration is wired later without a migration.
 */
export interface SanitySocialVideo {
  _id: string
  title: string
  creator: string
  platform: SanitySocialPlatform
  /** Resolved from `thumbnailImage.asset->url` in projection. */
  imageUrl: string | null
  videoUrl: string | null
  /** Display-ready string like "2.3M views". Editor controls the
   *  rounding so the number can drift on the source platform without
   *  triggering a Studio update. */
  viewsLabel: string
  accentTone: SanityVideoAccent
  buddyPrompt: string
  destinationName: string | null
  featured: boolean
  order: number
}

export type SanitySocialPlatform = 'tiktok' | 'instagram' | 'youtube'

export type SanityVideoAccent = 'sky' | 'coral' | 'amber' | 'brand'

/**
 * Maps Studio's accentTone enum to Tailwind gradient classes for the
 * dark overlay on social video cards. Keep in lockstep with the
 * accentTone option list in `studio/schemas/socialVideo.ts`.
 */
export const VIDEO_ACCENT_GRADIENT: Record<SanityVideoAccent, string> = {
  sky: 'from-brand-900/30 via-brand-900/55 to-cyan-700/80',
  coral: 'from-coral-900/30 via-coral-900/50 to-coral-900/80',
  amber: 'from-amber-900/30 via-amber-900/50 to-orange-900/80',
  brand: 'from-brand-900/40 via-brand-900/60 to-brand-900/85',
}

/**
 * Maps platform enum to the display label shown on the card pill.
 * Studio stores lowercase machine values; we titlecase for display.
 */
export const SOCIAL_PLATFORM_LABEL: Record<SanitySocialPlatform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
}

// ─── Traveler Story ─────────────────────────────────────────────────────────

/**
 * TravelerStory — editor-curated testimonial card for the Explore
 * Community tab's Traveler Stories section.
 *
 * Studio fields: name, tripSummary, quote, partyType, destination
 * (ref), tripDurationDays, avatarImage, featured, order, publishedAt.
 *
 * Avatar is optional. The card falls back to the first initial of the
 * name in a colored circle when no image is provided — this is the
 * common case in early days, so don't gate publishing on uploading
 * an avatar.
 */
export interface SanityTravelerStory {
  _id: string
  name: string
  tripSummary: string
  quote: string
  partyType: SanityPartyType
  destinationName: string | null
  tripDurationDays: number | null
  /** Resolved from `avatarImage.asset->url` in projection. */
  avatarUrl: string | null
  featured: boolean
  order: number
}

export type SanityPartyType = 'solo' | 'couple' | 'family' | 'friends'

// ─── Managed Content Page ─────────────────────────────────────────────────

export interface SanityContentPageAction {
  label: string
  href: string
  style: 'primary' | 'secondary' | 'text' | null
  openInNewTab: boolean
}

export interface SanityContentPageSection {
  _key: string
  anchor: string | null
  eyebrow: string | null
  heading: string
  body: unknown[] | null
  items: Array<{_key: string; title: string; description: string | null; icon: string | null}>
  actions: SanityContentPageAction[]
  layout: string | null
}

export interface SanityContentPage {
  _id: string
  title: string
  routePath: string
  pageType: string
  eyebrow: string | null
  subtitle: string | null
  heroImageUrl: string | null
  heroActions: SanityContentPageAction[]
  sections: SanityContentPageSection[]
  effectiveDate: string | null
  versionLabel: string | null
}

/**
 * Maps party-type enum to the display label shown on the colored pill.
 * Studio stores lowercase; UI titlecase.
 */
export const PARTY_TYPE_LABEL: Record<SanityPartyType, string> = {
  solo: 'Solo',
  couple: 'Couple',
  family: 'Family',
  friends: 'Friends',
}

/**
 * Maps party-type to Tailwind background/text classes for the
 * colored pill. Solo gets brand-blue, Couple gets coral, Family gets
 * palm-green, Friends gets gold. Stays in lockstep with the schema.
 */
export const PARTY_TYPE_TONE: Record<SanityPartyType, string> = {
  solo: 'bg-brand-50 text-brand-700',
  couple: 'bg-coral-50 text-coral-700',
  family: 'bg-palm-50 text-palm-700',
  friends: 'bg-gold-50 text-gold-700',
}
