/**
 * Shared validation for user-editable trip fields (PATCH /api/trips/[id]/update,
 * POST /api/trips) and for rendering trip-supplied values safely.
 */

import { getSafeRelativePath } from '@/lib/safe-redirect'

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/** True for a real calendar date in strict YYYY-MM-DD form. */
export function isDateOnlyString(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = DATE_ONLY.exec(value)
  if (!match) return false
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  return (
    date.getUTCFullYear() === Number(y) &&
    date.getUTCMonth() === Number(m) - 1 &&
    date.getUTCDate() === Number(d)
  )
}

/**
 * Parses a date-only string (YYYY-MM-DD) as LOCAL midnight so it never
 * shifts a day west of UTC. Full timestamps fall back to Date parsing.
 */
export function parseTripDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const match = DATE_ONLY.exec(value)
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

// Hosts that next.config.mjs allows for next/image and that legitimately
// supply trip hero imagery (island heroes, Sanity, Supabase storage).
const HERO_IMAGE_HOSTS = new Set([
  'cdn.sanity.io',
  'tempo.cdn.tambourine.com',
  'www.nassauparadiseisland.com',
  'images.unsplash.com',
])

/**
 * A trip hero image must be a site-relative asset path or an https URL on an
 * allow-listed image host. Anything else (http:, javascript:, data:, tracking
 * hosts, hosts next/image would reject) is refused.
 */
export function isAllowedTripHeroImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 2048) return false
  if (value.startsWith('/')) {
    const path = getSafeRelativePath(value)
    return Boolean(path && !path.startsWith('/api/'))
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false
  const host = url.hostname.toLowerCase()
  if (HERO_IMAGE_HOSTS.has(host)) return true
  if (host.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/public/')) return true
  return false
}
