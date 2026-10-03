import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BUDDY_INVENTORY_CONTRACT_VERSION,
  cruiseIslandStorageValues,
  failClosedMessageForPlaceToolBatch,
  inventoryResultStatus,
  isPublishedAndFreshInventoryRow,
} from '@/lib/buddy-inventory-contract'

const NOW = new Date('2026-09-27T00:00:00.000Z')

describe('Buddy grounded inventory contract', () => {
  it('rejects unpublished and stale rows', () => {
    expect(BUDDY_INVENTORY_CONTRACT_VERSION).toBe('grounded-inventory-v1')
    expect(isPublishedAndFreshInventoryRow(
      { updated_at: '2026-09-20T00:00:00.000Z' },
      { published: false, now: NOW },
    )).toBe(false)
    expect(isPublishedAndFreshInventoryRow(
      { last_synced_at: '2026-01-01T00:00:00.000Z' },
      { published: true, freshnessField: 'last_synced_at', now: NOW },
    )).toBe(false)
    expect(isPublishedAndFreshInventoryRow(
      { last_synced_at: '2026-09-20T00:00:00.000Z' },
      { published: true, freshnessField: 'last_synced_at', now: NOW },
    )).toBe(true)
  })

  it('recognizes provider unavailable and zero-result states', () => {
    expect(inventoryResultStatus({
      error: 'unavailable',
      results: [],
      grounding: { answer_status: 'provider_error' },
    })).toBe('provider_error')
    expect(inventoryResultStatus({
      results: [],
      grounding: { answer_status: 'no_evidence' },
    })).toBe('no_evidence')
  })

  it('forces no-memory responses for failed place lookups', () => {
    expect(failClosedMessageForPlaceToolBatch([{
      toolName: 'get_activities',
      result: { error: 'unavailable', results: [] },
    }])).toContain('will not guess from memory')
    expect(failClosedMessageForPlaceToolBatch([{
      toolName: 'get_activities',
      result: { results: [] },
    }])).toContain('will not substitute a place from memory')
    expect(failClosedMessageForPlaceToolBatch([{
      toolName: 'get_activities',
      result: { results: [{ place_id: 'canonical-id' }] },
    }])).toBeNull()
  })

  it('maps the canonical Nassau slug to New Providence storage values', () => {
    expect(cruiseIslandStorageValues('nassau-paradise-island')).toEqual(
      expect.arrayContaining(['nassau-paradise-island', 'New Providence']),
    )
  })

  it('keeps mobile and web on raw canonical IDs and removes the model-memory fallback', () => {
    const workspaceRoot = path.resolve(process.cwd(), '..')
    const mobileTools = fs.readFileSync(
      path.join(workspaceRoot, 'Baha-Buddy-V2/supabase/functions/claude-chat-proxy/tools.ts'),
      'utf8',
    )
    expect(mobileTools).not.toContain("place_id: `attraction-${r.id}`")
    expect(mobileTools).not.toContain("place_id: `tour-${r.id}`")
    expect(mobileTools).not.toContain('recommend activities from my knowledge')
    expect(mobileTools).not.toContain('/functions/v1/activities-proxy')
    // Canonical attraction fallback; quote style follows the mobile formatter.
    expect(mobileTools).toMatch(/type: ["']attraction["']/)
  })
})
