'use client'

import Image from 'next/image'
import { BahaImages } from '@/lib/baha-images'

interface Attraction {
  id: string
  name: string
  category: string
  island: string | null
  description: string
  image_url: string | null
  tags: string[]
}

const FALLBACK_ATTRACTIONS: Attraction[] = [
  {
    id: '1',
    name: 'Nassau',
    category: 'Island',
    island: 'Nassau',
    description: 'The vibrant capital city of the Bahamas — colorful colonial architecture, world-class dining, and stunning beaches.',
    image_url: BahaImages.nassau,
    tags: ['Culture', 'Beaches', 'Shopping'],
  },
  {
    id: '2',
    name: 'Exuma',
    category: 'Island',
    island: 'Exuma',
    description: 'Home to the swimming pigs and some of the world\'s most pristine turquoise waters and sandbars.',
    image_url: BahaImages.exumas,
    tags: ['Swimming Pigs', 'Snorkeling', 'Secluded'],
  },
  {
    id: '3',
    name: 'Eleuthera',
    category: 'Island',
    island: 'Eleuthera',
    description: 'Stunning pink sand beaches, Glass Window Bridge, and a laidback island lifestyle away from the crowds.',
    image_url: BahaImages.eleuthera,
    tags: ['Pink Sand', 'Surfing', 'Off-the-beaten-path'],
  },
  {
    id: '4',
    name: 'Harbour Island',
    category: 'Island',
    island: 'Harbour Island',
    description: 'Famous for its charming pink sand beach and colorful colonial cottages. Golf carts are the main transport.',
    image_url: BahaImages.bahamasLifestyle,
    tags: ['Pink Sand', 'Boutique', 'Romantic'],
  },
  {
    id: '5',
    name: 'The Abacos',
    category: 'Island',
    island: 'Abacos',
    description: 'The sailing capital of the Bahamas with charming Loyalist Cays, world-class marinas, and crystal-clear waters.',
    image_url: BahaImages.abacos,
    tags: ['Sailing', 'Boating', 'Fishing'],
  },
  {
    id: '6',
    name: 'Paradise Island',
    category: 'Island',
    island: 'Paradise Island',
    description: 'Connected to Nassau by bridge, home to Atlantis Resort, casinos, and stunning white-sand beaches.',
    image_url: BahaImages.snorkeling,
    tags: ['Resorts', 'Atlantis', 'Family'],
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  Island: 'bg-brand-500/80 text-white',
  Beach: 'bg-gold-500/80 text-white',
  'Water Activity': 'bg-sky-500/80 text-white',
  Culture: 'bg-purple-500/80 text-white',
  Nature: 'bg-emerald-500/80 text-white',
  Dining: 'bg-rose-500/80 text-white',
}

const TRUST_LABELS = [
  'Buddy Pick',
  'Popular',
  'Best for Families',
  'Great First Trip',
  'Local Favorite',
  'Easy to Plan',
]

const ROTATING_FALLBACK_IMAGES = [
  BahaImages.nassau,
  BahaImages.exumas,
  BahaImages.eleuthera,
  BahaImages.abacos,
  BahaImages.bimini,
  BahaImages.snorkeling,
]

function normalizeToken(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function attractionImageUrl(attraction: Attraction, index: number): string {
  if (attraction.image_url) return attraction.image_url

  const island = normalizeToken(attraction.island)
  const category = normalizeToken(attraction.category)
  const text = `${island} ${category} ${normalizeToken(attraction.name)} ${normalizeToken(attraction.description)}`

  if (text.includes('exuma')) return BahaImages.exumas
  if (text.includes('eleuthera') || text.includes('harbour island') || text.includes('pink sand')) return BahaImages.eleuthera
  if (text.includes('abaco')) return BahaImages.abacos
  if (text.includes('andros')) return BahaImages.andros
  if (text.includes('bimini')) return BahaImages.bimini
  if (text.includes('grand bahama') || text.includes('freeport')) return BahaImages.grandBahama
  if (text.includes('long island')) return BahaImages.longIsland
  if (text.includes('paradise island') || text.includes('nassau')) return BahaImages.nassau
  if (category.includes('water') || text.includes('snorkel') || text.includes('boat')) return BahaImages.snorkeling
  if (category.includes('beach')) return BahaImages.beach
  if (category.includes('culture') || text.includes('junkanoo')) return BahaImages.junkanoo
  if (category.includes('dining')) return BahaImages.bahamasLifestyle

  return ROTATING_FALLBACK_IMAGES[index % ROTATING_FALLBACK_IMAGES.length]
}

interface Props {
  attractions: Attraction[]
}

export default function DestinationShowcase({ attractions }: Props) {
  const items = attractions.length > 0 ? attractions : FALLBACK_ATTRACTIONS

  const handlePlan = (name: string) => {
    window.location.href = `/dashboard?q=${encodeURIComponent(`Plan a trip to ${name} in the Bahamas`)}`
  }

  return (
    <section className="py-24 bg-stone-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-brand-600 text-sm font-semibold tracking-widest uppercase mb-3">
            Explore the Bahamas
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            700+ Islands to Discover
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            From the buzz of Nassau to secluded sandbars — Baha Buddy knows every corner
            of the islands and helps you find your perfect escape.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((attraction, index) => {
            const categoryColor = CATEGORY_COLORS[attraction.category] ?? 'bg-gray-600/80 text-white'
            const trustLabel = TRUST_LABELS[index % TRUST_LABELS.length]
            const imageUrl = attractionImageUrl(attraction, index)

            return (
              <div
                key={attraction.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col"
              >
                {/* Image — 16:9 */}
                <div className="relative aspect-video overflow-hidden bg-stone-200">
                  <Image
                    src={imageUrl}
                    alt={attraction.image_url ? attraction.name : `${attraction.name} Bahamas travel image`}
                    fill
                    loading="eager"
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />

                  {/* Category badge */}
                  <div className={`absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 backdrop-blur-sm ${categoryColor}`}>
                    {attraction.category}
                  </div>

                  {/* Trust label — avoids fake-looking static ratings */}
                  <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full px-2.5 py-1 font-semibold">
                    {trustLabel}
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  {/* Island meta */}
                  {attraction.island && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-2 font-medium">
                      <span>{attraction.island}</span>
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-gray-900 mb-2">{attraction.name}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4 flex-1">
                    {attraction.description}
                  </p>

                  {attraction.tags && attraction.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {attraction.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-brand-50 text-brand-700 rounded-full px-3 py-0.5 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => handlePlan(attraction.name)}
                    className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors mt-auto"
                  >
                    Plan this trip →
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-400 mb-5 text-sm tracking-wide">
            Discover all destinations in the Baha Buddy app
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://apps.apple.com/app/baha-buddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-6 py-3 font-medium transition-colors text-sm"
            >
              Download on iOS
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.noviogroup.bahabuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-6 py-3 font-medium transition-colors text-sm"
            >
              Download on Android
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
