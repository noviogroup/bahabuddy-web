import type { SupabaseClient } from '@supabase/supabase-js'

import {
  isWithinCanonicalIslandBounds,
  normalizeCanonicalIslandSlug,
  splitIslandFromActivitySearch,
} from '@/lib/bahamas-island-bounds'
import { islandDisplayName } from '@/lib/island-config'

export const APPROVED_ACTIVITY_RPC = 'get_approved_activity_recommendations'
export const MAX_BUDDY_ACTIVITY_OPTIONS = 3
/** Largest page the approved-activity RPC returns (it clamps p_limit to 100). */
export const APPROVED_ACTIVITY_PAGE_LIMIT = 100
export const CANONICAL_PLACE_TABLE = 'places'
export const CANONICAL_ATTRACTION_CATEGORIES = ['attraction', 'activity'] as const
/** Coarse Bahamas box applied in SQL; per-island bounds are checked after. */
export const BAHAMAS_COORDINATE_BOUNDS = {
  minLatitude: 20,
  maxLatitude: 28,
  minLongitude: -80,
  maxLongitude: -71,
} as const
/** Tool-result note for Buddy; never rendered to travelers. */
export const CANONICAL_ATTRACTION_NOTE =
  'Canonical listings, not reviewed activity offers: do not quote prices, durations or booking availability; suggest checking with the provider.'
const APPROVED_TOUR_LAYERS = new Set(['self_tours', 'cruise_itineraries'])

export const CANONICAL_ATTRACTION_SELECT = [
  'id',
  'slug',
  'name',
  'category',
  'subcategory',
  'island_id',
  'island_name',
  'address',
  'latitude',
  'longitude',
  'phone',
  'website',
  'description',
  'short_description',
  'primary_image_url',
  'gallery_images',
  'rating',
  'review_count',
  'price_level',
  'opening_hours',
  'amenities',
  'tags',
  'is_verified',
  'is_partner',
  'metadata',
  'updated_at',
  'trip_styles',
  'price_tier',
  'business_status',
].join(', ')

/** An active `places` attraction row (real catalog record, no offer facts). */
export interface CanonicalAttractionRow {
  id: string
  slug: string | null
  name: string
  category: string
  subcategory: string | null
  island_id: string | null
  island_name: string | null
  address: string | null
  latitude: number | string | null
  longitude: number | string | null
  phone: string | null
  website: string | null
  description: string | null
  short_description: string | null
  primary_image_url: string | null
  gallery_images: unknown[] | null
  rating: number | string | null
  review_count: number | null
  price_level: string | null
  opening_hours: Record<string, unknown> | null
  amenities: unknown[] | null
  tags: unknown[] | null
  is_verified: boolean | null
  is_partner: boolean | null
  metadata: Record<string, unknown> | null
  updated_at: string | null
  trip_styles?: string[] | null
  price_tier?: string | null
  business_status?: string | null
}

export interface ApprovedActivityRow {
  activity_id: string
  place_id: string | null
  source_layer: string
  source_record_id: string
  name: string
  island_slug: string
  category_tags: string[]
  description: string
  location_model: string
  latitude: number | string | null
  longitude: number | string | null
  location_notes: string | null
  contact: Record<string, unknown>
  seasonality: Record<string, unknown>
  safety_access: Record<string, unknown>
  price_basis: Record<string, unknown>
  booking_quote_state: string
  cancellation: Record<string, unknown>
  media: Record<string, unknown>
  duration: Record<string, unknown> | null
  meeting_pickup: Record<string, unknown> | null
  group_age_limits: Record<string, unknown> | null
  source_checked_at: string
  source_recheck_at: string
  source_owner: string
  source_class: string
  source_url: string
  live_availability_state: string
}

