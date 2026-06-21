import { describe, expect, test } from 'vitest'
import { dealActionLinks, dealIslandLabel } from '@/lib/deal-actions'

describe('deal action links', () => {
  test('routes accommodation deals to the stays marketplace with island context', () => {
    const action = dealActionLinks({
      title: 'Nassau Beach Resort - Summer Escape',
      deal_type: 'accommodation',
      island: 'nassau',
      resort_name: 'British Colonial Hotel',
    })

    expect(action.primaryLabel).toBe('Check stays')
    expect(action.primaryHref).toBe('/stays?island=Nassau')
    expect(action.secondaryLabel).toBe('Ask Buddy')
    expect(action.secondaryHref).toContain('/dashboard/chat?q=')
    const buddyUrl = new URL(action.secondaryHref, 'https://bahabuddy.test')
    expect(buddyUrl.pathname).toBe('/dashboard/chat')
    expect(buddyUrl.searchParams.get('q')).toContain('British Colonial Hotel')
  })

  test('routes tour and activity deals to a contextual places browse link', () => {
    const action = dealActionLinks({
      title: 'Exuma Swimming Pigs Day Tour',
      deal_type: 'tour',
      island: 'exuma',
    })

    expect(action.primaryLabel).toBe('View experiences')
    expect(action.primaryHref).toBe('/explore/places?island=Exuma&search=Exuma+Swimming+Pigs+Day+Tour')
  })

  test('routes package deals to direct trip creation instead of chat as the primary action', () => {
    const action = dealActionLinks({
      title: '7-Night Island-Hopping Package',
      deal_type: 'package',
      island: null,
    }, '/deals?type=package')

    expect(action.primaryLabel).toBe('Build package')
    expect(action.primaryHref).toBe('/dashboard/trips/new?returnTo=%2Fdeals%3Ftype%3Dpackage&source=package')
    expect(action.secondaryLabel).toBe('Ask Buddy')
  })

  test('normalizes common island slugs for marketplace filters', () => {
    expect(dealIslandLabel('harbour-island')).toBe('Harbour Island')
    expect(dealIslandLabel('long-island')).toBe('Long Island')
    expect(dealIslandLabel('the-abacos')).toBe('Abacos')
  })
})
