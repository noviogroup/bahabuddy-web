import { beforeEach, describe, expect, test, vi } from 'vitest'
import { getSafeRelativePath, safeRelativePath } from '@/lib/safe-redirect'

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession: mocks.exchangeCodeForSession },
  }),
}))

import { GET as authCallback } from '@/app/auth/callback/route'

describe('safeRelativePath', () => {
  test.each([
    '/dashboard',
    '/dashboard/checkout?trip_id=abc&amount=100',
    '/trip/550e8400-e29b-41d4-a716-446655440000#budget',
    '/vendor?partner_id=p1',
    '/',
  ])('accepts same-origin relative path %s', (path) => {
    expect(getSafeRelativePath(path)).toBe(path)
  })

  test.each([
    '//evil.com',
    '//evil.com/login',
    '/\\evil.com',
    '/\\\\evil.com',
    '\\\\evil.com',
    'javascript:alert(1)',
    'JaVaScRiPt:fetch(1)',
    ' /dashboard',
    'https://evil.com',
    'http://localhost:3020/dashboard',
    'data:text/html,hi',
    'dashboard',
    '/\t/evil.com',
    '/\n/evil.com',
    '/dash\u0000board',
    '',
    '/'.padEnd(3000, 'a'),
  ])('rejects unsafe value %j', (value) => {
    expect(getSafeRelativePath(value)).toBeNull()
    expect(safeRelativePath(value)).toBe('/dashboard')
  })

  test('rejects non-strings and supports a custom fallback', () => {
    expect(getSafeRelativePath(null)).toBeNull()
    expect(getSafeRelativePath(undefined)).toBeNull()
    expect(getSafeRelativePath(['/dashboard'])).toBeNull()
    expect(safeRelativePath('//evil.com', '/')).toBe('/')
  })
})

describe('auth callback next= handling', () => {
  beforeEach(() => {
    mocks.exchangeCodeForSession.mockReset()
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null })
  })

  test.each([
    ['//evil.com', 'http://localhost.test/dashboard'],
    ['/\\evil.com', 'http://localhost.test/dashboard'],
    ['javascript:alert(1)', 'http://localhost.test/dashboard'],
    ['https://evil.com/x', 'http://localhost.test/dashboard'],
    ['/dashboard/checkout?trip_id=t1', 'http://localhost.test/dashboard/checkout?trip_id=t1'],
  ])('next=%s redirects to %s', async (next, expected) => {
    const url = `http://localhost.test/auth/callback?code=abc&next=${encodeURIComponent(next)}`
    const response = await authCallback(new Request(url))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(expected)
  })

  test('failed code exchange goes to the login error page', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: new Error('bad code') })
    const response = await authCallback(new Request('http://localhost.test/auth/callback?code=abc&next=/trip'))
    expect(response.headers.get('location')).toBe('http://localhost.test/login?error=auth')
  })
})
