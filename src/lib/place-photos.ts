/**
 * Legacy provider-photo compatibility shim.
 *
 * Cached Google photo resource names are not reusable media identifiers and
 * must not be rendered. This module intentionally returns null until a fresh
 * details request and fully attributed UI are implemented. Canonical
 * owned/licensed media uses the normal place fields and does not pass here.
 */

import "server-only";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Shape of a single entry in cached place photo JSONB. */
export interface CachedPlacePhotoMeta {
  reference: string;
  width?: number;
  height?: number;
}

/** Minimum shape of a cached place row needed to resolve its primary
 *  photo. Callers can pass full rows or a hand-built subset. */
export interface PhotoBearingPlace {
  id: string;
  photos?: CachedPlacePhotoMeta[] | null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Resolve the primary photo URL for a single place. Walks the
 * resolution chain (provider proxy → null).
 *
 * @param place - place row containing `id` and optionally `photos`
 * @param width - target render width for cached/proxied image resolution
 */
export async function getPlacePhotoUrl(
  place: PhotoBearingPlace,
  width = 800,
): Promise<string | null> {
  void place;
  void width;
  return null;
}

/**
 * Batch variant of `getPlacePhotoUrl`. Resolves photo URLs for many
 * places without exposing provider credentials.
 *
 * Returns a map of place.id → url-or-null.
 */
export async function getPlacePhotoUrls(
  places: readonly PhotoBearingPlace[],
  width = 800,
): Promise<Map<string, string | null>> {
  void width;
  const out = new Map<string, string | null>();
  for (const place of places) {
    out.set(place.id, null);
  }
  return out;
}
