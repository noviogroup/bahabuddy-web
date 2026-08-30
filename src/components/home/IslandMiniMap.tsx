'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

export type IslandMapEntry = {
  name: string
  href: string
  image: string
  use: string
  top: string
  style: string
  latitude: number
  longitude: number
  mapNote: string
}

type IslandMiniMapProps = {
  islands: IslandMapEntry[]
}

type MapStatus = 'loading' | 'ready' | 'no-key' | 'error'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoogleMaps = any

declare global {
  interface Window {
    google?: { maps: GoogleMaps }
    __bahaInitGoogleMaps?: () => void
  }
}

const BAHAMAS_CENTER = { lat: 24.93, lng: -76.9 }
const BAHAMAS_BOUNDS = {
  north: 27.95,
  south: 22.15,
  west: -80.55,
  east: -72.85,
}

const MAP_STYLES = [
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#98d8f0' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#e9f4e8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#52606d' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

let googleMapsLoadPromise: Promise<void> | null = null

export default function IslandMiniMap({ islands }: IslandMiniMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<GoogleMaps | null>(null)
  const clearPinsRef = useRef<(() => void) | null>(null)
  const [status, setStatus] = useState<MapStatus>('loading')
  const [activeName, setActiveName] = useState(islands[0]?.name ?? '')
  const activeIsland = useMemo(
    () => islands.find((island) => island.name === activeName) ?? islands[0],
    [activeName, islands],
  )

  useEffect(() => {
    let cancelled = false

    async function initMap() {
      setStatus('loading')

      const mapsConfig = await fetchGoogleMapsConfig()

      if (!mapsConfig?.key) {
        if (!cancelled) setStatus('no-key')
        return
      }

      try {
        await loadGoogleMaps(mapsConfig.key)
      } catch {
        if (!cancelled) setStatus('error')
        return
      }

      if (cancelled || !window.google?.maps || !mapRef.current) return

      const gmaps = window.google.maps
      const mapOptions: Record<string, unknown> = {
        center: BAHAMAS_CENTER,
        zoom: 7,
        minZoom: 6,
        maxZoom: 11,
        mapTypeId: 'roadmap',
        backgroundColor: '#98d8f0',
        restriction: {
          latLngBounds: BAHAMAS_BOUNDS,
          strictBounds: false,
        },
        clickableIcons: false,
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true,
      }

      if (mapsConfig.mapId) {
        mapOptions.mapId = mapsConfig.mapId
      } else {
        mapOptions.styles = MAP_STYLES
      }

      const map = new gmaps.Map(mapRef.current, mapOptions)

      mapInstanceRef.current = map

      const bounds = new gmaps.LatLngBounds()
      islands.forEach((island) => bounds.extend({ lat: island.latitude, lng: island.longitude }))
      map.fitBounds(bounds, 58)

      if (!cancelled) setStatus('ready')
    }

    initMap()

    return () => {
      cancelled = true
      clearPinsRef.current?.()
    }
  }, [islands])

  useEffect(() => {
    if (status !== 'ready' || !window.google?.maps || !mapInstanceRef.current) return

    clearPinsRef.current?.()
    clearPinsRef.current = renderIslandPins({
      gmaps: window.google.maps,
      map: mapInstanceRef.current,
      islands,
      activeName,
      onSelect: setActiveName,
    })

    const selected = islands.find((island) => island.name === activeName)
    if (selected) {
      mapInstanceRef.current.panTo({ lat: selected.latitude, lng: selected.longitude })
    }
  }, [activeName, islands, status])

  if (!activeIsland) return null

  return (
    <div
      className="mb-8 overflow-hidden rounded-baha-xl border border-brand-100 bg-white shadow-card"
      role="group"
      aria-label="Interactive Bahamas island map"
    >
      <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="relative min-h-[30rem] bg-[#98d8f0] lg:min-h-[34rem]">
          <div
            ref={mapRef}
            role="region"
            aria-label="Interactive Google map of The Bahamas"
            data-testid="bahamas-google-map"
            className="absolute inset-0"
          />

          {status !== 'ready' && (
            <div className="absolute inset-0 bg-[#98d8f0]">
              <div className="absolute inset-0 opacity-80" aria-hidden="true">
                {islands.map((island) => {
                  const position = projectIslandPosition(island.longitude, island.latitude)
                  const active = island.name === activeIsland.name

                  return (
                    <span
                      key={island.name}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-2.5 py-1.5 text-xs font-black text-night shadow-soft ${
                        active ? 'ring-2 ring-brand-500' : ''
                      }`}
                      style={{ left: `${position.x}%`, top: `${position.y}%` }}
                    >
                      {island.name}
                    </span>
                  )
                })}
              </div>
              <div className="absolute inset-x-4 top-4 rounded-baha-lg bg-white/90 p-4 shadow-soft backdrop-blur">
                <p className="text-xs font-black uppercase text-brand-700">Bahamas map</p>
                <p className="mt-1 text-sm font-semibold text-charcoal">
                  {status === 'loading'
                    ? 'Loading the live Google map.'
                    : status === 'no-key'
                      ? 'Add GOOGLE_MAPS_API_KEY to enable the live island map.'
                      : 'The live map could not load. The island guide is still available.'}
                </p>
              </div>
            </div>
          )}

          <div className="absolute left-4 top-4 z-10 rounded-full bg-white/95 px-4 py-2 text-xs font-black uppercase text-brand-700 shadow-soft">
            Real Bahamas map
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-10 max-w-md rounded-baha-lg bg-white/96 p-4 shadow-card backdrop-blur-sm">
            <div className="flex gap-3">
              <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-baha-md bg-brand-50">
                <Image
                  src={activeIsland.image}
                  alt={`${activeIsland.name} in The Bahamas`}
                  fill
                  className="object-cover"
                  sizes="96px"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-brand-700">Selected island</p>
                <h3 className="mt-1 text-xl font-bold leading-tight text-night">{activeIsland.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-charcoal">{activeIsland.mapNote}</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="flex flex-col bg-white p-5 sm:p-6">
          <p className="text-xs font-black uppercase text-brand-700">Island geography</p>
          <h3 className="mt-2 text-2xl font-bold leading-tight text-night">See how the islands relate before you plan.</h3>
          <p className="mt-3 text-sm font-medium leading-6 text-charcoal">
            Tap an island to understand distance, trip feel, and what kind of Bahamas day it supports.
          </p>

          <div className="mt-5 grid gap-2" aria-label="Bahamas islands">
            {islands.slice(0, 8).map((island) => {
              const active = island.name === activeIsland.name

              return (
                <button
                  key={island.name}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Show ${island.name} on the Bahamas map`}
                  onClick={() => setActiveName(island.name)}
                  className={`flex items-center justify-between gap-3 rounded-baha-md border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                    active ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-gray-200 bg-white text-night hover:border-brand-200 hover:bg-brand-50/70'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{island.name}</span>
                    <span className="block truncate text-xs font-medium text-charcoal">{island.use}</span>
                  </span>
                  </button>
              )
            })}
          </div>

          <dl className="mt-5 grid gap-3 text-sm">
            <div className="rounded-baha-md bg-brand-50 px-3 py-2">
              <dt className="text-xs font-black uppercase text-brand-700">Best fit</dt>
              <dd className="mt-1 font-bold text-night">{activeIsland.use}</dd>
            </div>
            <div className="rounded-baha-md bg-brand-50 px-3 py-2">
              <dt className="text-xs font-black uppercase text-brand-700">Trip feel</dt>
              <dd className="mt-1 font-bold text-night">{activeIsland.style}</dd>
            </div>
          </dl>

          <div className="mt-auto pt-5">
            <Link
              href={activeIsland.href}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              Explore {activeIsland.name}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

async function fetchGoogleMapsConfig() {
  try {
    const response = await fetch('/api/maps/key')

    if (!response.ok) return null

    const data = await response.json()

    const key = typeof data.key === 'string' ? data.key.trim() : ''
    const mapId = typeof data.mapId === 'string' ? data.mapId.trim() : ''

    return key ? { key, mapId: mapId || null } : null
  } catch {
    return null
  }
}

function loadGoogleMaps(key: string) {
  if (window.google?.maps) return Promise.resolve()
  if (googleMapsLoadPromise) return googleMapsLoadPromise

  googleMapsLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-baha-google-maps="true"]')

    if (existingScript) {
      if (window.google?.maps?.Map) {
        resolve()
        return
      }

      window.__bahaInitGoogleMaps = () => resolve()
      existingScript.addEventListener('error', () => reject(new Error('Google Maps failed to load')), { once: true })
      return
    }

    window.__bahaInitGoogleMaps = () => resolve()

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker&callback=__bahaInitGoogleMaps&loading=async`
    script.async = true
    script.defer = true
    script.dataset.bahaGoogleMaps = 'true'
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })

  return googleMapsLoadPromise
}

function renderIslandPins({
  gmaps,
  map,
  islands,
  activeName,
  onSelect,
}: {
  gmaps: GoogleMaps
  map: GoogleMaps
  islands: IslandMapEntry[]
  activeName: string
  onSelect: (name: string) => void
}) {
  class IslandPinOverlay extends gmaps.OverlayView {
    private element: HTMLButtonElement | null = null
    private readonly island: IslandMapEntry
    private readonly active: boolean

    constructor(island: IslandMapEntry, active: boolean) {
      super()
      this.island = island
      this.active = active
    }

    onAdd() {
      const button = document.createElement('button')
      button.type = 'button'
      button.setAttribute('aria-label', `Select ${this.island.name} map pin`)
      button.className = [
        'absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 text-xs font-black text-night shadow-soft transition-transform hover:scale-105',
        this.active ? 'z-20 ring-2 ring-brand-500' : 'z-10 ring-1 ring-white/70',
      ].join(' ')
      button.innerHTML = `
        <span class="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-700" aria-hidden="true">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 5.5-8 11-8 11S4 15.5 4 10a8 8 0 1 1 16 0Z"></path>
            <circle cx="12" cy="10" r="2.6"></circle>
          </svg>
        </span>
        <span>${this.island.name}</span>
      `
      button.addEventListener('click', () => onSelect(this.island.name))
      this.element = button
      this.getPanes()?.overlayMouseTarget.appendChild(button)
    }

    draw() {
      if (!this.element) return

      const projection = this.getProjection()
      const point = projection.fromLatLngToDivPixel(new gmaps.LatLng(this.island.latitude, this.island.longitude))

      if (!point) return

      this.element.style.left = `${point.x}px`
      this.element.style.top = `${point.y}px`
    }

    onRemove() {
      this.element?.remove()
      this.element = null
    }
  }

  const overlays = islands.map((island) => {
    const overlay = new IslandPinOverlay(island, island.name === activeName)
    overlay.setMap(map)
    return overlay
  })

  return () => overlays.forEach((overlay) => overlay.setMap(null))
}

function projectIslandPosition(longitude: number, latitude: number) {
  const x = ((longitude - BAHAMAS_BOUNDS.west) / (BAHAMAS_BOUNDS.east - BAHAMAS_BOUNDS.west)) * 100
  const north = mercatorLatitude(BAHAMAS_BOUNDS.north)
  const south = mercatorLatitude(BAHAMAS_BOUNDS.south)
  const current = mercatorLatitude(latitude)
  const y = ((north - current) / (north - south)) * 100

  return {
    x: Math.min(95, Math.max(5, x)),
    y: Math.min(90, Math.max(10, y)),
  }
}

function mercatorLatitude(latitude: number) {
  const radians = (latitude * Math.PI) / 180

  return Math.log(Math.tan(Math.PI / 4 + radians / 2))
}
