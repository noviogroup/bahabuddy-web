'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export interface Place {
  id: string
  name: string
  category: string
  island: string | null
  description: string
  image_url: string | null
  tags: string[]
}

const CATEGORY_COLORS: Record<string, string> = {
  Island: 'bg-brand-500/80 text-white',
  Beach: 'bg-cyan-500/80 text-white',
  'Water Activity': 'bg-sky-500/80 text-white',
  Hotel: 'bg-purple-500/80 text-white',
  Restaurant: 'bg-rose-500/80 text-white',
  Activity: 'bg-emerald-500/80 text-white',
  Culture: 'bg-orange-500/80 text-white',
  Nature: 'bg-green-600/80 text-white',
  Dining: 'bg-rose-500/80 text-white',
}

const FALLBACK_IMAGE = 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg'

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? 'bg-gray-500/80 text-white'
}

function buildChatUrl(place: Place): string {
  const prompt = `Tell me about ${place.name}${place.island ? ` in ${place.island}` : ''}, Bahamas. What should I know before visiting?`
  return `/dashboard/chat?q=${encodeURIComponent(prompt)}`
}

interface Props {
  places: Place[]
  allIslands: string[]
  allCategories: string[]
}

export default function PlacesBrowser({ places, allIslands, allCategories }: Props) {
  const [search, setSearch] = useState('')
  const [island, setIsland] = useState('All')
  const [category, setCategory] = useState('All')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return places.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false
      if (island !== 'All' && p.island !== island) return false
      if (category !== 'All' && p.category !== category) return false
      return true
    })
  }, [places, search, island, category])

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search places, beaches, restaurants…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white transition-colors"
              />
            </div>

            {/* Island filter */}
            <select
              value={island}
              onChange={(e) => setIsland(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white transition-colors"
            >
              <option value="All">All Islands</option>
              {allIslands.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
            {['All', ...allCategories].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  category === cat
                    ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <p className="text-sm text-gray-500 mb-4">
          {filtered.length} {filtered.length === 1 ? 'place' : 'places'} found
          {island !== 'All' && ` in ${island}`}
          {category !== 'All' && ` · ${category}`}
          {search && ` · "${search}"`}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No places found</h3>
            <p className="text-gray-400 text-sm mb-6">Try adjusting your search or filters.</p>
            <button
              onClick={() => { setSearch(''); setIsland('All'); setCategory('All') }}
              className="px-5 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors"
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

function PlaceCard({ place }: { place: Place }) {
  const chatUrl = buildChatUrl(place)
  const imgSrc = place.image_url || FALLBACK_IMAGE

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        <Image
          src={imgSrc}
          alt={place.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          unoptimized
        />
        {/* Category badge */}
        <span className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${categoryColor(place.category)}`}>
          {place.category}
        </span>
      </div>

      {/* Body */}
      <div className="p-3.5">
        <h3 className="font-bold text-gray-900 text-sm leading-snug mb-0.5 line-clamp-1">{place.name}</h3>
        {place.island && (
          <p className="text-xs text-brand-500 font-medium mb-1.5">{place.island}</p>
        )}
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{place.description}</p>

        {/* Tags */}
        {place.tags && place.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {place.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <Link
          href={chatUrl}
          className="block w-full text-center text-xs font-semibold py-2 rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors border border-brand-100"
        >
          Ask Buddy about this →
        </Link>
      </div>
    </div>
  )
}