export async function getApprovedActivities(
  supabase: SupabaseClient,
  filters: {
    islandSlug?: string | null
    category?: string | null
    activityId?: string | null
    search?: string | null
    limit?: number
  } = {},
): Promise<ApprovedActivityRow[]> {
  const island = canonicalApprovedIslandSlug(filters.islandSlug)
  const { data, error } = await supabase.rpc(APPROVED_ACTIVITY_RPC, {
    p_island_slug: island,
    p_category: clean(filters.category),
    p_activity_id: clean(filters.activityId),
    p_search: clean(filters.search),
    p_limit: Math.min(APPROVED_ACTIVITY_PAGE_LIMIT, Math.max(1, filters.limit ?? 24)),
  })
  if (error) {
    throw Object.assign(new Error(`Approved activity catalog unavailable: ${error.message}`), {
      code: error.code,
    })
  }
  const category = clean(filters.category)?.toLowerCase()
  const activityId = clean(filters.activityId)
  const keywords = splitIslandFromActivitySearch(clean(filters.search)).keywords
  return ((data ?? []) as ApprovedActivityRow[]).filter((row) => {
    if (island && row.island_slug !== island) return false
    if (category && !row.category_tags.some((tag) => tag.toLowerCase() === category)) return false
    if (activityId && row.activity_id !== activityId) return false
    const haystack = `${row.name} ${row.description}`.toLowerCase()
    if (!keywords.every((keyword) => haystack.includes(keyword))) return false
    return true
  })
}

export function canonicalApprovedIslandSlug(value: unknown): string | null {
  const text = clean(value)
  return text ? normalizeCanonicalIslandSlug(text) || null : null
}

/** Self-guided tours and cruise day plans are approved, but they are not the
 * activity offers that make canonical attraction browsing unnecessary. */
export function isApprovedTourRow(row: Pick<ApprovedActivityRow, 'source_layer'>): boolean {
  return APPROVED_TOUR_LAYERS.has(row.source_layer)
}

/** Traveler-facing type label: the first real theme tag. "self_tour" is a
 * catalog marker, never shown to travelers. */
export function approvedActivityTypeLabel(
  row: Pick<ApprovedActivityRow, 'category_tags' | 'source_layer'>,
): string {
  return row.category_tags.find((tag) => tag !== 'self_tour')
    ?? (isApprovedTourRow(row) ? 'Guided tour' : 'Activity')
}

/** Public (no sign-in) detail page for an activity id. The dashboard copy at
 * /activities/[id] stays for signed-in users but is behind the login wall, so
 * public cards, search results and the sitemap must link here instead. */
export function approvedActivityDetailHref(activityId: string): string {
  return `/explore/activities/${encodeURIComponent(activityId)}`
}

/**
 * Active canonical `places` attractions for an exact island. Used only while
 * the approved projection has no non-tour activities for a request. Rows are
 * real catalog records; photo-less rows are kept (ranked after photo rows) and
 * no price, duration or availability is attached.
 */
