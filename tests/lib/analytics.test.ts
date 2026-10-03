import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mixpanel = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  track: vi.fn(),
  reset: vi.fn(),
  get_property: vi.fn(),
  people: { set: vi.fn() },
}))

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  capture: vi.fn(),
  reset: vi.fn(),
  get_property: vi.fn(),
  get_distinct_id: vi.fn(),
}))

vi.mock('mixpanel-browser', () => ({ default: mixpanel }))
vi.mock('posthog-js', () => ({ default: posthog }))

// The PostHog key is read at module load, so each case imports a fresh copy.
// Mixpanel needs an explicit token outside production builds.
async function loadAnalytics(posthogKey = '', mixpanelToken = 'test-token') {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', posthogKey)
  vi.stubEnv('NEXT_PUBLIC_MIXPANEL_TOKEN', mixpanelToken)
  return import('@/lib/analytics')
}

// Mixpanel always gets the sanitised current URL override.
const currentUrl = () => `${window.location.origin}${window.location.pathname}`

describe('analytics', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllEnvs())

  test('stays Mixpanel-only without a PostHog key', async () => {
    const analytics = await loadAnalytics()
    analytics.init()
    analytics.track('search_performed', { query_length: 4 })

    expect(mixpanel.track).toHaveBeenCalledWith('search_performed', { query_length: 4, $current_url: currentUrl() })
    expect(posthog.init).not.toHaveBeenCalled()
    expect(posthog.capture).not.toHaveBeenCalled()
  })

  test('fans events out to PostHog with session replay off', async () => {
    const analytics = await loadAnalytics('phc_test')
    analytics.init()
    analytics.track('card_tapped', { card_type: 'hotel' })

    expect(posthog.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        api_host: 'https://us.i.posthog.com',
        capture_pageview: false,
        disable_session_recording: true,
        before_send: expect.any(Function),
      }),
    )
    expect(mixpanel.track).toHaveBeenCalledWith('card_tapped', { card_type: 'hotel', $current_url: currentUrl() })
    expect(posthog.capture).toHaveBeenCalledWith('card_tapped', { card_type: 'hotel' })
  })

  test('sends each navigation as page_viewed to Mixpanel and $pageview to PostHog', async () => {
    const analytics = await loadAnalytics('phc_test')
    analytics.init()
    analytics.pageview('/explore')
    analytics.pageview('/share/AbC123?ref=x')

    expect(mixpanel.track).toHaveBeenCalledWith('page_viewed', { path: '/explore', $current_url: currentUrl() })
    expect(mixpanel.track).toHaveBeenCalledWith('page_viewed', { path: '/share/:code', $current_url: currentUrl() })
    expect(posthog.capture).toHaveBeenCalledWith('$pageview')
  })

  test('PostHog works without a Mixpanel token', async () => {
    const analytics = await loadAnalytics('phc_test', '')
    analytics.track('card_tapped', { card_type: 'hotel' })

    expect(mixpanel.init).not.toHaveBeenCalled()
    expect(mixpanel.track).not.toHaveBeenCalled()
    expect(posthog.capture).toHaveBeenCalledWith('card_tapped', { card_type: 'hotel' })
  })

  test('PostHog props and automatic URLs go through the same sanitiser as Mixpanel', async () => {
    const analytics = await loadAnalytics('phc_test')
    analytics.track('share_opened', { path: '/share/AbC123?x=1', amount: 10 })
    expect(posthog.capture).toHaveBeenCalledWith('share_opened', { path: '/share/:code', amount: 10 })

    const [, config] = posthog.init.mock.calls[0]
    const event = config.before_send({
      event: '$pageview',
      properties: {
        $current_url: 'https://bahabuddy.com/dashboard/checkout/success?payment_intent_client_secret=pi_1_secret_x',
        $referrer: 'https://checkout.stripe.com/c/pay/cs_live_abc?session_id=cs_live_abc',
        $pathname: '/trip/550e8400-e29b-41d4-a716-446655440000',
      },
      $set_once: { $initial_current_url: 'https://bahabuddy.com/share/AbC123?x=1' },
    })
    expect(event.properties).toEqual({
      $current_url: 'https://bahabuddy.com/dashboard/checkout/success',
      $referrer: 'https://checkout.stripe.com/c/pay/:ref',
      $pathname: '/trip/:id',
    })
    expect(event.$set_once).toEqual({ $initial_current_url: 'https://bahabuddy.com/share/:code' })
    expect(JSON.stringify(event)).not.toContain('secret')
  })

  test('identifies both providers by user id only and resets both', async () => {
    const analytics = await loadAnalytics('phc_test')
    analytics.init()
    analytics.identify('user-1', { $email: 'traveler@example.com', $name: 'Traveler' })
    analytics.reset()

    expect(mixpanel.identify).toHaveBeenCalledWith('user-1')
    expect(mixpanel.people.set).not.toHaveBeenCalled()
    expect(posthog.identify).toHaveBeenCalledWith('user-1')
    expect(JSON.stringify(posthog.identify.mock.calls)).not.toContain('traveler@example.com')
    expect(JSON.stringify(posthog.identify.mock.calls)).not.toContain('Traveler')
    expect(mixpanel.reset).toHaveBeenCalled()
    expect(posthog.reset).toHaveBeenCalled()
  })

  test('resetIfIdentified clears an identified PostHog user on sign-out', async () => {
    const analytics = await loadAnalytics('phc_test')
    analytics.init()
    posthog.get_property.mockReturnValue('anonymous')
    analytics.resetIfIdentified()
    expect(posthog.reset).not.toHaveBeenCalled()

    posthog.get_property.mockReturnValue('identified')
    analytics.resetIfIdentified()
    expect(posthog.reset).toHaveBeenCalledTimes(1)
    posthog.get_property.mockReset()
  })
})
