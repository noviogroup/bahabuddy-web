/**
 * Whether `next/image` can optimise a URL: a local `/public` path or a host
 * allowlisted in `next.config.mjs` `images.remotePatterns`. Any other remote
 * URL must stay `unoptimized`, or the image optimiser rejects it. Keep this
 * list in sync with next.config.mjs.
 */
const OPTIMIZABLE_HOSTS: ReadonlyArray<{ hostname: string | RegExp; pathname?: RegExp }> = [
  { hostname: /^[a-z0-9-]+\.supabase\.co$/i, pathname: /^\/storage\/v1\/object\/public\// },
  { hostname: 'cdn.sanity.io' },
  { hostname: 'tempo.cdn.tambourine.com' },
  { hostname: 'www.nassauparadiseisland.com' },
  { hostname: 'maps.googleapis.com' },
  { hostname: 'images.unsplash.com' },
  { hostname: 'upload.wikimedia.org' },
]

export function canOptimizeImageSrc(src: string | null | undefined): boolean {
  const value = src?.trim()
  if (!value) return false
  if (value.startsWith('/')) return !value.startsWith('//')

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    return OPTIMIZABLE_HOSTS.some(({ hostname, pathname }) => {
      const hostMatches = typeof hostname === 'string'
        ? url.hostname === hostname
        : hostname.test(url.hostname)
      return hostMatches && (!pathname || pathname.test(url.pathname))
    })
  } catch {
    return false
  }
}