export async function getCanonicalAttractionActivities(
  supabase: SupabaseClient,
  filters: {
    islandSlug?: string | null
    activityId?: string | null
    search?: string | null
    /** Row matches when ANY of these words appears (one OR group). */
    anyKeywords?: string[]
    minReviewCount?: number
    limit?: number
  } = {},
): Promise<CanonicalAttractionRow[]> {
  const parsed = splitIslandFromActivitySearch(clean(filters.search))
  const island = canonicalApprovedIslandSlug(filters.islandSlug) ?? parsed.islandSlug
  const activityId = clean(filters.activityId)
  if (activityId && !isUuid(activityId)) return []

  let query = supabase
    .from(CANONICAL_PLACE_TABLE)
    .select(CANONICAL_ATTRACTION_SELECT)
    .in('category', [...CANONICAL_ATTRACTION_CATEGORIES])
    .eq('is_active', true)
    .eq('status', 'active')
    .gte('latitude', BAHAMAS_COORDINATE_BOUNDS.minLatitude)
    .lte('latitude', BAHAMAS_COORDINATE_BOUNDS.maxLatitude)
    .gte('longitude', BAHAMAS_COORDINATE_BOUNDS.minLongitude)
    .lte('longitude', BAHAMAS_COORDINATE_BOUNDS.maxLongitude)
  if (island) query = query.eq('island_id', island)
  if (activityId) query = query.eq('id', activityId)
  if (filters.minReviewCount) query = query.gte('review_count', filters.minReviewCount)
  // Every keyword must appear in the name, description or subcategory.
  // Keywords are [a-z0-9] only, so they are safe inside a PostgREST or().
  for (const keyword of parsed.keywords) {
    query = query.or(
      `name.ilike.%${keyword}%,description.ilike.%${keyword}%,short_description.ilike.%${keyword}%,subcategory.ilike.%${keyword}%`,
    )
  }
  const anyKeywords = Array.from(new Set((filters.anyKeywords ?? [])
    .map((word) => word.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter((word) => word.length >= 3)))
  if (anyKeywords.length > 0) {
    query = query.or(anyKeywords.flatMap((keyword) => [
      `name.ilike.%${keyword}%`,
      `description.ilike.%${keyword}%`,
      `short_description.ilike.%${keyword}%`,
      `subcategory.ilike.%${keyword}%`,
    ]).join(','))
  }

  const { data, error } = await query
    .order('rating', { ascending: false, nullsFirst: false })
    .order('review_count', { ascending: false, nullsFirst: false })
    .limit(Math.min(100, Math.max(1, filters.limit ?? 24)))
  if (error) throw new Error(`Canonical attraction catalog unavailable: ${error.message}`)

  return ((data ?? []) as unknown as CanonicalAttractionRow[])
    .filter((row) => Boolean(clean(row.name)))
    // Guard: closed-for-good places should already be inactive.
    .filter((row) => row.business_status !== 'CLOSED_PERMANENTLY')
    .filter((row) => !island || row.island_id === island)
    .filter((row) => isWithinCanonicalIslandBounds({
      island: row.island_id ?? row.island_name,
      latitude: row.latitude,
      longitude: row.longitude,
    }))
    .map((row, index) => ({ row, index }))
    .sort((a, b) => Number(hasPhoto(b.row)) - Number(hasPhoto(a.row)) || a.index - b.index)
    .map(({ row }) => row)
}

/**
 * Approved activities first. For every island the approved projection has
 * no non-tour rows for, add real canonical attractions for that island and
 * the same keywords. Approved self-guided tours are always kept as-is.
 */
export async function getActivitiesWithCanonicalFallback(
  supabase: SupabaseClient,
  filters: {
    islandSlug?: string | null
    category?: string | null
    activityId?: string | null
    search?: string | null
    limit?: number
    /** Approved rows the caller already fetched for exactly these filters;
     * skips the RPC (e.g. a page that also needs the same island's tours). */
    approved?: ApprovedActivityRow[]
  } = {},
): Promise<{ approved: ApprovedActivityRow[]; canonical: CanonicalAttractionRow[] }> {
  const activityId = clean(filters.activityId)
  if (activityId && !isUuid(activityId)) return { approved: [], canonical: [] }

  let approved: ApprovedActivityRow[] = []
  try {
    approved = filters.approved ?? await getApprovedActivities(supabase, filters)
  } catch (error) {
    // PGRST202: the approved RPC is not deployed; canonical rows still apply.
    if ((error as { code?: unknown } | null)?.code !== 'PGRST202') throw error
  }
  if (activityId && approved.length > 0) return { approved, canonical: [] }
  // Decided per island: one island's reviewed offers must not hide real
  // attractions on islands that have none yet (island-less callers).
  const coveredIslands = new Set(
    approved
      .filter((row) => !isApprovedTourRow(row))
      .map((row) => normalizeCanonicalIslandSlug(row.island_slug)),
  )
  const island = canonicalApprovedIslandSlug(filters.islandSlug)
  if (island && coveredIslands.has(island)) return { approved, canonical: [] }

  let canonical: CanonicalAttractionRow[] = []
  try {
    canonical = await getCanonicalAttractionActivities(supabase, {
      islandSlug: filters.islandSlug,
      activityId,
      search: [clean(filters.search), clean(filters.category)].filter(Boolean).join(' '),
      limit: filters.limit,
    })
  } catch {
    canonical = []
  }
  const approvedPlaceIds = new Set(approved.map((row) => row.place_id).filter(Boolean))
  canonical = canonical.filter((row) =>
    !approvedPlaceIds.has(row.id)
    && !coveredIslands.has(normalizeCanonicalIslandSlug(row.island_id ?? row.island_name)),
  )
  return { approved, canonical }
}

/** Broad traveler-facing label for a canonical attraction. */
export function canonicalAttractionCategory(
  row: Pick<CanonicalAttractionRow, 'category' | 'subcategory'>,
): string {
  const value = `${row.subcategory || row.category || ''}`.toLowerCase()
  if (value.includes('beach')) return 'Beach'
  if (['culture', 'landmark', 'historic'].some((token) => value.includes(token))) return 'Culture'
  if (['water', 'diving', 'snorkel', 'fishing'].some((token) => value.includes(token))) return 'Water Activity'
  return 'Activity'
}

/** Chat/search card for a canonical attraction: catalog facts only. */
export function canonicalAttractionCard(row: CanonicalAttractionRow) {
  const photos = canonicalAttractionPhotos(row)
  return {
    card_type: 'activity' as const,
    place_id: row.id,
    name: row.name,
    island: row.island_name ?? row.island_id ?? undefined,
    island_id: row.island_id ?? undefined,
    description: clean(row.short_description) ?? clean(row.description) ?? undefined,
    vibe_tags: [canonicalAttractionCategory(row).toLowerCase()],
    rating: numeric(row.rating) ?? undefined,
    review_count: row.review_count ?? undefined,
    photo_url: photos[0],
    photos,
    phone: clean(row.phone) ?? undefined,
    website: clean(row.website) ?? undefined,
    full_address: clean(row.address) ?? undefined,
    latitude: numeric(row.latitude),
    longitude: numeric(row.longitude),
  }
}

export function canonicalAttractionPhotos(row: Pick<CanonicalAttractionRow, 'primary_image_url' | 'gallery_images'>): string[] {
  const urls = [row.primary_image_url, ...(Array.isArray(row.gallery_images) ? row.gallery_images : [])]
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') return clean((item as Record<string, unknown>).url) ?? ''
      return ''
    })
    .filter((url) => /^https?:\/\//i.test(url))
  return urls.filter((url, index) => urls.indexOf(url) === index)
}

