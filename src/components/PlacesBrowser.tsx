'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import { FilterButton, FilterGroup } from '@/components/marketplace/ResultFilterPanel'
import { TravelSearchField, TravelSearchInput } from '@/components/marketplace/TravelSearchFields'
import { buddyChatHref } from '@/lib/buddy-chat'

export interface Place {
  id: string
  name: string
  category: string
  island: string | null
  description: string
  image_url: string | null
  tags: string[]
  rating: number | null
  review_count: number | null
  amenities: string[] | null
  price_range: string | null
  short_description: string | null
  enriched_at: string | null
}

const CATEGORY_COLORS: Record<string, string> = {
  Island: 'bg-white/85 text-night ring-1 ring-white/70',
  Beach: 'bg-white/85 text-night ring-1 ring-white/70',
  'Water Activity': 'bg-white/85 text-night ring-1 ring-white/70',
  Hotel: 'bg-white/85 text-night ring-1 ring-white/70',
  Restaurant: 'bg-white/85 text-night ring-1 ring-white/70',
  Activity: 'bg-white/85 text-night ring-1 ring-white/70',
  Culture: 'bg-white/85 text-night ring-1 ring-white/70',
  Nature: 'bg-white/85 text-night ring-1 ring-white/70',
  Dining: 'bg-white/85 text-night ring-1 ring-white/70',
}

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? 'bg-white/85 text-night ring-1 ring-white/70'
}

const ISLAND_ALIASES: Record<string, string> = {
  nassau: 'nassau-paradise-island',
  'new-providence': 'nassau-paradise-island',
  exuma: 'the-exumas',
  exumas: 'the-exumas',
  abaco: 'abacos',
  abacos: 'abacos',
  eleuthera: 'eleuthera-harbour-island',
  harbour: 'eleuthera-harbour-island',
  'harbour-island': 'eleuthera-harbour-island',
}

function normalizeFilterValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function stripIslandNoise(value: string): string {
  return value
    .replace(/^the-/, '')
    .replace(/-island$/, '')
    .replace(/s$/, '')
}

function matchFilterOption(value: string, options: string[], aliases: Record<string, string> = {}): string {
  const normalized = normalizeFilterValue(value)
  const alias = aliases[normalized] ?? normalized
  const wanted = new Set([normalized, alias, stripIslandNoise(normalized), stripIslandNoise(alias)])

  return options.find((name) => {
    const option = normalizeFilterValue(name)
    return wanted.has(option) || wanted.has(stripIslandNoise(option))
  }) ?? ''
}

interface Props {
  places: Place[]
  allIslands: string[]
  allCategories: string[]
}

