import { describe, expect, test } from 'vitest'
import { buddyChatHref, cleanBuddyPrompt } from '@/lib/buddy-chat'

describe('Buddy chat links', () => {
  test('builds links to the canonical dashboard chat route', () => {
    const href = buddyChatHref('  Help me compare   Bahamas stays.  ')
    const url = new URL(href, 'https://bahabuddy.test')

    expect(url.pathname).toBe('/dashboard/chat')
    expect(url.searchParams.get('q')).toBe('Help me compare Bahamas stays.')
  })

  test('supports extra chat context params', () => {
    const href = buddyChatHref('Review this order.', { trip: 'trip-1', source: 'test', empty: '' })
    const url = new URL(href, 'https://bahabuddy.test')

    expect(url.pathname).toBe('/dashboard/chat')
    expect(url.searchParams.get('q')).toBe('Review this order.')
    expect(url.searchParams.get('trip')).toBe('trip-1')
    expect(url.searchParams.get('source')).toBe('test')
    expect(url.searchParams.has('empty')).toBe(false)
  })

  test('caps prompt length for URLs', () => {
    expect(cleanBuddyPrompt('x'.repeat(700))).toHaveLength(600)
  })
})
