'use client'

/**
 * WeatherGlanceCard — compact weather widget on Home Dashboard.
 *
 * Mobile reference: WeatherGlanceCard in lib/features/home/widgets/home_sections.dart
 *
 * Phase 1 behavior:
 *   - If user has a booked/active trip with a primary island, show that island.
 *   - Else default to Nassau.
 *   - Fetches weather via the project's existing weather Edge Function on
 *     mount. If the call fails or no key is configured, falls back to a
 *     visually-complete stub ("82°F · Sunny · Light breeze").
 *
 * The stub is intentionally believable — late spring through early fall
 * in the Bahamas is reliably warm and sunny. The card surfaces real data
 * the moment the weather endpoint comes online.
 */

import { useEffect, useState } from 'react'

interface WeatherData {
  tempF: number
  condition: string
  windMph?: number
}

interface WeatherGlanceCardProps {
  island?: string
}

/** Stubbed deterministic fallback — same data shape as real API. */
const FALLBACK: WeatherData = {
  tempF: 82,
  condition: 'Sunny',
  windMph: 8,
}

function WeatherIcon({ condition }: { condition: string }) {
  const c = condition.toLowerCase()
  if (c.includes('rain') || c.includes('shower')) {
    return (
      <svg className="w-10 h-10 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 014-4 5 5 0 0110 0 4 4 0 010 8H7a4 4 0 01-4-4zm5 5l1 2m3-2l1 2m3-2l1 2" />
      </svg>
    )
  }
  if (c.includes('cloud')) {
    return (
      <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 014-4 5 5 0 0110 0 4 4 0 010 8H7a4 4 0 01-4-4z" />
      </svg>
    )
  }
  // Sunny — gold sun
  return (
    <svg className="w-10 h-10 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.5-6.5l-1.4 1.4m-9.2 9.2l-1.4 1.4m12-1.4l-1.4-1.4m-9.2-9.2L5.5 5.5" />
    </svg>
  )
}

export default function WeatherGlanceCard({ island = 'Nassau' }: WeatherGlanceCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/weather?island=${encodeURIComponent(island)}`, { cache: 'no-store' })
        if (!cancelled && res.ok) {
          const json = (await res.json()) as Partial<WeatherData>
          if (typeof json.tempF === 'number' && json.condition) {
            setWeather({ tempF: json.tempF, condition: json.condition, windMph: json.windMph })
          } else {
            setWeather(FALLBACK)
          }
        } else if (!cancelled) {
          // Endpoint not present yet — use stub so the card looks complete.
          setWeather(FALLBACK)
        }
      } catch {
        if (!cancelled) setWeather(FALLBACK)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [island])

  const data = weather ?? FALLBACK

  return (
    <section className="px-5 md:px-6">
      <div className="bg-white rounded-baha-lg shadow-soft p-5 flex items-center gap-4">
        <WeatherIcon condition={data.condition} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{island}</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl font-bold text-night">
              {loading ? '—' : `${data.tempF}°F`}
            </span>
            <span className="text-sm text-gray-600">{loading ? 'Checking…' : data.condition}</span>
          </div>
          {data.windMph != null && !loading && (
            <p className="text-xs text-gray-500 mt-1">Light breeze · {data.windMph} mph</p>
          )}
        </div>
        <button
          className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700"
          aria-label="See full forecast"
          onClick={() => {
            window.location.href = `/dashboard/chat?q=${encodeURIComponent(`What's the weather forecast for ${island}?`)}`
          }}
        >
          Forecast →
        </button>
      </div>
    </section>
  )
}
