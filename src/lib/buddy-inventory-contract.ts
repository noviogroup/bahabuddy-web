export const BUDDY_INVENTORY_CONTRACT_VERSION = 'grounded-inventory-v1'
export const BUDDY_INVENTORY_MAX_AGE_DAYS = 30
export const BUDDY_INVENTORY_STALE_AFTER_DAYS = 90

export type InventoryAnswerStatus = 'grounded' | 'no_evidence' | 'provider_error'

export const PLACE_GROUNDING_TOOLS = new Set([
  'get_hotels',
  'get_restaurants',
  'get_activities',
  'get_activity_details',
  'search_attractions',
  'get_cruise_itineraries',
])

const CRUISE_ISLAND_STORAGE_VALUES: Record<string, string[]> = {
  'nassau-paradise-island': [
    'nassau-paradise-island',
    'New Providence',
    'Nassau',
    'Paradise Island',
  ],
  'the-exumas': ['the-exumas', 'The Exumas', 'Exuma'],
  'eleuthera-harbour-island': [
    'eleuthera-harbour-island',
    'Eleuthera',
    'Harbour Island',
  ],
  'grand-bahama': ['grand-bahama', 'Grand Bahama', 'Freeport'],
  abacos: ['abacos', 'The Abacos', 'Abaco'],
}

export function inventoryFreshnessCutoffIso(
  now = new Date(),
  maxAgeDays = BUDDY_INVENTORY_MAX_AGE_DAYS,
): string {
  return new Date(now.getTime() - maxAgeDays * 86_400_000).toISOString()
}

export function cruiseIslandStorageValues(canonicalSlug: string): string[] {
  return CRUISE_ISLAND_STORAGE_VALUES[canonicalSlug] ?? [canonicalSlug]
}

export function inventoryGrounding(
  answerStatus: InventoryAnswerStatus,
  canonicalIds: string[] = [],
  staleContentBlocked = false,
) {
  return {
    contract_version: BUDDY_INVENTORY_CONTRACT_VERSION,
    answer_status: answerStatus,
    canonical_ids: canonicalIds,
    stale_content_blocked: staleContentBlocked,
  }
}

export function isPublishedAndFreshInventoryRow(
  row: Record<string, unknown>,
  options: {
    published?: boolean
    freshnessField?: string
    now?: Date
    maxAgeDays?: number
  } = {},
): boolean {
  if (options.published === false) return false
  const freshnessField = options.freshnessField ?? 'updated_at'
  const freshnessValue = row[freshnessField]
  if (typeof freshnessValue !== 'string' || !freshnessValue.trim()) return false
  const freshnessMs = Date.parse(freshnessValue)
  if (!Number.isFinite(freshnessMs)) return false
  const cutoffMs = Date.parse(inventoryFreshnessCutoffIso(options.now, options.maxAgeDays))
  return freshnessMs >= cutoffMs
}

function resultPayload(result: unknown): Record<string, unknown> | null {
  if (!result || typeof result !== 'object') return null
  const record = result as Record<string, unknown>
  return record.data && typeof record.data === 'object'
    ? record.data as Record<string, unknown>
    : record
}

export function inventoryResultStatus(result: unknown): InventoryAnswerStatus {
  const payload = resultPayload(result)
  if (!payload) return 'provider_error'
  const grounding = payload.grounding && typeof payload.grounding === 'object'
    ? payload.grounding as Record<string, unknown>
    : null
  const explicitStatus = grounding?.answer_status
  if (
    explicitStatus === 'grounded' ||
    explicitStatus === 'no_evidence' ||
    explicitStatus === 'provider_error'
  ) {
    return explicitStatus
  }
  if (payload.error) return 'provider_error'
  for (const key of ['results', 'activities', 'hotels']) {
    if (Array.isArray(payload[key])) {
      return (payload[key] as unknown[]).length > 0 ? 'grounded' : 'no_evidence'
    }
  }
  return 'grounded'
}

export function failClosedMessageForPlaceToolBatch(
  entries: Array<{ toolName: string; result: unknown }>,
): string | null {
  const relevant = entries.filter((entry) => PLACE_GROUNDING_TOOLS.has(entry.toolName))
  if (relevant.length === 0) return null
  const statuses = relevant.map((entry) => inventoryResultStatus(entry.result))
  if (statuses.some((status) => status === 'grounded')) return null
  if (statuses.some((status) => status === 'provider_error')) {
    return 'I could not verify matching places or activities because the published inventory is unavailable right now. I will not guess from memory. Please try again shortly.'
  }
  return "I checked Baha Buddy's published inventory and could not verify a match for those filters. I will not substitute a place from memory. Try another island or broader filters."
}
