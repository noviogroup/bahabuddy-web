/**
 * Sanity queries (C.7) — GROQ queries + typed fetch helpers.
 *
 * Pattern: each helper returns the typed result OR null. Null signals
 * "Sanity unavailable, use hardcoded fallback".
 */

import { safeFetch } from './client'
import type { SanityBuddyPick, SanityTravelTip, SanityDiscoverArticle } from './types'

// BuddyPick
const BUDDY_PICKS_QUERY = /* groq */ `
  *[_type == "buddyPick" && !(_id in path("drafts.**"))] | order(order asc) {
    _id,
    headline,
    hook,
    "imageUrl": image.asset->url,
    chatPrompt,
    order
  }
`

export async function fetchBuddyPicks(): Promise<SanityBuddyPick[] | null> {
  return safeFetch<SanityBuddyPick[]>(BUDDY_PICKS_QUERY)
}

// TravelTip
const TRAVEL_TIPS_QUERY = /* groq */ `
  *[_type == "travelTip" && !(_id in path("drafts.**"))] | order(order asc) {
    _id,
    title,
    body,
    category,
    order
  }
`

export async function fetchTravelTips(): Promise<SanityTravelTip[] | null> {
  return safeFetch<SanityTravelTip[]>(TRAVEL_TIPS_QUERY)
}

// DiscoverArticle — list
const DISCOVER_ARTICLES_QUERY = /* groq */ `
  *[_type == "discoverArticle" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
    _id,
    "slug": slug.current,
    title,
    excerpt,
    category,
    readTime,
    "imageUrl": heroImage.asset->url,
    buddyPrompt,
    publishedAt
  }
`

export async function fetchDiscoverArticles(): Promise<SanityDiscoverArticle[] | null> {
  return safeFetch<SanityDiscoverArticle[]>(DISCOVER_ARTICLES_QUERY)
}

// DiscoverArticle — single by slug with full Portable Text body
const DISCOVER_ARTICLE_BY_SLUG_QUERY = /* groq */ `
  *[_type == "discoverArticle" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
    _id,
    "slug": slug.current,
    title,
    excerpt,
    category,
    readTime,
    "imageUrl": heroImage.asset->url,
    buddyPrompt,
    publishedAt,
    body
  }
`

export interface SanityArticleFull extends SanityDiscoverArticle {
  body: unknown[] | null
}

export async function fetchDiscoverArticleBySlug(slug: string): Promise<SanityArticleFull | null> {
  return safeFetch<SanityArticleFull>(DISCOVER_ARTICLE_BY_SLUG_QUERY, { slug })
}

// All article slugs — for generateStaticParams
const ALL_ARTICLE_SLUGS_QUERY = /* groq */ `
  *[_type == "discoverArticle" && !(_id in path("drafts.**"))].slug.current
`

export async function fetchAllArticleSlugs(): Promise<string[]> {
  const slugs = await safeFetch<string[]>(ALL_ARTICLE_SLUGS_QUERY)
  return slugs ?? []
}
