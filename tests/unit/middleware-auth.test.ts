import { describe, expect, test } from 'vitest'
import { getPublicShareCodeFromTripPath, isGuestChatPath, isProtectedRoutePath } from '@/middleware'

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
    expect(isProtectedRoutePath('/trip/550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isProtectedRoutePath('/profile/bookings')).toBe(true)
    expect(isProtectedRoutePath('/vendor')).toBe(true)
    expect(isProtectedRoutePath('/vendor/media')).toBe(true)
    expect(isProtectedRoutePath('/flights/offer-123/book')).toBe(true)
    expect(isProtectedRoutePath('/flights/offer-123/book/passengers')).toBe(true)
  })

  test('redirects legacy mobile share short-code trip links to public share pages', () => {
    expect(getPublicShareCodeFromTripPath('/trip/share123')).toBe('share123')
    expect(getPublicShareCodeFromTripPath('/trip/abcDEF12')).toBe('abcDEF12')
    expect(isProtectedRoutePath('/trip/share123')).toBe(false)
    expect(getPublicShareCodeFromTripPath('/trip/550e8400-e29b-41d4-a716-446655440000')).toBeNull()
    expect(getPublicShareCodeFromTripPath('/trip/550e8400-e29b-41d4-a716-446655440000/activity')).toBeNull()
  })

  test('keeps public marketplace discovery routes open', () => {
    expect(isProtectedRoutePath('/flights')).toBe(false)
    expect(isProtectedRoutePath('/flights/offer-123/confirmation')).toBe(false)
    expect(isProtectedRoutePath('/stays')).toBe(false)
    expect(isProtectedRoutePath('/explore')).toBe(false)
    expect(isProtectedRoutePath('/partners')).toBe(false)
    expect(isProtectedRoutePath('/list-your-property')).toBe(false)
  })
})
