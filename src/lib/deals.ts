import 'server-only'
import { createClient } from '@/lib/supabase/server'

export interface Deal {
  id: string
  title: string
  deal_type: string
  island: string | null
  resort_name: string | null
  description: string
  price_from_usd: number | null
  price_unit: string | null
  image_url: string | null
  highlights: string[]
  tags: string[]
  valid_through: string | null
  source_table?: 'deals' | 'bahamas_deals'
}

export type StayDeal = Deal

type DealQuery = {
  limit?: number
  type?: string
  island?: string
}

type Relation = Record<string, unknown> | null

const CANONICAL_DEAL_SELECT = `
  id, title, deal_type, description, image, price_from, starts_at, ends_at,
  active, featured, partner_id, place_id, created_at,
  places(id, name, category, island_id, island_name, short_description,
    primary_image_url, gallery_images, amenities),
  partners(id, name, island_name)
`

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function relation(value: unknown): Relation {
  if (Array.isArray(value)) return relation(value[0])
  if (value && typeof value === 'object') return value as Record<string, unknown>
  return null
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(text).filter((item): item is string => Boolean(item))
}

function normalizeIsland(value: string | null): string | null {
  if (!value) return null
  const slug = value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const aliases: Record<string, string> = {
    exuma: 'the-exumas',
    'the-exuma-islands': 'the-exumas',
    'nassau-and-paradise-island': 'nassau-paradise-island',
    'nassau-paradise-island': 'nassau-paradise-island',
    'the-abacos': 'abacos',
    'eleuthera-and-harbour-island': 'eleuthera-harbour-island',
  }
  return aliases[slug] ?? slug
}

function travelerDealType(rawType: string | null, placeCategory: string | null): string {
  const type = rawType?.toLowerCase() ?? ''
  if (type === 'tour_promotion') return 'tour'
  if (type === 'concierge_upsell') return 'package'
  if (['accommodation', 'tour', 'activity', 'package', 'dining', 'transport', 'other'].includes(type)) {
    return type
  }
  const category = placeCategory?.toLowerCase() ?? ''
  if (/hotel|resort|villa|lodging|stay/.test(category)) return 'accommodation'
  if (/restaurant|dining|food/.test(category)) return 'dining'
  if (/tour/.test(category)) return 'tour'
  if (/transport|rental|scooter|atv|buggy/.test(category)) return 'transport'
  if (/activity|attraction|beach|water/.test(category)) return 'activity'
  return type || 'other'
}

export function canonicalDealIsCurrent(row: Record<string, unknown>, now = new Date()): boolean {
  if (row.active === false) return false
  const startsAt = text(row.starts_at)
  const endsAt = text(row.ends_at)
  if (startsAt && new Date(startsAt).getTime() > now.getTime()) return false
  if (endsAt && new Date(endsAt).getTime() < now.getTime()) return false
  return true
}

export function normalizeCanonicalDeal(row: Record<string, unknown>): Deal {
  const place = relation(row.places)
  const partner = relation(row.partners)
  const gallery = stringList(place?.gallery_images)
  const placeCategory = text(place?.category)
  const rawIsland = text(place?.island_id) ?? text(place?.island_name) ?? text(partner?.island_name)
  const partnerName = text(partner?.name)
  const placeName = text(place?.name)
  const amenities = stringList(place?.amenities)

  return {
    id: String(row.id ?? ''),
    title: text(row.title) ?? 'Current partner offer',
    deal_type: travelerDealType(text(row.deal_type), placeCategory),
    island: normalizeIsland(rawIsland),
    resort_name: placeName ?? partnerName,
    description: text(row.description) ?? text(place?.short_description) ?? '',
    price_from_usd: typeof row.price_from === 'number' ? row.price_from : null,
    price_unit: null,
    image_url: text(row.image) ?? text(place?.primary_image_url) ?? gallery[0] ?? null,
    highlights: amenities.slice(0, 3),
    tags: [placeCategory, partnerName].filter((item): item is string => Boolean(item)),
    valid_through: text(row.ends_at),
    source_table: 'deals',
  }
}

function normalizeLegacyDeal(row: Record<string, unknown>): Deal {
  return {
    id: String(row.id ?? ''),
    title: text(row.title) ?? 'Current offer',
    deal_type: text(row.deal_type) ?? 'other',
    island: normalizeIsland(text(row.island)),
    resort_name: text(row.resort_name),
    description: text(row.description) ?? '',
    price_from_usd: typeof row.price_from_usd === 'number' ? row.price_from_usd : null,
    price_unit: text(row.price_unit),
    image_url: text(row.image_url),
    highlights: stringList(row.highlights),
    tags: stringList(row.tags),
    valid_through: text(row.valid_through),
    source_table: 'bahamas_deals',
  }
}

function matchesQuery(deal: Deal, query: DealQuery): boolean {
  if (query.island && normalizeIsland(deal.island) !== normalizeIsland(query.island)) return false
  if (!query.type) return true
  if (query.type === 'stay') return ['accommodation', 'hotel', 'stay'].includes(deal.deal_type)
  return deal.deal_type === query.type
}

export async function getDeals(query: DealQuery = {}): Promise<Deal[]> {
  const limit = Math.max(1, Math.min(query.limit ?? 50, 100))
  try {
    const supabase = await createClient()
    const canonical = await supabase
      .from('deals')
      .select(CANONICAL_DEAL_SELECT)
      .eq('active', true)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)

    if (!canonical.error) {
      const approved = ((canonical.data ?? []) as Array<Record<string, unknown>>)
        .filter((row) => canonicalDealIsCurrent(row))
        .map(normalizeCanonicalDeal)
        .filter((deal) => deal.id && matchesQuery(deal, query))
        .slice(0, limit)
      if (approved.length > 0) return approved
    }

    const legacy = await supabase
      .from('bahamas_deals')
      .select('id, title, deal_type, island, resort_name, description, price_from_usd, price_unit, image_url, highlights, tags, valid_through')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(100)
    if (legacy.error) return []
    return ((legacy.data ?? []) as Array<Record<string, unknown>>)
      .map(normalizeLegacyDeal)
      .filter((deal) => matchesQuery(deal, query))
      .slice(0, limit)
  } catch {
    return []
  }
}

export async function getStayDeals(limit = 3): Promise<StayDeal[]> {
  return getDeals({ limit, type: 'stay' })
}

export async function getIslandDeals(island: string, limit = 6): Promise<Deal[]> {
  return getDeals({ island, limit })
}
