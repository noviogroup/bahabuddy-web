import type { SupabaseClient } from '@supabase/supabase-js'

import type { FeaturedExperience } from '@/components/home/FeaturedExperiencesCarousel'
import {
  BAHAMAS_COORDINATE_BOUNDS,
  CANONICAL_PLACE_TABLE,
  canonicalAttractionPhotos,
} from '@/lib/approved-activities'
import { isWithinCanonicalIslandBounds } from '@/lib/bahamas-island-bounds'
import { islandDisplayName } from '@/lib/island-config'
import { createPublicClient } from '@/lib/supabase/public'
import {
  isPermanentlyClosed,
  isPriceTier,
  isTemporarilyClosed,
  parseTripStyles,
} from '@/lib/trip-styles'

/** Things-to-do categories that can be shown as a home page Top pick. */
export const TOP_PICK_CATEGORIES = ['attraction', 'activity', 'beach', 'landmark'] as const
export const HOME_TOP_PICKS_LIMIT = 12
/** Picks fetched for the shelf: the first HOME_TOP_PICKS_LIMIT are shown as
 * is; the rest give the client-side trip-style re-rank room to promote. */
export const HOME_TOP_PICKS_FETCH_LIMIT = 24
export const TOP_PICK_BADGE = 'Top pick' as const

const TOP_PICK_SELECT = [
  'id',
  'slug',
  'name',
  'category',
  'subcategory',
  'island_id',
  'island_name',
  'latitude',
  'longitude',
  'primary_image_url',
  'gallery_images',
  'metadata',
  'trip_styles',
  'price_tier',
  'business_status',
].join(', ')

const LOWERCASE_WORDS = new Set(['a', 'an', 'at', 'by', 'for', 'in', 'of', 'on', 'the', 'to'])
const MAX_CATEGORY_WORDS = 3

export interface TopPickRow {
  id: string
  slug: string | null
  name: string | null
  category: string | null
  subcategory: string | null
  island_id: string | null
  island_name: string | null
  latitude: number | string | null
  longitude: number | string | null
  primary_image_url: string | null
  gallery_images: unknown[] | null
  metadata: Record<string, unknown> | null
  trip_styles?: string[] | null
  price_tier?: string | null
  business_status?: string | null
}

/**
 * Admin-managed Top picks (`places.featured = true`) for the home page
 * "Top things to do" rail, image-first and in the admin's order. Never
 * throws: any failure returns [] so the page falls back to its static list.
 *
 * `featured_rank` (1 = first) comes from a pending migration. If the live
 * database does not have it yet, the query is retried ordered by rating.
 */
export async function getHomeTopPicks(client?: SupabaseClient): Promise<FeaturedExperience[]> {
  try {
    const supabase = client ?? createPublicClient()
    let rows = await queryTopPicks(supabase, true)
    if (rows === null) rows = await queryTopPicks(supabase, false)
    return topPickRowsToExperiences(rows ?? [])
  } catch {
    return []
  }
}

/** Returns null when Supabase reports an error (e.g. missing featured_rank). */
async function queryTopPicks(
  supabase: SupabaseClient,
  withRank: boolean,
): Promise<TopPickRow[] | null> {
  let query = supabase
    .from(CANONICAL_PLACE_TABLE)
    .select(TOP_PICK_SELECT)
    .eq('featured', true)
    .eq('is_active', true)
    .eq('status', 'active')
    .in('category', [...TOP_PICK_CATEGORIES])
    .gte('latitude', BAHAMAS_COORDINATE_BOUNDS.minLatitude)
    .lte('latitude', BAHAMAS_COORDINATE_BOUNDS.maxLatitude)
    .gte('longitude', BAHAMAS_COORDINATE_BOUNDS.minLongitude)
    .lte('longitude', BAHAMAS_COORDINATE_BOUNDS.maxLongitude)
  if (withRank) query = query.order('featured_rank', { ascending: true, nullsFirst: false })
  const { data, error } = await query
    .order('rating', { ascending: false, nullsFirst: false })
    .order('review_count', { ascending: false, nullsFirst: false })
    .limit(HOME_TOP_PICKS_FETCH_LIMIT)
  if (error) return null
  return (data ?? []) as unknown as TopPickRow[]
}

/** Maps rows to carousel cards, keeping order; rows without a photo, a name
 * or plausible island coordinates are skipped. */
export function topPickRowsToExperiences(rows: TopPickRow[]): FeaturedExperience[] {
  const seen = new Set<string>()
  const experiences: FeaturedExperience[] = []
  for (const row of rows) {
    const title = clean(row.name)
    if (!title || !row.id) continue
    // Guard: closed-for-good places are also deactivated, but never list one.
    if (isPermanentlyClosed(row.business_status)) continue
    if (!isWithinCanonicalIslandBounds({
      island: row.island_id ?? row.island_name,
      latitude: row.latitude,
      longitude: row.longitude,
    })) continue
    const image = canonicalAttractionPhotos(row)[0]
    if (!image) continue
    const href = topPickDetailHref(row)
    if (seen.has(href)) continue
    seen.add(href)
    const attribution = clean(row.metadata?.image_attribution)
    const tripStyles = parseTripStyles(row.trip_styles)
    experiences.push({
      title,
      island: clean(row.island_name) ?? islandDisplayName(row.island_id),
      category: topPickCategoryLabel(row),
      href,
      image,
      badge: TOP_PICK_BADGE,
      ...(attribution ? { attribution } : {}),
      // Ranking signals for the client-side trip-style picker; omitted when
      // empty so the payload stays slim.
      ...(tripStyles.length > 0 ? { tripStyles } : {}),
      ...(isPriceTier(row.price_tier) ? { priceTier: row.price_tier } : {}),
      ...(isTemporarilyClosed(row.business_status) ? { temporarilyClosed: true } : {}),
    })
  }
  return experiences
}

/** Same public detail route and id format canonical `places` rows use
 * everywhere else (PlacesBrowser, catalog search, island pages): slug first. */
export function topPickDetailHref(row: Pick<TopPickRow, 'id' | 'slug'>): string {
  return `/explore/places/${encodeURIComponent(clean(row.slug) ?? row.id)}`
}

/** Short title-cased label from the subcategory (or category), e.g.
 * "zoo and tropical gardens" -> "Zoo", "resort water park" -> "Resort Water Park". */
export function topPickCategoryLabel(row: Pick<TopPickRow, 'category' | 'subcategory'>): string {
  const raw = clean(row.subcategory) ?? clean(row.category) ?? 'Things to do'
  const firstPart = raw
    .replace(/[_-]+/g, ' ')
    .split(/\s*(?:,|&|\/|\+|\band\b|\bor\b)\s*/i)[0]
    ?.trim() || raw
  const words = firstPart.split(/\s+/).filter(Boolean).slice(0, MAX_CATEGORY_WORDS)
  while (words.length > 1 && LOWERCASE_WORDS.has(words[words.length - 1].toLowerCase())) words.pop()
  return words
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index > 0 && LOWERCASE_WORDS.has(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

function clean(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.replace(/\s+/g, ' ').trim() : null
}
