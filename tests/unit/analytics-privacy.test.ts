import { beforeEach, describe, expect, test, vi } from 'vitest'

const mp = vi.hoisted(() => {
  const props: Record<string, unknown> = {}
  return {
    props,
    init: vi.fn(),
    track: vi.fn(),
    identify: vi.fn((id: string) => { props.$user_id = id }),
    reset: vi.fn(() => { delete props.$user_id }),
    get_property: vi.fn((name: string) => props[name]),
    people: { set: vi.fn() },
  }
})

vi.mock('mixpanel-browser', () => ({ default: mp }))

async function loadAnalytics(token?: string) {
  vi.resetModules()
  if (token === undefined) vi.stubEnv('NEXT_PUBLIC_MIXPANEL_TOKEN', '')
  else vi.stubEnv('NEXT_PUBLIC_MIXPANEL_TOKEN', token)
  return import('@/lib/analytics')
}

beforeEach(() => {
  vi.unstubAllEnvs()
  for (const fn of [mp.init, mp.track, mp.identify, mp.reset, mp.people.set]) fn.mockClear()
  for (const key of Object.keys(mp.props)) delete mp.props[key]
})

describe('analytics token resolution', () => {
  test('uses the env token, falls back only in production, disabled otherwise', async () => {
    const { resolveMixpanelToken } = await loadAnalytics()
    expect(resolveMixpanelToken({ token: 'env-token', nodeEnv: 'development' })).toBe('env-token')
    expect(resolveMixpanelToken({ token: '', nodeEnv: 'production' })).toBe('8027a413c8faa5f25e441f2c6c38669c')
    expect(resolveMixpanelToken({ token: undefined, nodeEnv: 'development' })).toBeNull()
    expect(resolveMixpanelToken({ token: undefined, nodeEnv: 'test' })).toBeNull()
  })

  test('does not initialise or send events in test without a token', async () => {
    const analytics = await loadAnalytics()
    analytics.track('page_viewed', { path: '/share/abc' })
    expect(mp.init).not.toHaveBeenCalled()
    expect(mp.track).not.toHaveBeenCalled()
  })
})

describe('analytics URL sanitisation', () => {
  test('templates bearer codes and ids and drops query strings', async () => {
    const { sanitizePath, sanitizeUrl } = await loadAnalytics()
    expect(sanitizePath('/share/AbC123')).toBe('/share/:code')
    expect(sanitizePath('/trip/550e8400-e29b-41d4-a716-446655440000')).toBe('/trip/:id')
    expect(sanitizePath('/dashboard/concierge/ord_123')).toBe('/dashboard/concierge/:orderId')
    expect(sanitizePath('/stays/best-beach-resorts-in-nassau-2026')).toBe('/stays/best-beach-resorts-in-nassau-2026')
    expect(sanitizeUrl('https://bahabuddy.com/dashboard/checkout/success?trip_id=t1&payment_intent=pi_1&payment_intent_client_secret=pi_1_secret_x#x'))
      .toBe('https://bahabuddy.com/dashboard/checkout/success')
    expect(sanitizeUrl('$direct')).toBe('$direct')
  })

  test('overrides $current_url, $referrer and $initial_referrer and sanitises props', async () => {
    const analytics = await loadAnalytics('test-token')
    window.history.replaceState({}, '', '/dashboard/checkout/success?payment_intent_client_secret=pi_1_secret_abc')
    mp.props.$initial_referrer = 'https://checkout.stripe.com/c/pay/cs_live_abc?session_id=cs_live_abc'
    analytics.track('booking_completed', { path: '/share/AbC123?x=1', card_id: '/trip/550e8400-e29b-41d4-a716-446655440000', amount: 10 })

    expect(mp.init).toHaveBeenCalledWith('test-token', expect.objectContaining({ property_blacklist: ['current_url_search'] }))
    const [, props] = mp.track.mock.calls[0]
    expect(props.$current_url).toBe(`${window.location.origin}/dashboard/checkout/success`)
    expect(props.$initial_referrer).toBe('https://checkout.stripe.com/c/pay/:ref')
    expect(props.path).toBe('/share/:code')
    expect(props.card_id).toBe('/trip/:id')
    expect(props.amount).toBe(10)
    expect(JSON.stringify(props)).not.toContain('secret')
  })
})

describe('analytics identity', () => {
  test('identifies by user id only and never sets people email/name', async () => {
    const analytics = await loadAnalytics('test-token')
    analytics.identify('user-1')
    expect(mp.identify).toHaveBeenCalledWith('user-1')
    expect(mp.people.set).not.toHaveBeenCalled()
  })

  test('resets before identifying a different user and on sign-out only when identified', async () => {
    const analytics = await loadAnalytics('test-token')
    analytics.resetIfIdentified()
    expect(mp.reset).not.toHaveBeenCalled()

    analytics.identify('user-a')
    analytics.identify('user-b')
    expect(mp.reset).toHaveBeenCalledTimes(1)

    analytics.resetIfIdentified()
    expect(mp.reset).toHaveBeenCalledTimes(2)
  })
})
