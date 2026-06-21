import { describe, expect, test } from 'vitest'
import { buildExplorePlacesHref } from '@/lib/explore-routing'

describe('buildExplorePlacesHref', () => {
  test('builds direct Explore links for generic things-to-do entry points', () => {
    expect(buildExplorePlacesHref({ search: 'things to do' })).toBe('/explore/places?search=things+to+do')
  })

  test('preserves island context and maps a single vibe to an Explore category', () => {
    expect(buildExplorePlacesHref({ islandSlug: 'exuma', vibes: ['beach'] })).toBe('/explore/places?island=exuma&category=Beach&search=Beach')
    expect(buildExplorePlacesHref({ islandSlug: 'nassau', vibes: ['foodie'] })).toBe('/explore/places?island=nassau&category=Dining&search=Food')
  })

  test('keeps multi-vibe searches broad instead of forcing one category', () => {
    expect(buildExplorePlacesHref({ islandSlug: 'bimini', vibes: ['water', 'adventure'] })).toBe('/explore/places?island=bimini&search=Water+sports+Adventure')
  })
})
