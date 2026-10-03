/**
 * Shared helpers for legacy route shims (/hotel, /hotels, /guided-day …).
 *
 * The root `src/app/loading.tsx` makes every page stream, so a redirect
 * thrown from the page body arrives after a 200 status has already been
 * sent (the browser follows a meta refresh instead of a real 308). Throwing
 * the redirect from `generateMetadata` runs before streaming starts, so
 * crawlers see a genuine permanent (308) redirect. Each shim calls the
 * redirect from both places: metadata for the status code, the page body as
 * a defensive fallback.
 */

import { permanentRedirect } from 'next/navigation'

export type LegacySearchParams = Record<string, string | string[] | undefined>

export function withLegacyQuery(path: string, searchParams: LegacySearchParams = {}): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    const first = Array.isArray(value) ? value[0] : value
    if (first) params.set(key, first)
  }
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export function legacyPermanentRedirect(path: string, searchParams?: LegacySearchParams): never {
  permanentRedirect(withLegacyQuery(path, searchParams))
}
