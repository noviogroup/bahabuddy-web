import mixpanel from 'mixpanel-browser'
import posthog from 'posthog-js'

/**
 * Mixpanel + PostHog wrapper.
 *
 * Privacy rules enforced here (not at call sites), for BOTH providers:
 *   - URLs never leave the browser with query strings or fragments, and
 *     bearer-like path segments (share codes, trip/order ids, Stripe ids)
 *     are replaced with route placeholders. This applies to event props and
 *     to Mixpanel's automatic $current_url / $referrer / $initial_referrer.
 *     PostHog's automatic URL properties are scrubbed in `before_send`.
 *   - identify() sends only the opaque Supabase user id: no email or name.
 *   - The Mixpanel token comes from NEXT_PUBLIC_MIXPANEL_TOKEN. Non-production
 *     builds without it never initialise Mixpanel, so dev/test traffic is not
 *     sent. PostHog only initialises when NEXT_PUBLIC_POSTHOG_KEY is set.
 */

// Legacy production project token, used only when a production build has
// no NEXT_PUBLIC_MIXPANEL_TOKEN configured.
const LEGACY_PRODUCTION_TOKEN = '8027a413c8faa5f25e441f2c6c38669c'

export function resolveMixpanelToken(
  env: { token?: string; nodeEnv?: string } = {
    token: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
    nodeEnv: process.env.NODE_ENV,
  },
): string | null {
  const token = env.token?.trim()
  if (token) return token
  return env.nodeEnv === 'production' ? LEGACY_PRODUCTION_TOKEN : null
}

// Public project key. Without it, analytics stays Mixpanel-only.
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

let initialized = false
let mixpanelReady = false
let posthogReady = false

// ─── URL / path sanitisation ────────────────────────────────────────────────

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Stripe / provider style ids: pi_…, cs_…, seti_…, ch_…, plus long opaque tokens.
const PROVIDER_ID_SEGMENT = /^(?:pi|cs|seti|ch|cus|sub|in|pm|evt|txn)_[A-Za-z0-9_]+$/
// Long mixed letter+digit tokens without hyphens (hyphenated content slugs stay readable).
const LONG_OPAQUE_SEGMENT = /^(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9_]{20,}$/

// Route families whose dynamic segment is a bearer secret or a record id.
const PARAM_ROUTES: Array<[RegExp, string]> = [
  [/^\/share\/[^/]+/, '/share/:code'],
  [/^\/invite\/[^/]+/, '/invite/:code'],
  [/^\/trip\/[^/]+/, '/trip/:id'],
  [/^\/my-itinerary\/[^/]+/, '/my-itinerary/:id'],
  [/^\/dashboard\/concierge\/[^/]+/, '/dashboard/concierge/:orderId'],
  [/^\/dashboard\/receipts\/[^/]+/, '/dashboard/receipts/:orderId'],
]

