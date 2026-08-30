'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import {
  CATALOG_FILTERS,
  CATALOG_ISLANDS,
  type CatalogSearchResult,
} from '@/lib/catalog-search'

type UnifiedCatalogSearchProps = {
  initialQuery?: string
  initialFilter?: string
  initialIsland?: string
  defaultResults?: CatalogSearchResult[]
}

type SearchResponse = {
  query: string
  results: CatalogSearchResult[]
  count: number
  error?: string
}

const QUICK_SEARCHES = ['pink sand beaches', 'conch in Nassau', 'swimming pigs', 'family resorts']

export default function UnifiedCatalogSearch({
  initialQuery = '',
  initialFilter = 'all',
  initialIsland = '',
  defaultResults = [],
}: UnifiedCatalogSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [filter, setFilter] = useState(initialFilter)
  const [island, setIsland] = useState(initialIsland)
  const [results, setResults] = useState<CatalogSearchResult[]>([])
  const [loading, setLoading] = useState(initialQuery.trim().length >= 2)
  const [error, setError] = useState('')
  const [requestVersion, setRequestVersion] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const cleanQuery = query.trim()
    const controller = new AbortController()

    if (cleanQuery.length < 2) {
      setResults([])
      setError('')
      setLoading(false)
      updateSearchUrl(cleanQuery, filter, island)
      return () => controller.abort()
    }

    setLoading(true)
    setError('')

    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({ q: cleanQuery })
      if (filter !== 'all') params.set('filter', filter)
      if (island) params.set('island', island)

      updateSearchUrl(cleanQuery, filter, island)

      try {
        const response = await fetch(`/api/search/catalog?${params.toString()}`, {
          signal: controller.signal,
          credentials: 'same-origin',
        })
        const payload = await response.json() as SearchResponse
        if (!response.ok) throw new Error(payload.error || 'Search is temporarily unavailable.')
        setResults(payload.results)
      } catch (searchError) {
        if (controller.signal.aborted) return
        setResults([])
        setError(
          searchError instanceof Error
            ? searchError.message
            : 'Search is temporarily unavailable. Please try again.',
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 275)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [filter, island, query, requestVersion])

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (query.trim().length < 2) {
      inputRef.current?.focus()
      return
    }
    setRequestVersion((version) => version + 1)
  }

  function chooseQuickSearch(value: string) {
    setQuery(value)
    inputRef.current?.focus()
  }

  const hasQuery = query.trim().length >= 2
  const visibleDefaultResults = island
    ? defaultResults.filter((result) => result.islandSlug === island)
    : defaultResults
  const activeIslandLabel = island
    ? CATALOG_ISLANDS.find((option) => option.value === island)?.label
    : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <form onSubmit={submitSearch} role="search" aria-label="Search the Bahamas">
        <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-lg shadow-brand-950/5 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">What are you looking for?</span>
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-brand-600" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                ref={inputRef}
                type="search"
                name="q"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try “pink sand beach” or “conch in Nassau”"
                autoComplete="off"
                enterKeyHint="search"
                className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-12 pr-4 text-base font-semibold text-night outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100"
              />
            </label>

            <label className="min-w-0 lg:w-64">
              <span className="sr-only">Filter by island</span>
              <select
                value={island}
                onChange={(event) => setIsland(event.target.value)}
                className="h-14 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-night outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              >
                <option value="">Every island</option>
                {CATALOG_ISLANDS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={!hasQuery}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-7 text-sm font-bold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SearchIcon />
              Search
            </button>
          </div>
        </div>

        {hasQuery && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Search categories">
            {CATALOG_FILTERS.map((option) => {
              const active = filter === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-brand-100 ${
                    active
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-gray-200 bg-white text-charcoal hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        )}
      </form>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {loading
          ? 'Searching the Bahamas catalog'
          : error
            ? error
            : hasQuery
              ? `${results.length} results found`
              : 'Enter at least two characters to search'}
      </div>

      {!hasQuery && (
        <section className="pt-9" aria-labelledby="default-search-heading">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-brand-700">Start exploring</p>
              <h2 id="default-search-heading" className="mt-1 text-2xl font-bold text-night">
                {activeIslandLabel ? `Explore ${activeIslandLabel}` : 'Explore all 16 island groups'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-charcoal">
                Browse approved destination guides, or choose a popular search to jump straight into the catalog.
              </p>
            </div>
            <p className="text-sm font-semibold text-gray-500">
              {visibleDefaultResults.length} destination{visibleDefaultResults.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2" aria-label="Popular searches">
            {QUICK_SEARCHES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => chooseQuickSearch(value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-charcoal transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
              >
                {value}
              </button>
            ))}
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDefaultResults.map((result, index) => (
              <CatalogResultCard
                key={`${result.type}-${result.id}`}
                result={result}
                priority={index < 3}
              />
            ))}
          </div>
        </section>
      )}

      {loading && hasQuery && <SearchSkeleton />}

      {!loading && error && (
        <section className="my-10 rounded-3xl border border-red-100 bg-red-50 px-6 py-10 text-center">
          <h2 className="text-xl font-bold text-night">Buddy hit a rough patch</h2>
          <p className="mt-2 text-sm text-charcoal">{error}</p>
          <button
            type="button"
            onClick={() => setRequestVersion((version) => version + 1)}
            className="mt-5 rounded-xl bg-night px-5 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-200"
          >
            Try again
          </button>
        </section>
      )}

      {!loading && !error && hasQuery && results.length === 0 && (
        <section className="my-10 rounded-3xl border border-gray-200 bg-white px-6 py-12 text-center">
          <h2 className="text-2xl font-bold text-night">No exact match yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-charcoal">
            Try a broader phrase, switch to All, or let Buddy turn what you have in mind into a Bahamas plan.
          </p>
          <Link
            href={`/dashboard?prompt=${encodeURIComponent(`Help me find ${query.trim()} in the Bahamas`)}`}
            className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-200"
          >
            Ask Buddy instead
          </Link>
        </section>
      )}

      {!loading && !error && results.length > 0 && (
        <section className="mt-8" aria-labelledby="catalog-results-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-brand-700">Curated Bahamas catalog</p>
              <h2 id="catalog-results-heading" className="mt-1 text-2xl font-bold text-night">
                {results.length} result{results.length === 1 ? '' : 's'} for “{query.trim()}”
              </h2>
            </div>
            <p className="text-sm font-semibold text-gray-500">
              {island ? CATALOG_ISLANDS.find((option) => option.value === island)?.label : 'All islands'}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((result, index) => (
              <CatalogResultCard
                key={`${result.type}-${result.id}`}
                result={result}
                priority={index < 3}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function CatalogResultCard({
  result,
  priority = false,
}: {
  result: CatalogSearchResult
  priority?: boolean
}) {
  const label = resultTypeLabel(result.type)
  const tone = resultTypeTone(result.type)

  return (
    <Link
      href={result.href}
      className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-950/10 focus:outline-none focus:ring-4 focus:ring-brand-100"
    >
      <ImageWithSourcePolicy
        src={result.imageUrl}
        alt={result.imageUrl ? result.title : ''}
        title={result.title}
        eyebrow={label}
        tone={tone}
        className="h-48"
        priority={priority}
      >
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-night shadow-sm">
          {label}
        </span>
      </ImageWithSourcePolicy>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-brand-700">
              {[result.islandName, result.category].filter(Boolean).join(' · ') || 'The Bahamas'}
            </p>
            <h3 className="mt-1 line-clamp-2 text-lg font-bold leading-snug text-night">{result.title}</h3>
          </div>
          <span className="shrink-0 text-brand-600 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
            <ArrowIcon />
          </span>
        </div>

        {result.subtitle && (
          <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-charcoal">{result.subtitle}</p>
        )}

        <div className="mt-4 flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {result.rating !== null && (
            <span className="inline-flex items-center gap-1 font-bold text-night">
              <StarIcon />
              {result.rating.toFixed(1)}
              {result.reviewCount !== null && (
                <span className="ml-1 font-semibold text-gray-500">({result.reviewCount.toLocaleString()})</span>
              )}
            </span>
          )}
          {result.priceFromUsd !== null && (
            <span className="font-bold text-night">From ${Math.round(result.priceFromUsd).toLocaleString()}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

function SearchSkeleton() {
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          <div className="h-48 animate-pulse bg-gray-100" />
          <div className="space-y-3 p-5">
            <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
            <div className="h-5 w-4/5 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

function resultTypeLabel(type: CatalogSearchResult['type']) {
  return {
    island: 'Island guide',
    stay: 'Stay',
    place: 'Place',
    attraction: 'Experience',
    deal: 'Deal',
    self_tour: 'Self-guided tour',
  }[type]
}

function resultTypeTone(type: CatalogSearchResult['type']): 'island' | 'stay' | 'activity' | 'deal' | 'brand' {
  if (type === 'island') return 'island'
  if (type === 'stay') return 'stay'
  if (type === 'deal') return 'deal'
  if (type === 'attraction' || type === 'self_tour') return 'activity'
  return 'brand'
}

function updateSearchUrl(query: string, filter: string, island: string) {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (filter !== 'all') params.set('filter', filter)
  if (island) params.set('island', island)
  const search = params.toString()
  window.history.replaceState(window.history.state, '', search ? `/search?${search}` : '/search')
}

function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m20 20-4-4" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg className="h-4 w-4 fill-gold-500 text-gold-500" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2.8 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 16.83l-5.5 2.89 1.05-6.12L3.1 9.27l6.15-.9L12 2.8Z" />
    </svg>
  )
}
