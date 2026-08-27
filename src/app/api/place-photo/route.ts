/**
 * /api/place-photo — server-side fallback resolver for cached place photo refs.
 *
 * Why this route exists:
 *   - Some cached source place rows store photo references instead of
 *     Supabase Storage URLs. Provider photo APIs require server-held keys,
 *     so the browser must never render those URLs directly.
 *   - We also want stable cache headers, so the same place photo
 *     doesn't burn provider API quota on every view.
 *
 * Resolution path (companion to `src/lib/place-photos.ts`):
 *   - Client renders `<Image src="/api/place-photo?ref=...&w=...">`
 *   - This route fetches the photo with the server-side provider key
 *   - Returns the binary with `Cache-Control: public, max-age=31536000,
 *     immutable` so the CDN + browser cache aggressively
 *
 * Graceful degradation:
 *   - If no provider photo key is set, return 503 + a tiny SVG
 *     placeholder so the `<Image>` shows a brand-colored tile instead
 *     of a broken icon. The next preferred path is to populate
 *     the cached photo storage URL via the sync job and avoid needing to
 *     hit this route at all.
 *
 * Security:
 *   - Validates `ref` looks like a provider photo reference (alphanumeric
 *     + a small charset) so the route can't be abused to fetch arbitrary
 *     URLs through us.
 *   - Caps the `w` (width) param to a reasonable range so we can't be
 *     coerced into fetching huge images at high quota cost.
 */

import { NextResponse } from "next/server";

// Routes default to the edge cache, but we want fine-grained control.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_WIDTH = 100;
const MAX_WIDTH = 2000;
const DEFAULT_WIDTH = 800;

// Provider photo references are URL-safe and bounded; this regex is a
// belt-and-suspenders check so we don't proxy arbitrary URLs.
const REFERENCE_PATTERN = /^[A-Za-z0-9_\-]+$/;

/** 1x1 transparent SVG, returned when we can't fetch the real image.
 *  Renders as an empty box so callers can overlay their own fallback UI. */
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"><rect width="1" height="1" fill="#e5e7eb"/></svg>`;

function placeholderResponse(status: number, reason: string): Response {
  return new NextResponse(PLACEHOLDER_SVG, {
    status,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=60",
      "X-Place-Photo-Reason": reason,
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  const wRaw = searchParams.get("w");

  // Validate inputs first — bail out cheaply on bad requests.
  if (!ref || !REFERENCE_PATTERN.test(ref)) {
    return placeholderResponse(400, "invalid-ref");
  }
  const w = clampWidth(wRaw ? Number.parseInt(wRaw, 10) : DEFAULT_WIDTH);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    // Soft-fail: callers should rely on cached storage_url in
    // production. Without a key we can't fetch live.
    return placeholderResponse(503, "no-api-key");
  }

  // Provider photo APIs can redirect to the actual CDN image. We follow
  // the redirect server-side and stream the result back to the client,
  // so the API key never leaves the server.
  const googleUrl = new URL("https://maps.googleapis.com/maps/api/place/photo");
  googleUrl.searchParams.set("maxwidth", String(w));
  googleUrl.searchParams.set("photo_reference", ref);
  googleUrl.searchParams.set("key", apiKey);

  let upstream: Response;
  try {
    upstream = await fetch(googleUrl.toString(), {
      // We want the actual image bytes, not the 302 — `redirect: 'follow'`
      // is the default but spell it out for clarity.
      redirect: "follow",
      // No revalidation — same reference always returns the same image.
      cache: "force-cache",
    });
  } catch (err) {
    console.error("[/api/place-photo] upstream fetch threw", err);
    return placeholderResponse(502, "upstream-error");
  }

  if (!upstream.ok || !upstream.body) {
    return placeholderResponse(
      upstream.status === 404 ? 404 : 502,
      `upstream-${upstream.status}`,
    );
  }

  const contentType = upstream.headers.get("Content-Type") ?? "image/jpeg";

  // Pass the bytes through with aggressive caching. Photo content is
  // immutable per-reference, so a year of edge caching is safe.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

/** Clamp width to the supported range and fall back to default on NaN. */
function clampWidth(w: number): number {
  if (!Number.isFinite(w)) return DEFAULT_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.trunc(w)));
}