/** Path without query/fragment, with secret or id segments templated. */
export function sanitizePath(path: string): string {
  let clean = path.split(/[?#]/, 1)[0] || '/'
  for (const [pattern, replacement] of PARAM_ROUTES) {
    if (pattern.test(clean)) {
      clean = clean.replace(pattern, replacement)
      break
    }
  }
  return clean
    .split('/')
    .map((segment) => {
      if (UUID_SEGMENT.test(segment)) return ':id'
      if (PROVIDER_ID_SEGMENT.test(segment)) return ':ref'
      if (LONG_OPAQUE_SEGMENT.test(segment)) return ':id'
      return segment
    })
    .join('/')
}

/**
 * Absolute URL → origin + sanitised path. Relative paths are sanitised as
 * paths. Non-URL values (e.g. Mixpanel's "$direct") pass through unchanged.
 */
export function sanitizeUrl(value: string): string {
  if (value.startsWith('/') && !value.startsWith('//')) return sanitizePath(value)
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return value
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return value
  return `${url.origin}${sanitizePath(url.pathname)}`
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || (value.startsWith('/') && !value.startsWith('//'))
}

/** Strips query strings / bearer segments from any URL-like string property. */
export function sanitizeProps(props?: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!props) return out
  for (const [key, value] of Object.entries(props)) {
    out[key] = typeof value === 'string' && looksLikeUrl(value) ? sanitizeUrl(value) : value
  }
  return out
}

function automaticUrlOverrides(): Record<string, unknown> {
  if (typeof window === 'undefined' || !mixpanelReady) return {}
  const overrides: Record<string, unknown> = {
    $current_url: sanitizeUrl(window.location.href),
  }
  if (typeof document !== 'undefined' && document.referrer) {
    overrides.$referrer = sanitizeUrl(document.referrer)
  }
  const initialReferrer = mixpanel.get_property?.('$initial_referrer')
  if (typeof initialReferrer === 'string' && initialReferrer) {
    overrides.$initial_referrer = sanitizeUrl(initialReferrer)
  }
  return overrides
}

/**
 * PostHog `before_send` hook: every event (custom, $pageview, $pageleave,
 * autocapture, $identify) goes through the same URL sanitiser as Mixpanel,
 * including person property updates in $set / $set_once.
 */
export function sanitizePostHogEvent<T extends {
  properties?: Record<string, unknown>
  $set?: Record<string, unknown>
  $set_once?: Record<string, unknown>
} | null>(event: T): T {
  if (!event) return event
  if (event.properties) event.properties = sanitizeProps(event.properties)
  if (event.$set) event.$set = sanitizeProps(event.$set)
  if (event.$set_once) event.$set_once = sanitizeProps(event.$set_once)
  return event
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function init() {
  if (typeof window === 'undefined' || initialized) return
  const token = resolveMixpanelToken()
  if (token) {
    mixpanel.init(token, {
      track_pageview: false,
      persistence: 'localStorage',
      // Page-view helper props carry raw location.search; never send them.
      property_blacklist: ['current_url_search'],
    })
    mixpanelReady = true
  }
  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      defaults: '2026-08-30',
      // AnalyticsProvider captures $pageview on each App Router navigation.
      capture_pageview: false,
      capture_pageleave: true,
      // Replay would record traveler and passport screens; keep it off until approved.
      disable_session_recording: true,
      // Same URL scrubbing as Mixpanel for PostHog's automatic properties.
      before_send: (event) => sanitizePostHogEvent(event),
    })
    posthogReady = true
  }
  initialized = true
}

export function isAnalyticsEnabled(): boolean {
  return mixpanelReady || posthogReady
}

/**
 * Identify by opaque user id only. The optional second argument is accepted
 * for backwards compatibility and intentionally ignored: email, name and
 * other person properties are never sent to Mixpanel or PostHog.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function identify(userId: string, _ignoredProps?: Record<string, unknown>) {
  // Child effects run before the root AnalyticsProvider's effect, so make
  // sure the client is initialised rather than silently dropping the call.
  init()
  if (mixpanelReady) {
    const identifiedAs = mixpanel.get_property?.('$user_id')
    // A different user was identified on this device: start a fresh identity
    // so events are not merged across people.
    if (typeof identifiedAs === 'string' && identifiedAs && identifiedAs !== userId) {
      mixpanel.reset()
    }
    mixpanel.identify(userId)
  }
  if (posthogReady) {
    if (posthogIdentified() && posthog.get_distinct_id?.() !== userId) posthog.reset()
    posthog.identify(userId)
  }
}

export function track(event: string, props?: Record<string, unknown>) {
  init()
  const clean = sanitizeProps(props)
  if (mixpanelReady) mixpanel.track(event, { ...clean, ...automaticUrlOverrides() })
  if (posthogReady) posthog.capture(event, clean)
}

/** One navigation: `page_viewed` (route template only) to Mixpanel, `$pageview` to PostHog. */
export function pageview(path: string) {
  init()
  if (mixpanelReady) {
    mixpanel.track('page_viewed', { path: sanitizePath(path), ...automaticUrlOverrides() })
  }
  if (posthogReady) posthog.capture('$pageview')
}

export function reset() {
  if (mixpanelReady) mixpanel.reset()
  if (posthogReady) posthog.reset()
}

function posthogIdentified(): boolean {
  return posthog.get_property?.('$user_state') === 'identified'
}

/** Reset only when a user was identified (avoids churning anonymous ids). */
export function resetIfIdentified() {
  if (mixpanelReady) {
    const identifiedAs = mixpanel.get_property?.('$user_id')
    if (typeof identifiedAs === 'string' && identifiedAs) mixpanel.reset()
  }
  if (posthogReady && posthogIdentified()) posthog.reset()
}

export const analytics = { init, identify, track, pageview, reset, resetIfIdentified }
