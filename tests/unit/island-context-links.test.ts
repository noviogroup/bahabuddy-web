import { describe, expect, test } from 'vitest'
import { islandFoodLinks, islandRestaurantFilterLabel } from '@/lib/island-context-links'

describe('island context links', () => {
  test('normalizes canonical island names for restaurant filters', () => {
    expect(islandRestaurantFilterLabel('The Exumas')).toBe('Exuma')
    expect(islandRestaurantFilterLabel('nassau-paradise-island')).toBe('Nassau')
    expect(islandRestaurantFilterLabel('the-abacos')).toBe('Abacos')
  })

  test('builds contextual food links from an island detail page', () => {
    const links = islandFoodLinks({
      islandName: 'The Exumas',
      islandSlug: 'the-exumas',
      returnPath: '/explore/island/the-exumas',
    })

    expect(links.restaurantsHref).toBe('/restaurants?island=Exuma')
    expect(links.foodCultureHref).toBe('/explore/places?island=Exuma&category=food_culture')
    expect(links.startTripHref).toBe('/dashboard/trips/new?returnTo=%2Fexplore%2Fisland%2Fthe-exumas&source=destination')
    const askBuddyUrl = new URL(links.askBuddyHref, 'https://bahabuddy.test')
    expect(askBuddyUrl.pathname).toBe('/dashboard/chat')
    expect(askBuddyUrl.searchParams.get('q')).toBe('Plan a food and culture day in The Exumas')
  })
})
