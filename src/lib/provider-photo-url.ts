/**
 * Provider photo URL sanitizer.
 *
 * The backend enrichment job historically stored provider place-photo URLs
 * with the server-side API key in the query string
 * (`https://maps.googleapis.com/maps/api/place/photo?photoreference=…&key=…`).
 * Rendering those URLs would leak the key into public HTML, so every
 * provider-sourced image URL must pass through `toPublicPhotoUrl` first:
 *
 *   - Legacy maps.googleapis.com place-photo URLs are rewritten to the same-origin
 *     `/api/place-photo?ref=…&w=…` proxy, which adds the key server-side.
 *   - Any other URL carrying a credential-like query param (key, api_key,
 *     apikey, token, access_token, signature) is dropped (returns null).
 *     That includes Places API (New) media URLs.
 *   - Everything else is returned unchanged.
 */

const PHOTO_REFERENCE_PATTERN = /^[A-Za-z0-9_-]+$/
const CREDENTIAL_PARAMS = ['key', 'api_key', 'apikey', 'token', 'access_token', 'signature']
const DEFAULT_WIDTH = 800

export function toPublicPhotoUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  // Same-origin paths (e.g. already-proxied /api/place-photo URLs) are safe.
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  const host = parsed.hostname.toLowerCase()
  if (host === 'maps.googleapis.com' && parsed.pathname.includes('/place/photo')) {
    const ref = parsed.searchParams.get('photo_reference') ?? parsed.searchParams.get('photoreference')
    if (!ref || !PHOTO_REFERENCE_PATTERN.test(ref)) return null
    const widthParam = Number(parsed.searchParams.get('maxwidth') ?? DEFAULT_WIDTH)
    const width = Number.isFinite(widthParam) && widthParam > 0 ? Math.round(widthParam) : DEFAULT_WIDTH
    return `/api/place-photo?ref=${encodeURIComponent(ref)}&w=${width}`
  }

  const hasCredential = [...parsed.searchParams.keys()].some((key) =>
    CREDENTIAL_PARAMS.includes(key.toLowerCase()),
  )
  if (hasCredential || host === 'places.googleapis.com') return null

  return trimmed
}

const PHOTO_SOURCE_LABELS: Record<string, string> = {
  google: 'Google',
  google_places: 'Google',
  foursquare: 'Foursquare',
  tripadvisor: 'Tripadvisor',
  liteapi: 'LiteAPI',
  sanity: 'Baha Buddy',
  partner: 'Partner',
  bta: 'Bahamas Ministry of Tourism',
}

/** Human-readable credit for a photo `source` column value. */
export function photoSourceLabel(source: string | null | undefined): string | null {
  if (!source?.trim()) return null
  const key = source.trim().toLowerCase()
  return PHOTO_SOURCE_LABELS[key]
    ?? key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}
