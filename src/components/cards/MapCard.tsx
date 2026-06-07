'use client'

/**
 * MapCard — visual trip map preview.
 *
 * Phase 4 redesign vs the old inline version:
 *
 *   The old MapCard was a gradient header with a button to nothing.
 *   This version renders an actual map preview using the Google Static
 *   Maps API \u2014 an `<img>` tag with all the trip locations as colored,
 *   labeled markers. Tapping the card opens the route in Google Maps
 *   (search mode for a single point, directions mode with waypoints
 *   for multi-stop trips).
 *
 * Architecture notes:
 *
 *   - Static Maps over the interactive Maps JS API. Static Maps:
 *       * Zero JS runtime (just an img tag) \u2192 no bundle bloat
 *       * Costs are per-load, not per-session \u2192 cheaper at chat scale
 *       * Works inside chat bubbles without portal/z-index gymnastics
 *     The full interactive map already exists on the trip detail page;
 *     this card is for *previews*, not interaction.
 *
 *   - API key surfaced via `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (the same
 *     env var TripMap uses). When absent, the card degrades to a
 *     branded gradient with the same "Open in Maps" affordance \u2014 the
 *     CTA still works because Google Maps doesn't need a key for the
 *     end-user web URL.
 *
 *   - Island name \u2192 coordinate resolution piggybacks on
 *     `getIslandCoords` from `lib/trip-map-markers.ts` so we don't
 *     duplicate the coordinate table.
 *
 *   - Marker color matches the marker type: hotels brand-blue,
 *     activities gold, restaurants coral, airports palm. Same color
 *     vocabulary as the cards themselves \u2014 the user can scan the map
 *     and know what they're looking at without a legend.
 */

import { CardShell } from './shared'
import { getIslandCoords } from '@/lib/trip-map-markers'

// \u2500\u2500\u2500 Types \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export type MapLocationType = 'hotel' | 'activity' | 'restaurant' | 'airport' | 'island'

export interface MapLocation {
  name: string
  lat?: number
  lng?: number
  type?: MapLocationType
}

export interface MapCardData {
  title?: string
  subtitle?: string
  /** Fallback: when no `locations` are provided, resolve island names via
   *  `ISLAND_COORDS` and render those as pins. */
  islands?: string[]
  /** Preferred: explicit location list with optional lat/lng. */
  locations?: MapLocation[]
}

interface Props {
  data: MapCardData
  className?: string
}

// \u2500\u2500\u2500 Static map URL builders \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/** Tailwind brand-aligned marker colors. Google Static Maps takes
 *  hex without the leading `#`, prefixed with `0x`. */
const MARKER_COLOR: Record<MapLocationType, string> = {
  hotel:      '0x2E78D2', // brand-500
  activity:   '0xF5B731', // gold-500
  restaurant: '0xE45757', // coral-500
  airport:    '0x6B7280', // gray-500
  island:     '0x4F9D6F', // palm-500
}

interface ResolvedPoint {
  name: string
  lat: number
  lng: number
  type: MapLocationType
}

/**
 * Resolve the card payload to a flat list of plottable points.
 *
 * Priority is `locations` first, then `islands`. Within each list we
 * use the explicit lat/lng when present, falling back to the island
 * coord table when only a name is provided. Anything that can't be
 * resolved is silently dropped \u2014 a card with 3 stops where only 2
 * resolve still renders meaningfully.
 */
function resolvePoints(data: MapCardData): ResolvedPoint[] {
  const out: ResolvedPoint[] = []

  if (data.locations && data.locations.length > 0) {
    for (const loc of data.locations) {
      if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        out.push({ name: loc.name, lat: loc.lat, lng: loc.lng, type: loc.type ?? 'island' })
        continue
      }
      const coords = getIslandCoords(loc.name)
      if (coords) {
        out.push({ name: loc.name, lat: coords.lat, lng: coords.lng, type: loc.type ?? 'island' })
      }
    }
  }

  if (out.length === 0 && data.islands) {
    for (const name of data.islands) {
      const coords = getIslandCoords(name)
      if (coords) out.push({ name, lat: coords.lat, lng: coords.lng, type: 'island' })
    }
  }

  return out
}

