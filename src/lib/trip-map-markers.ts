/**
 * trip-map-markers — pure helpers for building map markers from trip data.
 *
 * Lives in /lib (not /components) because it's called from server components
 * (e.g. `app/(dashboard)/trip/[id]/page.tsx`).
 *
 * The Next.js App Router gotcha that prompted this split:
 *   - `components/TripMap.tsx` is marked `'use client'` (it uses Google Maps)
 *   - A named export from a `'use client'` file imported into a server
 *     component becomes a serialized client reference, NOT the actual
 *     function. Calling it throws "X is not a function".
 *   - Pure helpers therefore have to live OUTSIDE any `'use client'` file.
 *
 * `MapMarker` and the coord lookups are imported by both:
 *   - the TripMap client component (to render markers)
 *   - the trip detail server page (to build them from DB rows)
 */

// Bahamas island → approximate center coordinates
export const ISLAND_COORDS: Record<string, { lat: number; lng: number }> = {
  nassau: { lat: 25.048, lng: -77.312 },
  'nassau-paradise-island': { lat: 25.048, lng: -77.312 },
  'paradise island': { lat: 25.085, lng: -77.321 },
  exuma: { lat: 23.562, lng: -75.878 },
  'the exumas': { lat: 23.562, lng: -75.878 },
  exumas: { lat: 23.562, lng: -75.878 },
  eleuthera: { lat: 25.145, lng: -76.141 },
  'harbour island': { lat: 25.498, lng: -76.633 },
  abacos: { lat: 26.511, lng: -77.084 },
  'the abacos': { lat: 26.511, lng: -77.084 },
  bimini: { lat: 25.697, lng: -79.265 },
  andros: { lat: 24.298, lng: -77.795 },
  'grand bahama': { lat: 26.559, lng: -78.357 },
  freeport: { lat: 26.559, lng: -78.357 },
  'long island': { lat: 23.165, lng: -75.129 },
  'cat island': { lat: 24.314, lng: -75.547 },
  'san salvador': { lat: 24.057, lng: -74.474 },
  inagua: { lat: 20.949, lng: -73.569 },
}

// Major Bahamas airports (IATA) → coordinates
export const AIRPORT_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  NAS: { lat: 25.039, lng: -77.466, name: 'Nassau Lynden Pindling Intl' },
  GGT: { lat: 23.563, lng: -75.877, name: 'Exuma Intl' },
  ELH: { lat: 25.475, lng: -76.685, name: 'North Eleuthera' },
  GHB: { lat: 25.284, lng: -76.329, name: "Governor's Harbour, Eleuthera" },
  MHH: { lat: 26.511, lng: -77.084, name: 'Marsh Harbour, Abacos' },
  BIM: { lat: 25.697, lng: -79.264, name: 'South Bimini' },
  SAQ: { lat: 24.063, lng: -77.796, name: 'San Andros' },
  FPO: { lat: 26.559, lng: -78.357, name: 'Grand Bahama Intl' },
  LGI: { lat: 23.176, lng: -75.144, name: 'Long Island' },
  MIA: { lat: 25.796, lng: -80.287, name: 'Miami International' },
  FLL: { lat: 26.072, lng: -80.152, name: 'Fort Lauderdale' },
  MCO: { lat: 28.429, lng: -81.309, name: 'Orlando' },
  ATL: { lat: 33.641, lng: -84.427, name: 'Atlanta' },
  JFK: { lat: 40.640, lng: -73.779, name: 'New York JFK' },
}

export function getIslandCoords(name: string): { lat: number; lng: number } | null {
  const key = name.toLowerCase().trim()
  return ISLAND_COORDS[key] ?? null
}

export function getAirportCoords(code: string): { lat: number; lng: number; name: string } | null {
  return AIRPORT_COORDS[code.toUpperCase()] ?? null
}

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label: string
  detail?: string
  type: 'activity' | 'hotel' | 'airport'
}

export function buildMarkersFromTripData(
  activities: Array<{ id: string; activity_name: string; island?: string | null; notes?: string | null }>,
  accommodations: Array<{ id: string; name: string; island?: string | null }>,
  flights: Array<{ id: string; origin: string; destination: string; airline?: string | null }>,
): MapMarker[] {
  const markers: MapMarker[] = []
  const seen = new Set<string>()

  for (const a of activities) {
    const island = a.island ?? ''
    const coords = getIslandCoords(island)
    if (!coords) continue
    const key = `${coords.lat},${coords.lng}`
    // Slight jitter to avoid stacking markers on the same island
    const jitter = seen.has(key) ? (Math.random() - 0.5) * 0.05 : 0
    seen.add(key)
    markers.push({
      id: `act-${a.id}`,
      lat: coords.lat + jitter,
      lng: coords.lng + jitter,
      label: a.activity_name,
      detail: a.notes ?? island ?? undefined,
      type: 'activity',
    })
  }

  for (const acc of accommodations) {
    const island = acc.island ?? ''
    const coords = getIslandCoords(island)
    if (!coords) continue
    const key = `hotel-${island}`
    if (seen.has(key)) continue
    seen.add(key)
    markers.push({
      id: `acc-${acc.id}`,
      lat: coords.lat + 0.02,
      lng: coords.lng + 0.02,
      label: acc.name,
      detail: island,
      type: 'hotel',
    })
  }

  for (const f of flights) {
    for (const code of [f.origin, f.destination]) {
      const airport = getAirportCoords(code)
      if (!airport) continue
      const key = `airport-${code}`
      if (seen.has(key)) continue
      seen.add(key)
      markers.push({
        id: `flight-${f.id}-${code}`,
        lat: airport.lat,
        lng: airport.lng,
        label: `${code} — ${airport.name}`,
        detail: f.airline ?? undefined,
        type: 'airport',
      })
    }
  }

  return markers
}
