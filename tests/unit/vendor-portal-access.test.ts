import { describe, expect, test } from 'vitest'
import { chooseVendorMembership, type VendorMembership } from '@/lib/vendor-portal'

function membership(overrides: Partial<VendorMembership> = {}): VendorMembership {
  return {
    id: 'membership-1',
    partner_id: 'partner-1',
    auth_user_id: 'user-1',
    email: 'vendor@example.com',
    role: 'owner',
    status: 'active',
    created_at: '2026-07-05T12:00:00.000Z',
    updated_at: '2026-07-05T12:00:00.000Z',
    partner: {
      id: 'partner-1',
      name: 'Rizal Island Resort',
      slug: 'rizal-island-resort',
      partner_type: 'hotel',
      tier: 'standard',
      status: 'active',
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      website: null,
      island_name: 'Paradise Island',
      description: null,
      is_featured: false,
      is_sponsored: false,
    },
    ...overrides,
  }
}

describe('vendor portal access selection', () => {
  test('returns the first active partner membership by default', () => {
    const selected = chooseVendorMembership([membership()])
    expect(selected?.partner_id).toBe('partner-1')
  })

  test('does not treat disabled memberships as active access', () => {
    const selected = chooseVendorMembership([membership({ status: 'disabled' })])
    expect(selected).toBeNull()
  })

  test('does not treat inactive partner records as active access', () => {
    const selected = chooseVendorMembership([
      membership({ partner: { ...membership().partner!, status: 'paused' } }),
    ])
    expect(selected).toBeNull()
  })

  test('only selects requested partner ids owned by the authenticated vendor', () => {
    const selected = chooseVendorMembership([membership()], 'partner-2')
    expect(selected).toBeNull()

    const owned = chooseVendorMembership([membership()], 'partner-1')
    expect(owned?.partner_id).toBe('partner-1')
  })
})
