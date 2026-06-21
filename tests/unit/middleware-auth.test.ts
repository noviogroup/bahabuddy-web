import { describe, expect, test } from 'vitest'
import { isGuestChatPath, isProtectedRoutePath } from '@/middleware'

describe('middleware auth route boundaries', () => {
  test('allows public guest access to standalone chat only', () => {
    expect(isGuestChatPath('/dashboard/chat')).toBe(true)
    expect(isProtectedRoutePath('/dashboard/chat')).toBe(false)
    expect(isProtectedRoutePath('/dashboard/chatbot')).toBe(true)
  })

  test('still protects dashboard, trip, profile, and flight checkout paths', () => {
    expect(isProtectedRoutePath('/dashboard')).toBe(true)
    expect(isProtectedRoutePath('/dashboard/trips/new')).toBe(true)
    expect(isProtectedRoutePath('/trip')).toBe(true)
    expect(isProtectedRoutePath('/trip/trip-123')).toBe(true)
    expect(isProtectedRoutePath('/profile/bookings')).toBe(true)
    expect(isProtectedRoutePath('/flights/offer-123/book')).toBe(true)
    expect(isProtectedRoutePath('/flights/offer-123/book/passengers')).toBe(true)
  })

  test('keeps public marketplace discovery routes open', () => {
    expect(isProtectedRoutePath('/flights')).toBe(false)
    expect(isProtectedRoutePath('/flights/offer-123/confirmation')).toBe(false)
    expect(isProtectedRoutePath('/stays')).toBe(false)
    expect(isProtectedRoutePath('/explore')).toBe(false)
  })
})
