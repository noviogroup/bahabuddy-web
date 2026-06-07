'use client'

/**
 * TripMap — interactive Google Maps view of a trip's geography.
 *
 * Receives pre-built MapMarker[] from a parent (typically the trip
 * detail server page). Coordinate lookups and the marker-building
 * function live in `@/lib/trip-map-markers` so server components
 * can call them — see that file's header for why.
 */

import { useEffect, useRef, useState } from 'react'
import type { MapMarker } from '@/lib/trip-map-markers'

// Re-export so existing `import type { MapMarker } from '@/components/TripMap'`
// callers keep working. (buildMarkersFromTripData lives in /lib now and is
// imported directly from there by server pages.)
export type { MapMarker }

interface Props {
  markers: MapMarker[]
}

const TYPE_COLORS = {
  activity: '#22c55e', // green-500
  hotel: '#3b82f6',   // blue-500
  airport: '#ef4444', // red-500
}

const TYPE_ICONS = {
  activity: '🏝️',
  hotel: '🏨',
  airport: '✈️',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GMaps = any

declare global {
  interface Window {
    google?: { maps: GMaps }
    initGoogleMap?: () => void
  }
}

export default function TripMap({ markers }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<GMaps | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'no-key' | 'error'>('loading')
  const [activeMarker, setActiveMarker] = useState<MapMarker | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      // Fetch key from secure server route
      let key: string | null = null
      try {
        const res = await fetch('/api/maps/key')
        if (res.ok) {
          const json = await res.json()
          key = json.key
        }
      } catch {
        if (!cancelled) setStatus('error')
        return
      }

      if (!key) {
        if (!cancelled) setStatus('no-key')
        return
      }

      // Load Google Maps script if not already loaded
      if (!window.google?.maps) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=marker`
          script.async = true
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Google Maps'))
          document.head.appendChild(script)
        }).catch(() => {
          if (!cancelled) setStatus('error')
        })
      }

      if (cancelled || !window.google?.maps || !mapRef.current) return


      // Default center: Nassau
      const center = markers.length > 0
        ? { lat: markers[0].lat, lng: markers[0].lng }
        : { lat: 25.048, lng: -77.312 }

      const gmaps = window.google!.maps
      const map = new gmaps.Map(mapRef.current, {
        center,
        zoom: markers.length > 1 ? 8 : 10,
        mapTypeId: 'roadmap',
        styles: [
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#a0d8ef' }] },
          { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f0f4e8' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        ],
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      })
      mapInstanceRef.current = map

      const bounds = new gmaps.LatLngBounds()
      const infoWindow = new gmaps.InfoWindow()

      for (const m of markers) {
        const color = TYPE_COLORS[m.type]
        const icon = TYPE_ICONS[m.type]

        const marker = new gmaps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map,
          title: m.label,
          icon: {
            path: gmaps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            scale: 10,
          },
        })

        marker.addListener('click', () => {
          infoWindow.setContent(`
            <div style="font-family:system-ui;padding:4px 2px;max-width:200px">
              <div style="font-size:14px;font-weight:700;margin-bottom:2px">${icon} ${m.label}</div>
              ${m.detail ? `<div style="font-size:12px;color:#555">${m.detail}</div>` : ''}
            </div>
          `)
          infoWindow.open(map, marker)
          setActiveMarker(m)
        })

        bounds.extend({ lat: m.lat, lng: m.lng })
      }

      if (markers.length > 1) {
        map.fitBounds(bounds, 60)
      }

      if (!cancelled) setStatus('ready')
    }

    init()
    return () => { cancelled = true }
  }, [markers])

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        {(['activity', 'hotel', 'airport'] as const).map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ background: TYPE_COLORS[type] }}
            />
            <span className="text-gray-600 capitalize">{type === 'activity' ? 'Activities' : type === 'hotel' ? 'Hotels' : 'Airports'}</span>
          </span>
        ))}
      </div>

      {/* Map container */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-100" style={{ height: 420 }}>
        <div ref={mapRef} className="w-full h-full" />

        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <p className="text-sm text-gray-500">Loading map…</p>
            </div>
          </div>
        )}

        {status === 'no-key' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center p-6">
              <p className="text-sm font-medium text-gray-700 mb-1">Map not configured</p>
              <p className="text-xs text-gray-400">Add GOOGLE_MAPS_API_KEY to enable the interactive map.</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center p-6">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-sm text-gray-500">Map failed to load. Check your API key and network.</p>
            </div>
          </div>
        )}
      </div>

      {/* Active marker detail */}
      {activeMarker && (
        <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200 flex items-start justify-between gap-3">
          <div>
            <span className="text-base mr-1.5">{TYPE_ICONS[activeMarker.type]}</span>
            <span className="font-semibold text-sm text-gray-900">{activeMarker.label}</span>
            {activeMarker.detail && (
              <p className="text-xs text-gray-500 mt-0.5 ml-6">{activeMarker.detail}</p>
            )}
          </div>
          <button
            onClick={() => setActiveMarker(null)}
            className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 text-lg leading-none"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
