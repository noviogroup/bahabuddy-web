import { describe, expect, test } from 'vitest'
import { editorialBuddyHref, editorialSeed, editorialTripHref } from '@/lib/editorial-planning-links'

describe('editorial planning links', () => {
  test('builds direct trip creation links with return path, source, and seed', () => {
    const href = editorialTripHref({
      returnTo: '/guides/exuma-food',
      source: 'guide',
      seed: '  Use this guide   for Exuma food planning.  ',
    })
    const url = new URL(href, 'https://bahabuddy.test')

    expect(url.pathname).toBe('/dashboard/trips/new')
    expect(url.searchParams.get('returnTo')).toBe('/guides/exuma-food')
    expect(url.searchParams.get('source')).toBe('guide')
    expect(url.searchParams.get('seed')).toBe('Use this guide for Exuma food planning.')
  })

  test('allows community video cards to seed direct trip creation', () => {
    const href = editorialTripHref({
      returnTo: '/explore',
      source: 'social_video',
      seed: 'Build a trip around this Exuma reel.',
    })
    const url = new URL(href, 'https://bahabuddy.test')

    expect(url.pathname).toBe('/dashboard/trips/new')
    expect(url.searchParams.get('returnTo')).toBe('/explore')
    expect(url.searchParams.get('source')).toBe('social_video')
    expect(url.searchParams.get('seed')).toBe('Build a trip around this Exuma reel.')
  })

  test('caps editorial seed length before adding it to URLs', () => {
    const seed = editorialSeed('x'.repeat(700))

    expect(seed).toHaveLength(600)
  })

  test('builds Buddy as a secondary contextual link', () => {
    const href = editorialBuddyHref('Tell me about Harbour Island.')
    const url = new URL(href, 'https://bahabuddy.test')

    expect(url.pathname).toBe('/dashboard/chat')
    expect(url.searchParams.get('q')).toBe('Tell me about Harbour Island.')
  })
})
