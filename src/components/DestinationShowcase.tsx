'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

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
    image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg',
    tags: ['Culture', 'Beaches', 'Shopping'],
  },
  {
    id: '2',
    name: 'Exuma',
    category: 'Island',
    island: 'Exuma',
    description: 'Home to the swimming pigs and some of the world\'s most pristine turquoise waters and sandbars.',
    image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-exumas-islands-img-5f7654f77ef66.jpg',
    tags: ['Swimming Pigs', 'Snorkeling', 'Secluded'],
  },
  {
    id: '3',
    name: 'Eleuthera',
    category: 'Island',
    island: 'Eleuthera',
    description: 'Stunning pink sand beaches, Glass Window Bridge, and a laidback island lifestyle away from the crowds.',
    image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-eleuthera-islands-img-5f7654ecd18bf.jpg',
    tags: ['Pink Sand', 'Surfing', 'Off-the-beaten-path'],
  },
  {
    id: '4',
    name: 'Harbour Island',
    category: 'Island',
    island: 'Harbour Island',
    description: 'Famous for its charming pink sand beach and colorful colonial cottages. Golf carts are the main transport.',
    image_url: 'https://tempo.cdn.tambourine.com/windsong/media/cache/queenshighway-5f525b6953653-1500x643.jpg',
    tags: ['Pink Sand', 'Boutique', 'Romantic'],
  },
  {
    id: '5',
    name: 'The Abacos',
    category: 'Island',
    island: 'Abacos',
    description: 'The sailing capital of the Bahamas with charming Loyalist Cays, world-class marinas, and crystal-clear waters.',
    image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-the-abacos-islands-img-5f765543ac3d5.jpg',
    tags: ['Sailing', 'Boating', 'Fishing'],
  },
  {
    id: '6',
    name: 'Paradise Island',
    category: 'Island',
    island: 'Paradise Island',
    description: 'Connected to Nassau by bridge, home to Atlantis Resort, casinos, and stunning white-sand beaches.',
    image_url: 'https://tempo.cdn.tambourine.com/windsong/media/cache/exumacaylands-5f5033a0c216a-1500x643.jpg',
    tags: ['Resorts', 'Atlantis', 'Family'],
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  Island: 'bg-teal-500/80 text-white',
  Beach: 'bg-amber-500/80 text-white',
  'Water Activity': 'bg-sky-500/80 text-white',
  Culture: 'bg-purple-500/80 text-white',
  Nature: 'bg-emerald-500/80 text-white',
  Dining: 'bg-rose-500/80 text-white',
}

interface Props {
  attractions: Attraction[]
}

export default function DestinationShowcase({ attractions }: Props) {
  const items = attractions.length > 0 ? attractions : FALLBACK_ATTRACTIONS
  const router = useRouter()

  const handlePlan = (name: string) => {
    router.push(`/dashboard?q=${encodeURIComponent(`Plan a trip to ${name} in the Bahamas`)}`)
  }

  return (
    <section className="py-24 bg-stone-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-teal-600 text-sm font-semibold tracking-widest uppercase mb-3">
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
          {items.map((attraction) => {
            const categoryColor = CATEGORY_COLORS[attraction.category] ?? 'bg-gray-600/80 text-white'

            return (
              <div
                key={attraction.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col"
              >
                {/* Image — 16:9 */}
                <div className="relative aspect-video overflow-hidden bg-stone-200">
                  {attraction.image_url ? (
                    <Image
                      src={attraction.image_url}
                      alt={attraction.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-200 to-blue-300 flex items-center justify-center">
                      <span className="text-5xl opacity-50">🏝️</span>
                    </div>
                  )}

                  {/* Category badge */}
                  <div className={`absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 backdrop-blur-sm ${categoryColor}`}>
                    {attraction.category}
                  </div>

                  {/* Star rating */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full px-2.5 py-1 font-medium">
                    <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    4.8
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  {/* Island meta */}
                  {attraction.island && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-2 font-medium">
                      <span>🏝️</span>
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
                          className="text-xs bg-teal-50 text-teal-700 rounded-full px-3 py-0.5 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => handlePlan(attraction.name)}
                    className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors mt-auto"
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
              className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-6 py-3 font-medium transition-colors text-sm"
            >
              Download on iOS
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.noviogroup.bahabuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-6 py-3 font-medium transition-colors text-sm"
            >
              Download on Android
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
