import { describe, expect, test } from 'vitest'
import { canonicalDealIsCurrent, normalizeCanonicalDeal } from '@/lib/deals'

describe('canonical web deals', () => {
  test('maps an approved Admin offer through its place and partner', () => {
    const deal = normalizeCanonicalDeal({
      id: 'deal-1',
      title: 'Three nights in Exuma',
      deal_type: 'partner_offer',
      description: 'An approved stay offer.',
      price_from: 425,
      image: null,
      ends_at: '2099-12-31T23:59:59Z',
      places: {
        id: 'place-1',
        name: 'Exuma Beach Resort',
        category: 'hotel',
        island_name: 'The Exumas',
        primary_image_url: 'https://images.example/exuma-resort.jpg',
        gallery_images: [],
        amenities: ['Beach', 'Pool', 'Breakfast'],
      },
      partners: {
        id: 'partner-1',
        name: 'Exuma Hospitality',
        island_name: 'The Exumas',
      },
    })

    expect(deal).toMatchObject({
      id: 'deal-1',
      deal_type: 'accommodation',
      island: 'the-exumas',
      resort_name: 'Exuma Beach Resort',
      price_from_usd: 425,
      price_unit: null,
      image_url: 'https://images.example/exuma-resort.jpg',
      highlights: ['Beach', 'Pool', 'Breakfast'],
      source_table: 'deals',
    })
  })

  test('rejects inactive, scheduled, and expired Admin offers', () => {
    const now = new Date('2026-09-23T12:00:00Z')
    expect(canonicalDealIsCurrent({ active: true }, now)).toBe(true)
    expect(canonicalDealIsCurrent({ active: false }, now)).toBe(false)
    expect(canonicalDealIsCurrent({ active: true, starts_at: '2026-09-24T12:00:00Z' }, now)).toBe(false)
    expect(canonicalDealIsCurrent({ active: true, ends_at: '2026-09-22T12:00:00Z' }, now)).toBe(false)
  })
})
