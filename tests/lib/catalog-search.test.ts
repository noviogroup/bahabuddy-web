import { describe, expect, test } from 'vitest'

import {
  cleanCatalogQuery,
  normalizeCatalogResult,
  parseCatalogFilter,
  parseCatalogIsland,
  type CatalogRpcRow,
} from '@/lib/catalog-search'

function row(overrides: Partial<CatalogRpcRow> = {}): CatalogRpcRow {
  return {
    result_id: 'result-1',
    result_type: 'place',
    title: 'Pink Sands Beach',
    subtitle: 'A trusted Bahamas place',
    island_slug: 'eleuthera-harbour-island',
    island_name: 'Eleuthera & Harbour Island',
    category: 'Beach',
    image_url: null,
    rating: '4.8',
    review_count: 920,
    price_from_usd: null,
    route_path: '/places/result-1',
    source_table: 'places',
    score: 80,
    is_live_action: false,
    ...overrides,
  }
}

describe('catalog search normalization', () => {
  test('bounds and normalizes user input', () => {
    expect(cleanCatalogQuery('  pink\u0000   sand  ')).toBe('pink sand')
    expect(cleanCatalogQuery('x'.repeat(200))).toHaveLength(120)
    expect(parseCatalogFilter('STAYS')).toBe('stays')
    expect(parseCatalogFilter('not-a-filter')).toBeNull()
    expect(parseCatalogIsland('THE-EXUMAS')).toBe('the-exumas')
    expect(parseCatalogIsland('florida')).toBeNull()
  })

  test('maps every catalog result to a valid public web destination', () => {
    expect(normalizeCatalogResult(row()).href).toBe('/explore/places/result-1')
    expect(normalizeCatalogResult(row({
      result_type: 'island',
      island_slug: 'the-abacos',
      island_name: 'The Abacos',
    })).href).toBe('/explore/island/abacos')
    expect(normalizeCatalogResult(row({
      result_type: 'island',
      island_slug: 'mayaguana',
      island_name: 'Mayaguana',
    })).href).toBe('/explore/island/mayaguana')
    expect(normalizeCatalogResult(row({
      result_type: 'self_tour',
      route_path: '/self-tours/nassau-history-walk',
    })).href).toBe('/nassau-cruise-itineraries/nassau-history-walk')
    expect(normalizeCatalogResult(row({ result_type: 'deal' })).href).toBe('/deals')
  })

  test('converts numeric payload fields without leaking ranking internals', () => {
    const result = normalizeCatalogResult(row({
      rating: '4.7',
      price_from_usd: '149.50',
    }))

    expect(result.rating).toBe(4.7)
    expect(result.priceFromUsd).toBe(149.5)
    expect(result).not.toHaveProperty('score')
    expect(result).not.toHaveProperty('sourceTable')
  })
})
