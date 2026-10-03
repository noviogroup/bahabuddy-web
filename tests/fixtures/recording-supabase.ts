import type { SupabaseClient } from '@supabase/supabase-js'

export type RecordedCall = { method: string; args: unknown[] }
export type RecordedQuery = { table: string; calls: RecordedCall[] }
type QueryResult = { data: unknown; error: { message: string; code?: string } | null }

const CHAIN_METHODS = [
  'select',
  'eq',
  'neq',
  'in',
  'gte',
  'lte',
  'or',
  'ilike',
  'order',
  'limit',
  'overlaps',
  'contains',
  'not',
  'is',
] as const

/**
 * Minimal PostgREST builder double: records every chained filter per query so
 * tests can assert the exact catalog contract (table, gates, bounds, island).
 */
export function createRecordingSupabase(options: {
  tables?: (query: RecordedQuery) => QueryResult
  rpc?: (name: string, params: Record<string, unknown>) => QueryResult
}) {
  const queries: RecordedQuery[] = []
  const rpcCalls: Array<{ name: string; params: Record<string, unknown> }> = []

  const from = (table: string) => {
    const query: RecordedQuery = { table, calls: [] }
    queries.push(query)
    const resolve = () => options.tables?.(query) ?? { data: [], error: null }
    const builder: Record<string, unknown> = {}
    for (const method of CHAIN_METHODS) {
      builder[method] = (...args: unknown[]) => {
        query.calls.push({ method, args })
        return builder
      }
    }
    builder.single = async () => {
      query.calls.push({ method: 'single', args: [] })
      const result = resolve()
      const rows = Array.isArray(result.data) ? result.data : [result.data]
      return rows[0] ? { data: rows[0], error: null } : { data: null, error: result.error ?? { message: 'not found' } }
    }
    builder.maybeSingle = async () => {
      query.calls.push({ method: 'maybeSingle', args: [] })
      const result = resolve()
      const rows = Array.isArray(result.data) ? result.data : [result.data]
      return { data: rows[0] ?? null, error: result.error }
    }
    builder.then = (
      onfulfilled?: (value: QueryResult) => unknown,
      onrejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(resolve()).then(onfulfilled, onrejected)
    return builder
  }

  const rpc = async (name: string, params: Record<string, unknown>) => {
    rpcCalls.push({ name, params })
    return options.rpc?.(name, params) ?? { data: [], error: null }
  }

  return {
    client: { from, rpc } as unknown as SupabaseClient,
    queries,
    rpcCalls,
  }
}

export function callArgs(query: RecordedQuery, method: string): unknown[][] {
  return query.calls.filter((call) => call.method === method).map((call) => call.args)
}

export function hasCall(query: RecordedQuery, method: string, ...args: unknown[]): boolean {
  return callArgs(query, method).some(
    (callArgsValue) => JSON.stringify(callArgsValue.slice(0, args.length)) === JSON.stringify(args),
  )
}

export function selfTourRow(overrides: Record<string, unknown> = {}) {
  return {
    activity_id: '24600000-0000-4000-8000-000000000101',
    place_id: null,
    source_layer: 'self_tours',
    source_record_id: 'nassau-historic-tour',
    name: 'Nassau / New Providence Historic & Landmark Guided Tour',
    island_slug: 'nassau-paradise-island',
    category_tags: ['self_tour', 'historic & cultural'],
    description: 'Self-guided walk past forts and landmarks.',
    location_model: 'route',
    latitude: 25.07,
    longitude: -77.34,
    location_notes: null,
    contact: {},
    seasonality: {},
    safety_access: {},
    price_basis: {},
    booking_quote_state: 'informational_only',
    cancellation: {},
    media: {},
    duration: null,
    meeting_pickup: null,
    group_age_limits: null,
    source_checked_at: '2026-09-26T00:00:00Z',
    source_recheck_at: '2026-10-26T00:00:00Z',
    source_owner: 'Baha Buddy',
    source_class: 'editorial',
    source_url: 'https://example.invalid/tour',
    live_availability_state: 'not_applicable',
    ...overrides,
  }
}

export function canonicalPlaceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'fort-fincastle',
    name: 'Fort Fincastle',
    category: 'attraction',
    subcategory: 'historic fort and landmark',
    island_id: 'nassau-paradise-island',
    island_name: 'Nassau & Paradise Island',
    address: 'Elizabeth Ave, Nassau',
    latitude: 25.0716,
    longitude: -77.3389,
    phone: null,
    website: null,
    description: 'Hilltop fort built in 1793.',
    short_description: 'Hilltop fort.',
    primary_image_url: 'https://images.example/fort.jpg',
    gallery_images: [],
    rating: 4.4,
    review_count: 1200,
    price_level: null,
    opening_hours: null,
    amenities: [],
    tags: [],
    buddy_tips: [],
    is_verified: false,
    is_partner: false,
    source_priority: null,
    metadata: {},
    updated_at: '2026-09-20T00:00:00Z',
    ...overrides,
  }
}