function hasPhoto(row: CanonicalAttractionRow): boolean {
  return canonicalAttractionPhotos(row).length > 0
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function approvedActivityCard(row: ApprovedActivityRow) {
  const media = object(row.media)
  const photoUrl = clean(media.hero_url) ?? clean(media.image_url)
  const gallery = Array.isArray(media.gallery_urls)
    ? media.gallery_urls.map(clean).filter((value): value is string => Boolean(value))
    : []
  return {
    card_type: 'activity' as const,
    place_id: row.activity_id,
    activity_id: row.activity_id,
    canonical_place_id: row.place_id,
    source_layer: row.source_layer,
    source_record_id: row.source_record_id,
    name: row.name,
    island: row.island_slug,
    island_id: row.island_slug,
    description: row.description,
    vibe_tags: row.category_tags,
    duration: activityDurationLabel(row.duration) ?? undefined,
    duration_label: activityDurationLabel(row.duration),
    price_basis: row.price_basis,
    price_basis_label: activityPriceLabel(row.price_basis, row.booking_quote_state),
    booking_quote_state: row.booking_quote_state,
    booking_state_label: activityBookingLabel(row.booking_quote_state),
    meeting_pickup: row.meeting_pickup,
    meeting_pickup_label: factLabel(row.meeting_pickup),
    group_age_limits: row.group_age_limits,
    group_age_label: factLabel(row.group_age_limits),
    safety_access: row.safety_access,
    safety_access_label: factLabel(row.safety_access),
    cancellation: row.cancellation,
    cancellation_label: factLabel(row.cancellation),
    source_checked_at: row.source_checked_at,
    source_recheck_at: row.source_recheck_at,
    source_as_of_label: sourceAsOfLabel(row.source_checked_at, row.source_recheck_at),
    source_url: row.source_url,
    live_availability_state: row.live_availability_state,
    photo_url: photoUrl ?? undefined,
    photos: [photoUrl, ...gallery].filter(
      (value, index, values): value is string => Boolean(value) && values.indexOf(value) === index,
    ),
    latitude: numeric(row.latitude),
    longitude: numeric(row.longitude),
  }
}

export function activityDurationLabel(value: unknown): string | null {
  const duration = object(value)
  const explicit = factLabel(duration)
  if (explicit) return explicit
  const minutes = numeric(duration.minutes ?? duration.duration_minutes)
  if (minutes && minutes > 0) return minutes < 60 ? `${Math.round(minutes)} min` : `${Number((minutes / 60).toFixed(1))} hr`
  const hours = numeric(duration.hours ?? duration.duration_hours)
  return hours && hours > 0 ? `${Number(hours.toFixed(1))} hr` : null
}

export function activityPriceLabel(priceValue: unknown, bookingState: unknown): string {
  const state = clean(bookingState)
  if (state === 'request_quote' || state === 'external_handoff') return 'External quote'
  const price = object(priceValue)
  if (clean(price.type) === 'free_self_guided') return 'Free'
  const amount = numeric(price.amount)
  if (!amount || amount <= 0) return 'Price N/A'
  const currency = clean(price.currency) ?? 'USD'
  const basis = (clean(price.basis) ?? 'total').replaceAll('_', ' ')
  const isFrom = price.is_from === true || clean(price.price_type) === 'from'
  return `${isFrom ? 'From ' : ''}${currency} ${amount} / ${basis} · verify live`
}

export function activityBookingLabel(value: unknown): string {
  switch (clean(value)) {
    case 'instant_book': return 'Instant-book · live check required'
    case 'request_quote': return 'Request a quote'
    case 'external_handoff': return 'Book with provider'
    case 'walk_up': return 'Walk-up only'
    case 'informational_only': return 'Information only'
    default: return 'Booking unavailable'
  }
}

export function factLabel(value: unknown): string | null {
  const direct = clean(value)
  if (direct) return direct
  const valueObject = object(value)
  for (const key of ['label', 'summary', 'details', 'notes', 'value']) {
    const candidate = clean(valueObject[key])
    if (candidate) return candidate
  }
  return null
}

export function sourceAsOfLabel(checkedValue: unknown, recheckValue: unknown): string | null {
  const checked = clean(checkedValue)
  if (!checked) return null
  const checkedDate = checked.slice(0, 10)
  const recheck = clean(recheckValue)?.slice(0, 10)
  return recheck ? `Source checked ${checkedDate} · recheck by ${recheck}` : `Source checked ${checkedDate}`
}

export function approvedActivityEmptyMessage(islandSlug?: string | null): string {
  const island = islandDisplayName(islandSlug)
  return `I don't have activities listed${island ? ` for ${island}` : ''} yet. I won't substitute another island or an unverified option.`
}

export function filterApprovedActivityCards(cards: unknown[], approvedIds: ReadonlySet<string>): unknown[] {
  let activityCount = 0
  const visit = (values: unknown[]): unknown[] => values.flatMap((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const card = value as Record<string, unknown>
    if (card.card_type === 'mixed' && Array.isArray(card.cards)) {
      const nested = visit(card.cards)
      return nested.length > 0 ? [{ ...card, cards: nested }] : []
    }
    if (card.card_type !== 'activity') return [card]
    const id = clean(card.place_id) ?? clean(card.activity_id)
    if (!id || !approvedIds.has(id) || activityCount >= MAX_BUDDY_ACTIVITY_OPTIONS) return []
    activityCount += 1
    return [card]
  })
  return visit(cards)
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function clean(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numeric(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