export default function PlacesBrowser({ places, allIslands, allCategories }: Props) {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search')?.trim() ?? ''
  const initialIsland = searchParams.get('island')?.trim() ?? ''
  const initialCategory = searchParams.get('category')?.trim() ?? ''
  const [search, setSearch] = useState(initialSearch)
  const [island, setIsland] = useState(() => matchFilterOption(initialIsland, allIslands, ISLAND_ALIASES) || 'All')
  const [category, setCategory] = useState(() => matchFilterOption(initialCategory, allCategories) || 'All')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return places.filter((p) => {
      const searchableText = [
        p.name,
        p.description,
        p.short_description,
        p.category,
        p.island,
        ...(p.tags ?? []),
        ...(p.amenities ?? []),
      ].filter(Boolean).join(' ').toLowerCase()
      if (q && !searchableText.includes(q)) return false
      if (island !== 'All' && p.island !== island) return false
      if (category !== 'All' && p.category !== category) return false
      return true
    })
  }, [places, search, island, category])

  const activeFilterCount = [
    search.trim() ? search.trim() : null,
    island !== 'All' ? island : null,
    category !== 'All' ? category : null,
  ].filter(Boolean).length

  function clearFilters() {
    setSearch('')
    setIsland('All')
    setCategory('All')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <section
          aria-label="Filter places"
          className="mb-6 overflow-hidden rounded-baha-xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b border-gray-100 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">
                Filter places
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-night">
                {filtered.length} {filtered.length === 1 ? 'place' : 'places'} found
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Search islands, beaches, restaurants, hotels, activities, and cultural stops.
              </p>
            </div>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex w-fit items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              >
                Clear all filters
              </button>
            ) : (
              <span className="inline-flex w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-500 ring-1 ring-gray-200">
                Showing all places
              </span>
            )}
          </div>

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-gray-400">
                Active
              </span>
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-charcoal ring-1 ring-gray-200 transition-colors hover:bg-gray-50 hover:text-night focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                >
                  <span className="text-gray-400">Search:</span>
                  <span>{search.trim()}</span>
                  <span aria-hidden="true" className="text-gray-500">Remove</span>
                </button>
              )}
              {island !== 'All' && (
                <button
                  type="button"
                  onClick={() => setIsland('All')}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-charcoal ring-1 ring-gray-200 transition-colors hover:bg-gray-50 hover:text-night focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                >
                  <span className="text-gray-400">Island:</span>
                  <span>{island}</span>
                  <span aria-hidden="true" className="text-gray-500">Remove</span>
                </button>
              )}
              {category !== 'All' && (
                <button
                  type="button"
                  onClick={() => setCategory('All')}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-charcoal ring-1 ring-gray-200 transition-colors hover:bg-gray-50 hover:text-night focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                >
                  <span className="text-gray-400">Category:</span>
                  <span>{category}</span>
                  <span aria-hidden="true" className="text-gray-500">Remove</span>
                </button>
              )}
            </div>
          )}

          <div className="grid gap-5 p-4 md:grid-cols-[1.1fr_1fr]">
            <TravelSearchField label="Search" hint="Places, beaches, food" htmlFor="places-search">
              <TravelSearchInput
                id="places-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search places, beaches, restaurants"
              />
            </TravelSearchField>

            <FilterGroup label="Island" description="Choose the island or settlement.">
              <FilterButton active={island === 'All'} onClick={() => setIsland('All')}>
                All islands
              </FilterButton>
              {allIslands.map((name) => (
                <FilterButton
                  key={name}
                  active={island === name}
                  onClick={() => setIsland(name)}
                >
                  {name}
                </FilterButton>
              ))}
            </FilterGroup>

            <div className="md:col-span-2">
              <FilterGroup label="Category" description="Filter by the kind of place you want.">
                {['All', ...allCategories].map((cat) => (
                  <FilterButton
                    key={cat}
                    active={category === cat}
                    onClick={() => setCategory(cat)}
                    tone="neutral"
                  >
                    {cat}
                  </FilterButton>
                ))}
              </FilterGroup>
            </div>
          </div>
        </section>

        <div className="mb-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
            Results
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-500">
            {filtered.length} {filtered.length === 1 ? 'place' : 'places'} found
            {island !== 'All' && ` in ${island}`}
            {category !== 'All' && ` | ${category}`}
            {search.trim() && ` | "${search.trim()}"`}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No places found</h3>
            <p className="text-gray-400 text-sm mb-6">Try adjusting your search or filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StarRating({ rating, reviewCount }: { rating: number | null; reviewCount: number | null }) {
  if (!rating) return null
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-semibold text-gray-700">Rating {rating.toFixed(1)}</span>
      {reviewCount != null && reviewCount > 0 && (
        <span className="text-xs text-gray-400">({reviewCount})</span>
      )}
    </div>
  )
}

function placePreviewReason(place: Place): string {
  const tags = place.tags?.filter(Boolean) ?? []
  if (place.rating && place.rating >= 4.5) {
    return `Strong traveler rating for ${place.category.toLowerCase()} plans${place.island ? ` on ${place.island}` : ''}.`
  }
  if (tags.length > 0) {
    return `Good fit for ${tags.slice(0, 2).join(' and ').toLowerCase()} travelers.`
  }
  if (place.short_description) return place.short_description
  return `Useful ${place.category.toLowerCase()} stop to compare before adding it to a Bahamas itinerary.`
}

