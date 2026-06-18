import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import IslandFilterSelect from '@/components/destinations/IslandFilterSelect'
import { BahaImages } from '@/lib/baha-images'
import DefaultHeaderHero from '@/components/DefaultHeaderHero'
import { resolveDefaultHeaderImage, resolveStaticDefaultHeaderImage } from '@/lib/default-headers'

export const metadata: Metadata = {
  title: 'Destinations — Explore the Bahamas | Baha Buddy',
  description: 'Browse 700+ Bahamas islands, beaches, and attractions. Find your perfect island escape with Baha Buddy\'s AI travel assistant.',
  openGraph: {
    title: 'Explore Bahamas Destinations | Baha Buddy',
    description: 'Browse islands, beaches, and attractions across the Bahamas.',
  },
}

export const revalidate = 3600

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
  { id: '1', name: 'Nassau', category: 'Island', island: 'Nassau', description: 'The vibrant capital city — colorful colonial architecture, world-class dining, and stunning beaches.', image_url: BahaImages.nassau, tags: ['Culture', 'Beaches', 'Shopping'] },
  { id: '2', name: 'Exuma', category: 'Island', island: 'Exuma', description: 'Home to the famous swimming pigs and the world\'s most pristine turquoise waters and sandbars.', image_url: BahaImages.exumas, tags: ['Swimming Pigs', 'Snorkeling', 'Secluded'] },
  { id: '3', name: 'Eleuthera', category: 'Island', island: 'Eleuthera', description: 'Stunning pink sand beaches, Glass Window Bridge, and a laidback island lifestyle away from crowds.', image_url: BahaImages.eleuthera, tags: ['Pink Sand', 'Surfing', 'Off-the-beaten-path'] },
  { id: '4', name: 'Harbour Island', category: 'Island', island: 'Harbour Island', description: 'Famous for its charming pink sand beach and colorful colonial cottages. Golf carts are the main transport.', image_url: BahaImages.bahamasLifestyle, tags: ['Pink Sand', 'Boutique', 'Romantic'] },
  { id: '5', name: 'The Abacos', category: 'Island', island: 'Abacos', description: 'The sailing capital of the Bahamas with charming Loyalist Cays, world-class marinas, and crystal-clear waters.', image_url: BahaImages.abacos, tags: ['Sailing', 'Boating', 'Fishing'] },
  { id: '6', name: 'Paradise Island', category: 'Island', island: 'Paradise Island', description: 'Connected to Nassau by bridge, home to Atlantis Resort, casinos, and stunning white-sand beaches.', image_url: BahaImages.snorkeling, tags: ['Resorts', 'Atlantis', 'Family'] },
  { id: '7', name: 'Bimini', category: 'Island', island: 'Bimini', description: 'The closest Bahamian island to Florida — famous for deep-sea fishing, sharks, and the Road to Atlantis legend.', image_url: BahaImages.bimini, tags: ['Fishing', 'Diving', 'Adventure'] },
  { id: '8', name: 'Long Island', category: 'Island', island: 'Long Island', description: 'Remote and strikingly beautiful — dramatic cliffs, Dean\'s Blue Hole, and pristine beaches with barely any crowds.', image_url: BahaImages.longIsland, tags: ['Remote', 'Diving', 'Scenic'] },
  { id: '9', name: 'Grand Bahama', category: 'Island', island: 'Grand Bahama', description: 'Home to Freeport — one of the Caribbean\'s top diving destinations with stunning underwater caves and reefs.', image_url: BahaImages.grandBahama, tags: ['Diving', 'Freeport', 'Caves'] },
]

const CATEGORY_COLORS: Record<string, string> = {
  Island: 'bg-brand-500/80 text-white',
  Beach: 'bg-gold-500/80 text-white',
  'Water Activity': 'bg-sky-500/80 text-white',
  Culture: 'bg-purple-500/80 text-white',
  Nature: 'bg-emerald-500/80 text-white',
  Dining: 'bg-rose-500/80 text-white',
}

const ALL_CATEGORIES = ['All', 'Island', 'Beach', 'Water Activity', 'Culture', 'Nature', 'Dining']

const ISLAND_DETAIL_SLUGS: Record<string, string> = {
  'Nassau': 'nassau-paradise-island',
  'Nassau / New Providence': 'nassau-paradise-island',
  'New Providence': 'nassau-paradise-island',
  'Paradise Island': 'paradise-island',
  'Exuma': 'the-exumas',
  'Exumas': 'the-exumas',
  'The Exumas': 'the-exumas',
  'Eleuthera': 'eleuthera-harbour-island',
  'Harbour Island': 'harbour-island',
  'Harbor Island': 'harbour-island',
  'Andros': 'andros',
  'Grand Bahama': 'grand-bahama',
  'Freeport': 'grand-bahama',
  'Bimini': 'bimini',
  'Long Island': 'long-island',
  'Abacos': 'abacos',
  'The Abacos': 'abacos',
}

