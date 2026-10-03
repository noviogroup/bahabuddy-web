import mixpanel from 'mixpanel-browser'
import posthog from 'posthog-js'

const MIXPANEL_TOKEN = '8027a413c8faa5f25e441f2c6c38669c'

// Public project key. Without it, analytics stays Mixpanel-only.
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

let initialized = false
let posthogReady = false

export function init() {
  if (typeof window === 'undefined' || initialized) return
  mixpanel.init(MIXPANEL_TOKEN, {
    track_pageview: false,
    persistence: 'localStorage',
  })
  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      defaults: '2026-08-30',
      // AnalyticsProvider captures $pageview on each App Router navigation.
      capture_pageview: false,
      capture_pageleave: true,
      // Replay would record traveler and passport screens; keep it off until approved.
      disable_session_recording: true,
    })
    posthogReady = true
  }
  initialized = true
}

export function identify(userId: string, props?: Record<string, unknown>) {
  if (!initialized) return
  mixpanel.identify(userId)
  if (props) mixpanel.people.set(props)
  if (posthogReady) posthog.identify(userId, props && toPostHogPersonProps(props))
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!initialized) return
  mixpanel.track(event, props)
  if (posthogReady) posthog.capture(event, props)
}

export function pageview(path: string) {
  if (!initialized) return
  mixpanel.track('page_viewed', { path })
  if (posthogReady) posthog.capture('$pageview')
}

export function reset() {
  if (!initialized) return
  mixpanel.reset()
  if (posthogReady) posthog.reset()
}

// Mixpanel reserves $email/$name; PostHog person profiles use email/name.
function toPostHogPersonProps(props: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(props)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key.replace(/^\$(email|name)$/, '$1'), value]),
  )
}

export const analytics = { init, identify, track, pageview, reset }
