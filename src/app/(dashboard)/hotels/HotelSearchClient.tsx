'use client'

/**
 * HotelSearchClient — direct-search form + results for /hotels.
 *
 * Mirrors FlightSearchClient's shape (idle / loading / results / error
 * state machine) for visual + cognitive consistency between the two
 * search surfaces.
 *
 * Auto-search on mount: the form is configured to immediately search
 * the most popular island (Nassau) when the page loads. Hotels are a
 * curated catalog so showing a default set is helpful — users land
 * with content visible instead of an empty form.
 *
 * Results use list or grid layouts (toggle in the results header).
 * Each card links to /hotels/[id] for full details and "Plan with Buddy".
 */

import { useEffect, useState, type FormEvent } from 'react'
import type { CardData } from '@/components/RichCards'
import {
  HotelResultsList,
  HotelResultsSkeleton,
  type HotelViewMode,
} from '@/components/hotels/HotelResultViews'
import { SegmentedToggle } from '@/components/ui'

const ISLANDS: Array<{ id: string; label: string }> = [
  { id: 'nassau',          label: 'Nassau' },
  { id: 'paradise-island', label: 'Paradise Island' },
  { id: 'exuma',           label: 'Exuma' },
  { id: 'eleuthera',       label: 'Eleuthera' },
  { id: 'harbour-island',  label: 'Harbour Island' },
  { id: 'andros',          label: 'Andros' },
  { id: 'grand-bahama',    label: 'Grand Bahama' },
  { id: 'bimini',          label: 'Bimini' },
  { id: 'long-island',     label: 'Long Island' },
  { id: 'abacos',          label: 'The Abacos' },
]

/** Price range matches the price_range enum the chat tool accepts. */
const PRICE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '',            label: 'Any price' },
  { value: 'budget',      label: '$  Budget' },
  { value: 'moderate',    label: '$$  Moderate' },
  { value: 'upscale',     label: '$$$  Upscale' },
  { value: 'fine-dining', label: '$$$$  Luxury' },
]

const RATING_OPTIONS: Array<{ value: number | ''; label: string }> = [
  { value: '',  label: 'Any rating' },
  { value: 3.5, label: '3.5\u2605 and up' },
  { value: 4.0, label: '4.0\u2605 and up' },
  { value: 4.3, label: '4.3\u2605 and up' },
  { value: 4.5, label: '4.5\u2605 and up' },
]

type Status = 'idle' | 'loading' | 'results' | 'error'

export default function HotelSearchClient() {
  const [islandId, setIslandId] = useState('nassau')
  const [priceRange, setPriceRange] = useState('')
  const [minRating, setMinRating] = useState<number | ''>('')

  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [results, setResults] = useState<CardData[]>([])
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<HotelViewMode>('list')

  // Auto-load Nassau hotels on first render. Sets `status` to `loading`
  // before the fetch resolves so the skeleton appears immediately.
  useEffect(() => {
    void runSearch({ island_id: 'nassau' })
    // intentionally only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runSearch(body: Record<string, unknown>) {
    setStatus('loading')
    setErrorMessage(null)
    setEmptyMessage(null)
    setResults([])

    try {
      const res = await fetch('/api/hotels/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, limit: 10 }),
      })
      const payload = await res.json()

      if (!res.ok) {
        setErrorMessage(payload?.error ?? 'Hotel search failed.')
        setStatus('error')
        return
      }
      if (payload.error) {
        setErrorMessage(payload.error as string)
        setStatus('error')
        return
      }

      const cards = (payload.cards ?? []) as CardData[]
      if (cards.length === 0) {
        setEmptyMessage(
          (payload.message as string | undefined) ??
            'No hotels matched your filters. Try a different island or relax the criteria.',
        )
        setStatus('results')
        return
      }

      setResults(cards)
      setStatus('results')
    } catch (err) {
      console.error('[HotelSearchClient]', err)
      setErrorMessage('Could not reach the hotel search service. Check your connection and try again.')
      setStatus('error')
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const body: Record<string, unknown> = { island_id: islandId }
    if (priceRange) body.price_range = priceRange
    if (minRating !== '') body.min_rating = minRating
    void runSearch(body)
  }

  const isLoading = status === 'loading'

  return (
    <div className="space-y-6">
      {/* ─── Search form ──────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-baha-lg border border-gray-200 shadow-card p-5 space-y-4"
        aria-label="Hotel search"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="island" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Island
            </label>
            <select
              id="island"
              name="island"
              value={islandId}
              onChange={e => setIslandId(e.target.value)}
              className="w-full rounded-baha-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-night focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {ISLANDS.map(i => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="price" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Price
            </label>
            <select
              id="price"
              name="price"
              value={priceRange}
              onChange={e => setPriceRange(e.target.value)}
              className="w-full rounded-baha-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-night focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {PRICE_OPTIONS.map(p => (
                <option key={p.value || 'any'} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rating" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Minimum rating
            </label>
            <select
              id="rating"
              name="rating"
              value={minRating === '' ? '' : String(minRating)}
              onChange={e => {
                const v = e.target.value
                setMinRating(v === '' ? '' : Number(v))
              }}
              className="w-full rounded-baha-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-night focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {RATING_OPTIONS.map(r => (
                <option
                  key={r.value === '' ? 'any' : String(r.value)}
                  value={r.value === '' ? '' : String(r.value)}
                >
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-full transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                </svg>
                Searching…
              </>
            ) : (
              <>
                Search hotels
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>

      {/* ─── Error banner ─────────────────────────────────────────────── */}
      {status === 'error' && errorMessage && (
        <div
          role="alert"
          className="rounded-baha-md bg-coral-50 border border-coral-200 text-coral-800 px-4 py-3 text-sm"
        >
          {errorMessage}
        </div>
      )}

      {/* ─── Loading skeleton ─────────────────────────────────────────── */}
      {isLoading && <HotelResultsSkeleton mode={viewMode} />}

      {/* ─── Results ──────────────────────────────────────────────────── */}
      {status === 'results' && results.length > 0 && (
        <section aria-label="Hotel results" className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-sm font-semibold text-gray-600">
              {results.length} {results.length === 1 ? 'hotel' : 'hotels'}
            </h2>
            <SegmentedToggle<HotelViewMode>
              value={viewMode}
              onChange={setViewMode}
              size="sm"
              aria-label="Results layout"
              options={[
                {
                  value: 'list',
                  label: 'List',
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  ),
                },
                {
                  value: 'grid',
                  label: 'Grid',
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  ),
                },
              ]}
            />
          </div>
          <HotelResultsList results={results} mode={viewMode} />
          <p className="text-xs text-gray-400 px-1 pt-1">
            Tap any hotel to see full details, photos, and add it to your trip.
          </p>
        </section>
      )}

      {/* ─── Empty (after a search) ───────────────────────────────────── */}
      {status === 'results' && results.length === 0 && emptyMessage && (
        <div className="rounded-baha-lg bg-white border border-gray-200 p-8 text-center shadow-soft">
          <p className="text-sm text-gray-700">{emptyMessage}</p>
        </div>
      )}
    </div>
  )
}