/**
 * Build the Google Static Maps API URL.
 *
 * When `points` is non-empty Google auto-fits the viewport to contain
 * all markers, so we don't set center/zoom explicitly. When empty we
 * center on Nassau with a Bahamas-region zoom so the card still shows
 * something useful.
 *
 * Each marker is colored by type and labeled with a sequence letter
 * (A, B, C\u2026). 9+ points fall back to a numeric label \u2014 Google Static
 * Maps tolerates single-character labels and silently drops the rest.
 */
function buildStaticMapUrl(points: ResolvedPoint[], apiKey: string): string {
  const params: string[] = ['size=600x300', 'scale=2', 'maptype=roadmap']

  if (points.length === 0) {
    params.push('center=Nassau,Bahamas', 'zoom=7')
  } else {
    points.forEach((p, i) => {
      const color = MARKER_COLOR[p.type] ?? MARKER_COLOR.island
      // Static Maps caps labels at a single alphanumeric. After 9 we
      // wrap to letters; after Z we just drop the label and rely on color.
      const label = i < 9 ? String(i + 1) : i < 35 ? String.fromCharCode(65 + (i - 9)) : ''
      const labelPart = label ? `label:${label}%7C` : ''
      params.push(`markers=color:${color}%7C${labelPart}${p.lat},${p.lng}`)
    })
  }

  params.push(`key=${encodeURIComponent(apiKey)}`)
  return `https://maps.googleapis.com/maps/api/staticmap?${params.join('&')}`
}

/**
 * Build the user-facing Google Maps URL that opens when the card is
 * tapped. Uses Maps' universal URL scheme which doesn't require a key.
 *
 *   - 0 points  \u2192 search for "Bahamas"
 *   - 1 point   \u2192 search at the single coordinate
 *   - 2+ points \u2192 directions mode with waypoints, origin = first,
 *                 destination = last. Google may show the path as
 *                 flight/ferry connectors since most Bahamas hops
 *                 cross water; that's fine \u2014 the user just wants the
 *                 spatial layout.
 */
function googleMapsOpenUrl(points: ResolvedPoint[]): string {
  if (points.length === 0) {
    return 'https://www.google.com/maps/search/?api=1&query=Bahamas'
  }
  if (points.length === 1) {
    const p = points[0]
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
  }
  const origin = points[0]
  const destination = points[points.length - 1]
  const waypoints = points.slice(1, -1).map(p => `${p.lat},${p.lng}`).join('|')
  let url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${origin.lat},${origin.lng}` +
    `&destination=${destination.lat},${destination.lng}`
  if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`
  return url
}

// \u2500\u2500\u2500 Icons \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const I = {
  external: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  pin: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
}

// \u2500\u2500\u2500 Component \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export function MapCard({ data, className }: Props) {
  const points = resolvePoints(data)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const previewUrl = apiKey ? buildStaticMapUrl(points, apiKey) : null
  const openUrl = googleMapsOpenUrl(points)

  const title = data.title ?? 'Trip Map'
  const subtitle =
    data.subtitle
    ?? (points.length > 0
        ? `${points.length} ${points.length === 1 ? 'stop' : 'stops'} \u00b7 ${points.map(p => p.name).join(' \u2192 ')}`
        : 'See your itinerary on the map')

  return (
    <CardShell mode="plain" className={className}>
      {/* Preview \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <div className="relative h-36 bg-gradient-to-br from-brand-600/80 to-brand-400">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Map showing ${points.length || 'Bahamas'} location${points.length === 1 ? '' : 's'}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/90">
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              {I.pin}
              {points.length > 0 ? `${points.length} stop${points.length === 1 ? '' : 's'}` : 'Bahamas'}
            </span>
          </div>
        )}
        {/* Subtle dark overlay at the top for the title to sit on */}
        <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" aria-hidden="true" />
        <p className="absolute top-2 left-3 right-3 text-white font-bold text-sm drop-shadow">
          {title}
        </p>
      </div>

      {/* Body \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <div className="p-3 space-y-2">
        <p className="text-xs text-gray-600 leading-snug line-clamp-2">{subtitle}</p>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 w-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
        >
          Open in Google Maps
          <span aria-hidden="true">{I.external}</span>
        </a>
      </div>
    </CardShell>
  )
}
