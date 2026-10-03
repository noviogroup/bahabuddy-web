/**
 * Safe href helpers for URLs that come from model output, card data or the
 * database. React 18 does not block `javascript:` hrefs, so every card link
 * built from data must pass through one of these.
 */

const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])

// Control characters and whitespace can hide a scheme ("java\tscript:").
// eslint-disable-next-line no-control-regex
const CONTROL_OR_SPACE = /[\u0000- \u007f-\u009f]/g

/**
 * Returns the URL when it is an absolute http(s)/mailto/tel URL, or a
 * same-origin relative path ("/trip/123"). Anything else returns undefined.
 */
export function safeHref(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  // Same-origin relative paths. Reject protocol-relative ("//evil") and
  // backslash tricks ("/\evil") that browsers treat as another host.
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return undefined
    return trimmed
  }

  const compact = trimmed.replace(CONTROL_OR_SPACE, '')
  let parsed: URL
  try {
    parsed = new URL(compact)
  } catch {
    return undefined
  }
  if (!SAFE_SCHEMES.has(parsed.protocol)) return undefined
  return trimmed
}

/** Only absolute http/https URLs (e.g. a venue website). */
export function safeExternalUrl(value: unknown): string | undefined {
  const href = safeHref(value)
  if (!href || !/^https?:\/\//i.test(href)) return undefined
  return href
}
