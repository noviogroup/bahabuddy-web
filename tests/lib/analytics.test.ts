import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mixpanel = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  track: vi.fn(),
  reset: vi.fn(),
  people: { set: vi.fn() },
}))

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  capture: vi.fn(),
  reset: vi.fn(),
}))

vi.mock('mixpanel-browser', () => ({ default: mixpanel }))
vi.mock('posthog-js', () => ({ default: posthog }))

// The PostHog key is read at module load, so each case imports a fresh copy.
async function loadAnalytics(posthogKey = '') {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', posthogKey)
  return import('@/lib/analytics')
}

describe('analytics', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllEnvs())

  test('stays Mixpanel-only without a PostHog key', async () => {
    const analytics = await loadAnalytics()
    analytics.init()
    analytics.track('search_performed', { query_length: 4 })

    expect(mixpanel.track).toHaveBeenCalledWith('search_performed', { query_length: 4 })
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
      }),
    )
    expect(mixpanel.track).toHaveBeenCalledWith('card_tapped', { card_type: 'hotel' })
    expect(posthog.capture).toHaveBeenCalledWith('card_tapped', { card_type: 'hotel' })
  })

  test('sends each navigation as page_viewed to Mixpanel and $pageview to PostHog', async () => {
    const analytics = await loadAnalytics('phc_test')
    analytics.init()
    analytics.pageview('/explore')

    expect(mixpanel.track).toHaveBeenCalledWith('page_viewed', { path: '/explore' })
    expect(posthog.capture).toHaveBeenCalledWith('$pageview')
  })

  test('maps Mixpanel person props to PostHog names and resets both', async () => {
    const analytics = await loadAnalytics('phc_test')
    analytics.init()
    analytics.identify('user-1', { $email: 'traveler@example.com', $name: undefined })
    analytics.reset()

    expect(mixpanel.identify).toHaveBeenCalledWith('user-1')
    expect(posthog.identify).toHaveBeenCalledWith('user-1', { email: 'traveler@example.com' })
    expect(mixpanel.reset).toHaveBeenCalled()
    expect(posthog.reset).toHaveBeenCalled()
  })
})
