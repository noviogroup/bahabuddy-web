/**
 * Single source of truth for which image URLs go through the Next/Netlify
 * image optimiser (`next/image` without `unoptimized`).
 *
 * Every remote entry MUST also be listed in next.config.mjs
 * `images.remotePatterns` (tests/components/image-source-policy.test.tsx
 * enforces this), otherwise the optimiser rejects the URL and the card falls
 * back to the placeholder.
 *
 * Deliberately NOT optimised even though some are allowlisted:
 * googleusercontent / maps API photo hosts (provider terms restrict
 * re-hosting/transforming), LiteAPI / TripAdvisor / arbitrary provider CDNs
 * stored in the database (not allowlisted), same-origin API proxies
 * (e.g. /api/place-photo), and SVGs (dangerouslyAllowSVG is off).
 */
const OPTIMIZABLE_REMOTE_HOSTS: ReadonlyArray<{ host: string; pathPrefix?: string }> = [
  { host: ".supabase.co", pathPrefix: "/storage/v1/object/public/" },
  { host: "cdn.sanity.io" },
  { host: "tempo.cdn.tambourine.com" },
  { host: "www.nassauparadiseisland.com" },
  { host: "images.unsplash.com" },
  { host: "upload.wikimedia.org" },
];

export const OPTIMIZABLE_IMAGE_HOSTS = OPTIMIZABLE_REMOTE_HOSTS.map(
  (entry) => entry.host,
);

export function shouldOptimizeImageSrc(src: string): boolean {
  if (/\.svg(?:[?#]|$)/i.test(src)) return false;

  if (src.startsWith("/")) {
    // Local /public assets are optimized; same-origin API proxies
    // (e.g. /api/place-photo) and protocol-relative URLs are not.
    return !src.startsWith("//") && !src.startsWith("/api/");
  }

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  return OPTIMIZABLE_REMOTE_HOSTS.some(({ host, pathPrefix }) => {
    const hostMatches = host.startsWith(".")
      ? url.hostname.endsWith(host)
      : url.hostname === host;
    return hostMatches && (!pathPrefix || url.pathname.startsWith(pathPrefix));
  });
}

/** Null-safe form of {@link shouldOptimizeImageSrc}. */
export function canOptimizeImageSrc(src: string | null | undefined): boolean {
  const value = src?.trim();
  return value ? shouldOptimizeImageSrc(value) : false;
}
