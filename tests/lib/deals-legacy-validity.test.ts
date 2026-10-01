import { describe, expect, test, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { legacyDealIsCurrent } from '@/lib/deals'

describe('legacyDealIsCurrent', () => {
  const now = new Date('2026-10-01T15:00:00Z')

  test('keeps open-ended legacy deals', () => {
    expect(legacyDealIsCurrent({ valid_through: null }, now)).toBe(true)
  })

  test('keeps deals valid through today and later', () => {
    expect(legacyDealIsCurrent({ valid_through: '2026-10-01' }, now)).toBe(true)
    expect(legacyDealIsCurrent({ valid_through: '2027-01-31' }, now)).toBe(true)
  })

  test('drops expired deals', () => {
    expect(legacyDealIsCurrent({ valid_through: '2026-09-30' }, now)).toBe(false)
    expect(legacyDealIsCurrent({ valid_through: '2026-10-01T09:00:00Z' }, now)).toBe(false)
  })
})
