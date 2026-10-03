import { describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ user: null as null | { id: string } }))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
  }),
}))

import { config, getPublicShareCodeFromTripPath, isGuestChatPath, isProtectedRoutePath, middleware } from '@/middleware'

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

  test('keeps the login return path for dashboard-group activity and checkout pages', () => {
    expect(isProtectedRoutePath('/activities/abc')).toBe(true)
    expect(isProtectedRoutePath('/checkout')).toBe(true)
  })
})

describe('middleware matcher and forwarding', () => {
  const matcher = new RegExp(`^${config.matcher[0]}$`)

  test('runs on public pages so Supabase can persist refreshed session cookies', () => {
    for (const path of ['/', '/stays', '/stays/abc', '/explore', '/share/abc123', '/onboarding', '/dashboard', '/trip/x', '/login', '/vendor']) {
      expect(matcher.test(path)).toBe(true)
    }
  })

  test('skips Next internals, API routes and static files', () => {
    for (const path of ['/_next/static/chunks/a.js', '/_next/image', '/api/stripe-webhook', '/api/trips/invite', '/favicon.ico', '/assets/tourism/a.jpg', '/robots.txt', '/sitemap.xml', '/brand/logo.svg']) {
      expect(matcher.test(path)).toBe(false)
    }
  })

  test('forwards the current path for server layouts and still redirects guests with ?redirect=', async () => {
    mocks.user = null
    const publicResponse = await middleware(new NextRequest('http://localhost.test/stays?island=nassau'))
    expect(publicResponse.headers.get('x-middleware-request-x-baha-pathname')).toBe('/stays?island=nassau')

    const protectedResponse = await middleware(new NextRequest('http://localhost.test/activities/abc'))
    expect(protectedResponse.headers.get('location')).toBe(
      `http://localhost.test/login?redirect=${encodeURIComponent('/activities/abc')}`,
    )
  })

  test('remembers an explicit vendor partner_id in a cookie', async () => {
    mocks.user = { id: 'user-1' }
    const response = await middleware(new NextRequest('http://localhost.test/vendor/deals?partner_id=partner-2'))
    expect(response.cookies.get('bb_vendor_partner_id')?.value).toBe('partner-2')

    const ignored = await middleware(new NextRequest('http://localhost.test/vendor/deals?partner_id=%3Cscript%3E'))
    expect(ignored.cookies.get('bb_vendor_partner_id')).toBeUndefined()
  })
})
