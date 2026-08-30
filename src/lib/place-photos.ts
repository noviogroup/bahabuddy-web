/**
 * Place photos — resolve Supabase cached place imagery to renderable URLs.
 *
 * Place source photo JSON is cached by the backend enrichment pipeline in the
 * source-table `photos` schema field: an array of `{ reference: string,
 * width: number, height: number }` records as originally returned by source
 * provider detail payloads. The `reference` (a.k.a. `photo_reference`) is NOT
 * an image URL.
 *
 * Resolution chain (in order):
 *
 *   1. Cached place photo storage URL — if the sync job has cached the photo
 *      into Supabase Storage, we serve that directly. No egress, no API key,
 *      no rate limits.
 *
 *   2. `/api/place-photo?ref=<photo_reference>&w=<width>` — server-side
 *      fallback resolver for cached photo references. This keeps provider
 *      keys out of the client and should be less preferred than cached
 *      Supabase Storage URLs.
 *
 *   3. `null` — no photo available. Callers should render a brand
 *      gradient placeholder instead of a broken `<Image>`.
 *
 * Server-only because the storage_url lookup hits Supabase via the
 * server-side client. The proxy URL it returns is fine to render
 * from a Client Component (it's just a string).
 */

import 'server-only'
import { cache } from 'react'
import { CACHED_PLACE_PHOTO_TABLE } from '@/lib/place-inventory'
import { createClient } from '@/lib/supabase/server'

// ─── Types ──────────────────────────────────────────────────────────────────

/** Shape of a single entry in cached place photo JSONB. */
export interface CachedPlacePhotoMeta {
  reference: string
  width?: number
  height?: number
}

/** Minimum shape of a cached place row needed to resolve its primary
 *  photo. Callers can pass full rows or a hand-built subset. */
export interface PhotoBearingPlace {
  id: string
  photos?: CachedPlacePhotoMeta[] | null
}

// ─── Storage URL lookup (cached) ────────────────────────────────────────────

interface CachedPhotoRow {
  place_id: string
  storage_url: string | null
}

/**
 * Batch-fetch cached storage URLs for a set of place IDs. React-cached
 * so a page rendering 20 hotel cards hits Supabase once.
 *
 * Returns a map of place_id → storage_url (or null when not cached).
 */
const fetchCachedStorageUrls = cache(
  async (placeIds: readonly string[]): Promise<Map<string, string | null>> => {
    const out = new Map<string, string | null>()
    if (placeIds.length === 0) return out

    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from(CACHED_PLACE_PHOTO_TABLE)
        .select('place_id, storage_url')
        .in('place_id', placeIds as string[])
        .not('storage_url', 'is', null)

      if (error || !data) {
        if (error) console.warn('[place-photos] storage_url lookup failed', error.message)
        return out
      }

      // First storage_url per place wins (table may have multiple
      // photos per place — we pick whichever appears first).
      for (const row of data as CachedPhotoRow[]) {
        if (!out.has(row.place_id) && row.storage_url) {
          out.set(row.place_id, row.storage_url)
        }
      }
      return out
    } catch (err) {
      console.warn('[place-photos] storage_url lookup threw', err)
      return out
    }
  },
)

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Resolve the primary photo URL for a single place. Walks the
 * resolution chain (cached storage → proxy route → null).
 *
 * @param place - place row containing `id` and optionally `photos`
 * @param width - target render width for cached/proxied image resolution
 */
export async function getPlacePhotoUrl(
  place: PhotoBearingPlace,
  width = 800,
): Promise<string | null> {
  // 1. Cached in Supabase Storage?
  const cached = await fetchCachedStorageUrls([place.id])
  const storageUrl = cached.get(place.id)
  if (storageUrl) return storageUrl

  // 2. Have a photo_reference? Proxy through our own route.
  const firstPhoto = place.photos?.[0]
  if (firstPhoto?.reference) {
    return buildProxyUrl(firstPhoto.reference, width)
  }

  // 3. Nothing to show.
  return null
}

/**
 * Batch variant of `getPlacePhotoUrl`. Resolves photo URLs for many
 * places in a single Supabase round-trip. Use this on list pages
 * (hotels grid, attractions grid, etc.) to avoid N+1 queries.
 *
 * Returns a map of place.id → url-or-null.
 */
export async function getPlacePhotoUrls(
  places: readonly PhotoBearingPlace[],
  width = 800,
): Promise<Map<string, string | null>> {
  const ids = places.map(p => p.id)
  const cached = await fetchCachedStorageUrls(ids)

  const out = new Map<string, string | null>()
  for (const place of places) {
    const storage = cached.get(place.id)
    if (storage) {
      out.set(place.id, storage)
      continue
    }
    const firstPhoto = place.photos?.[0]
    out.set(place.id, firstPhoto?.reference ? buildProxyUrl(firstPhoto.reference, width) : null)
  }
  return out
}

/**
 * Build a relative URL to our `/api/place-photo` proxy. Relative so
 * it works correctly under any deploy URL (production, preview, local).
 */
function buildProxyUrl(reference: string, width: number): string {
  const params = new URLSearchParams({
    ref: reference,
    w: String(width),
  })
  return `/api/place-photo?${params.toString()}`
}
