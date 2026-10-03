import { describe, expect, it } from 'vitest'

import {
  isWithinCanonicalIslandBounds,
  normalizeCanonicalIslandSlug,
  splitIslandFromActivitySearch,
} from '@/lib/bahamas-island-bounds'
import { canonicalApprovedIslandSlug } from '@/lib/approved-activities'

describe('Bahamas island publication bounds', () => {
  it('normalizes traveler and catalog aliases', () => {
    expect(normalizeCanonicalIslandSlug('The Abacos')).toBe('abacos')
    expect(normalizeCanonicalIslandSlug('Nassau & Paradise Island')).toBe('nassau-paradise-island')
    expect(normalizeCanonicalIslandSlug('Freeport — Grand Bahama Island')).toBe('grand-bahama')
  })

  it('resolves trip-builder labels and legacy slugs to the canonical places.island_id', () => {
    const cases: Array<[string, string]> = [
      ['Nassau', 'nassau-paradise-island'],
      ['Paradise Island', 'nassau-paradise-island'],
      ['new-providence', 'nassau-paradise-island'],
      ['nassau-paradise-island', 'nassau-paradise-island'],
      ['Harbour Island', 'eleuthera-harbour-island'],
      ['Eleuthera & Harbour Island', 'eleuthera-harbour-island'],
      ['The Exumas', 'the-exumas'],
      ['Exuma', 'the-exumas'],
      ['The Abacos', 'abacos'],
      ['Grand Bahama', 'grand-bahama'],
      ['Long Island', 'long-island'],
      ['The Berry Islands', 'berry-islands'],
      ['Acklins & Crooked Island', 'acklins-crooked-island'],
      ['Bimini', 'bimini'],
    ]
    for (const [label, slug] of cases) {
      expect(normalizeCanonicalIslandSlug(label)).toBe(slug)
      expect(canonicalApprovedIslandSlug(label)).toBe(slug)
    }
    expect(canonicalApprovedIslandSlug('  ')).toBeNull()
  })

  it('splits island names out of activity searches into keywords', () => {
    expect(splitIslandFromActivitySearch('Nassau & Paradise Island boat tours')).toEqual({
      islandSlug: 'nassau-paradise-island',
      keywords: ['boat', 'tour'],
    })
    expect(splitIslandFromActivitySearch('snorkeling in the Exumas')).toEqual({
      islandSlug: 'the-exumas',
      keywords: ['snorkeling'],
    })
    expect(splitIslandFromActivitySearch('Harbour Island pink sands')).toEqual({
      islandSlug: 'eleuthera-harbour-island',
      keywords: ['pink', 'sand'],
    })
    expect(splitIslandFromActivitySearch(null)).toEqual({ islandSlug: null, keywords: [] })
  })

  it('stems plurals so they still substring-match the singular listing text', () => {
    expect(splitIslandFromActivitySearch('beaches churches classes boxes').keywords)
      .toEqual(['beach', 'church', 'class', 'box'])
    expect(splitIslandFromActivitySearch('activities tours dives').keywords)
      .toEqual(['activit', 'tour', 'dive'])
    expect(splitIslandFromActivitySearch('glass').keywords).toEqual(['glass'])
  })

  it('accepts a coordinate within its assigned island', () => {
    expect(isWithinCanonicalIslandBounds({
      island: 'Nassau & Paradise Island',
      latitude: 25.0799,
      longitude: -77.3586,
    })).toBe(true)
  })

  it('rejects foreign homonyms, island mismatches, and missing coordinates', () => {
    expect(isWithinCanonicalIslandBounds({
      island: 'Cat Island',
      latitude: 20.727,
      longitude: 107.048,
    })).toBe(false)
    expect(isWithinCanonicalIslandBounds({
      island: 'Cat Island',
      latitude: 25.0799,
      longitude: -77.3586,
    })).toBe(false)
    expect(isWithinCanonicalIslandBounds({
      island: 'The Exumas',
      latitude: null,
      longitude: null,
    })).toBe(false)
  })
})