async function getAttractions() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bahamas_attractions')
      .select('id, name, category, island, description, image_url, tags')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return null
    return data as Attraction[]
  } catch {
    return null
  }
}

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: { category?: string; island?: string }
}) {
  const dbAttractions = await getAttractions()
  const allAttractions = (dbAttractions && dbAttractions.length > 0) ? dbAttractions : FALLBACK_ATTRACTIONS

  const activeCategory = searchParams.category ?? 'All'
  const activeIsland = searchParams.island ?? ''
  const heroHeader = await resolveDefaultHeaderImage({
    category: activeCategory !== 'All' ? activeCategory : null,
    island: activeIsland || null,
    preferredVariant: 'desktop',
  })

  const islandSet = new Set(allAttractions.map(a => a.island).filter(Boolean) as string[])
  const allIslands = Array.from(islandSet).sort()

  const filtered = allAttractions.filter(a => {
    const matchCategory = activeCategory === 'All' || a.category === activeCategory
    const matchIsland = !activeIsland || a.island === activeIsland
    return matchCategory && matchIsland
  })

  return (
    <div className="min-h-screen bg-white">
      <DefaultHeaderHero
        eyebrow="Explore the Bahamas"
        title={activeIsland ? `Discover ${activeIsland}` : '700+ Islands to Discover'}
        subtitle="From Nassau’s buzz to hidden sandbars — find your perfect Bahamas escape."
        header={heroHeader}
      />

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map(cat => (
              <Link
                key={cat}
                href={`/destinations?category=${cat}${activeIsland ? `&island=${encodeURIComponent(activeIsland)}` : ''}`}
                className={`text-sm rounded-full px-4 py-1.5 font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>

          {allIslands.length > 0 && (
            <div className="sm:ml-auto">
              <IslandFilterSelect
                islands={allIslands}
                activeIsland={activeIsland}
                activeCategory={activeCategory}
              />
            </div>
          )}
        </div>

        {allIslands.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-8 -mt-2">
            <Link
              href={`/destinations?category=${activeCategory}`}
              className={`text-xs rounded-full px-3 py-1 font-medium transition-colors ${
                !activeIsland
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              All Islands
            </Link>
            {allIslands.slice(0, 8).map(island => {
              const detailSlug = ISLAND_DETAIL_SLUGS[island]
              const href = detailSlug
                ? `/explore/island/${detailSlug}`
                : `/destinations?category=${activeCategory}&island=${encodeURIComponent(island)}`
              return (
                <Link
                  key={island}
                  href={href}
                  className={`text-xs rounded-full px-3 py-1 font-medium transition-colors ${
                    activeIsland === island
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {island}
                  {detailSlug && <span className="ml-1 opacity-60">→</span>}
                </Link>
              )
            })}
          </div>
        )}

        <p className="text-sm text-gray-400 mb-6">
          {filtered.length} destination{filtered.length !== 1 ? 's' : ''}
          {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
          {activeIsland ? ` on ${activeIsland}` : ''}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600">No destinations found</p>
            <p className="text-sm mt-1">Try a different filter or island.</p>
            <Link href="/destinations" className="inline-block mt-4 text-brand-600 hover:text-brand-700 text-sm font-medium">
              Clear filters →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(attraction => {
              const categoryColor = CATEGORY_COLORS[attraction.category] ?? 'bg-gray-600/80 text-white'
              const planUrl = `/dashboard?q=${encodeURIComponent(`Plan a trip to ${attraction.name} in the Bahamas`)}`
              const cardHeader = resolveStaticDefaultHeaderImage({
                customImageUrl: attraction.image_url,
                category: attraction.category,
                island: attraction.island,
                preferredVariant: 'card',
              })

              return (
                <div
                  key={attraction.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col border border-gray-100"
                >
                  <div className="relative aspect-video overflow-hidden bg-stone-200">
                    <Image
                      src={cardHeader.url}
                      alt={attraction.image_url ? attraction.name : cardHeader.alt}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className={`absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 backdrop-blur-sm ${categoryColor}`}>
                      {attraction.category}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    {attraction.island && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-2 font-medium">
                        <span>{attraction.island}</span>
                      </div>
                    )}
                    <h2 className="text-lg font-bold text-gray-900 mb-2">{attraction.name}</h2>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4 flex-1">
                      {attraction.description}
                    </p>

                    {attraction.tags && attraction.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {attraction.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs bg-brand-50 text-brand-700 rounded-full px-3 py-0.5 font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <Link
                      href={planUrl}
                      className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors text-center block"
                    >
                      Plan this trip →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-16 bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Ready to plan your Bahamas trip?</h2>
          <p className="text-brand-100 mb-6">Download Baha Buddy and get AI-powered itineraries in seconds.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://apps.apple.com/app/baha-buddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold rounded-xl px-6 py-3 hover:bg-brand-50 transition-colors text-sm"
            >
              Download on iOS
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.noviogroup.bahabuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/30 text-white font-semibold rounded-xl px-6 py-3 hover:bg-white/20 transition-colors text-sm"
            >
              Download on Android
            </a>
          </div>
        </div>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}