function placeCategoryKey(place: Place): string {
  return place.category.toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

function placeIslandParams(place: Place): string {
  const params = new URLSearchParams()
  if (place.island) params.set('island', place.island)
  return params.toString()
}

function placeAskBuddyHref(place: Place): string {
  const prompt = [
    `Tell me about ${place.name}`,
    place.island ? `Island: ${place.island}` : '',
    `Category: ${place.category}`,
  ].filter(Boolean).join('. ')
  return buddyChatHref(prompt)
}

function placeAvailabilityHref(place: Place, detailUrl: string): string {
  const key = placeCategoryKey(place)
  if (key.includes('hotel') || key.includes('stay') || key.includes('resort') || key.includes('villa')) {
    const params = new URLSearchParams()
    if (place.island) params.set('island', place.island)
    params.set('type', 'Hotel')
    const qs = params.toString()
    return qs ? `/stays?${qs}` : '/stays'
  }

  if (key.includes('restaurant') || key.includes('dining') || key.includes('food')) {
    const qs = placeIslandParams(place)
    return qs ? `/restaurants?${qs}` : '/restaurants'
  }

  return `${detailUrl}#trip-actions`
}

function placeBookHref(place: Place, detailUrl: string): string | null {
  const key = placeCategoryKey(place)
  if (key.includes('hotel') || key.includes('stay') || key.includes('resort') || key.includes('villa')) {
    return placeAvailabilityHref(place, detailUrl)
  }
  if (
    key.includes('activity')
    || key.includes('tour')
    || key.includes('water')
    || key.includes('diving')
    || key.includes('snorkeling')
    || key.includes('fishing')
  ) {
    return `${detailUrl}#trip-actions`
  }
  return null
}

function placeDetailUrl(placeId: string, searchParams: URLSearchParams, hash?: string): string {
  const params = new URLSearchParams()
  for (const key of ['tripId', 'dayNumber', 'timeSlot']) {
    const value = searchParams.get(key)?.trim()
    if (value) params.set(key, value)
  }
  const qs = params.toString()
  return `/explore/places/${placeId}${qs ? `?${qs}` : ''}${hash ? `#${hash}` : ''}`
}

function PlaceCard({ place }: { place: Place }) {
  const searchParams = useSearchParams()
  const detailUrl = placeDetailUrl(place.id, searchParams)
  const isEnriched = !!place.enriched_at
  const previewReason = placePreviewReason(place)
  const addToTripHref = placeDetailUrl(place.id, searchParams, 'trip-actions')
  const availabilityHref = placeAvailabilityHref(place, detailUrl)
  const bookHref = placeBookHref(place, detailUrl)
  const askBuddyHref = placeAskBuddyHref(place)

  return (
    <article className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300 group h-full flex flex-col">
      <div className="relative h-40 overflow-hidden">
        <ImageWithSourcePolicy
          src={place.image_url}
          alt={place.name}
          title={place.name}
          eyebrow={place.category}
          description="Real place data available. Photo is not available yet."
          className="h-40"
          tone={place.category === 'Dining' || place.category === 'Restaurant' ? 'restaurant' : 'activity'}
        />
        <span className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${categoryColor(place.category)}`}>
          {place.category}
        </span>
        {place.price_range && (
          <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/80 text-gray-700">
            {place.price_range}
          </span>
        )}
      </div>

      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-0.5 line-clamp-1">{place.name}</h3>
        <div className="flex items-center gap-2 mb-1.5">
          {place.island && (
            <p className="text-xs font-medium text-gray-500">{place.island}</p>
          )}
          {isEnriched && <StarRating rating={place.rating} reviewCount={place.review_count} />}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3 flex-1">
          {place.short_description || place.description}
        </p>

        {isEnriched && place.amenities && place.amenities.length > 0 && (
          <div className="flex gap-1.5 mb-3">
            {place.amenities.slice(0, 5).map((a) => (
              <span
                key={a}
                title={a}
                className="text-[10px] font-medium bg-gray-50 text-gray-600 rounded-md px-1.5 py-0.5 capitalize"
              >
                {a}
              </span>
            ))}
            {place.amenities.length > 5 && (
              <span className="w-6 h-6 flex items-center justify-center bg-gray-50 rounded-md text-xs text-gray-400 font-medium">
                +{place.amenities.length - 5}
              </span>
            )}
          </div>
        )}

        {place.tags && place.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {place.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mb-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-500">
            Why Buddy picked this
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-charcoal">
            {previewReason}
          </p>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2">
          <Link
            href={detailUrl}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-center text-xs font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
          >
            View details
          </Link>
          <Link
            href={addToTripHref}
            className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-3 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-2"
          >
            Add to trip
          </Link>
          <Link
            href={availabilityHref}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-center text-xs font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
          >
            Check availability
          </Link>
          {bookHref ? (
            <Link
              href={bookHref}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-center text-xs font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              Book
            </Link>
          ) : (
            <Link
              href={askBuddyHref}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-center text-xs font-semibold text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-night focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              Ask Buddy
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
