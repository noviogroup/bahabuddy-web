/**
 * Safe same-origin relative paths for post-auth / post-onboarding redirects.
 *
 * Every value that arrives from a query string (`?redirect=`, `?next=`) and
 * is later handed to `router.push`, `NextResponse.redirect` or embedded in a
 * Supabase `emailRedirectTo` must go through this helper. It accepts only a
 * single-slash absolute path on this origin and rejects:
 *   - protocol-relative URLs (`//evil.com`) and backslash variants (`/\evil.com`)
 *   - scheme URLs (`javascript:…`, `https://…`, `data:…`)
 *   - control characters / whitespace tricks browsers strip before parsing
 *   - anything that resolves to another origin once parsed
 */

export const DEFAULT_POST_AUTH_PATH = '/dashboard'

/** Request header middleware sets so server layouts know the current path. */
export const PATHNAME_HEADER = 'x-baha-pathname'

// Parse against a fixed placeholder origin so the check is identical on the
// server (no window) and in the browser.
const PLACEHOLDER_ORIGIN = 'https://bahabuddy.invalid'
const MAX_PATH_LENGTH = 2048

// C0 controls, DEL, and C1 controls. Browsers silently drop tab/CR/LF inside
// URLs, which is how `/\t/evil.com` becomes `//evil.com`.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/

/** Returns the path when it is a safe same-origin relative path, else null. */
export function getSafeRelativePath(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const value = input
  if (!value || value.length > MAX_PATH_LENGTH) return null
  if (CONTROL_CHARS.test(value)) return null
  if (value.includes('\\')) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null

  let parsed: URL
  try {
    parsed = new URL(value, PLACEHOLDER_ORIGIN)
  } catch {
    return null
  }
  if (parsed.origin !== PLACEHOLDER_ORIGIN) return null

  return value
}

/** Like getSafeRelativePath but always returns a usable path. */
export function safeRelativePath(input: unknown, fallback: string = DEFAULT_POST_AUTH_PATH): string {
  return getSafeRelativePath(input) ?? fallback
}
