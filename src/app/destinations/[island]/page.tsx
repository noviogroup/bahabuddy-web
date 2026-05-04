import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'

interface IslandConfig {
  slug: string
  name: string
  tagline: string
  dbNames: string[] // names used in bahamas_attractions.island
  heroImage: string
  bestTime: string
  vibe: string
  tripLength: string
  description: string
}

const ISLAND_CONFIGS: IslandConfig[] = [
  {
    slug: 'nassau',
    name: 'Nassau',
    tagline: 'The vibrant heart of the Bahamas — culture, beaches, and endless energy.',
    dbNames: ['Nassau', 'Nassau / New Providence', 'New Providence'],
    heroImage: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg',
    bestTime: 'November – April',
    vibe: 'Culture & Beaches',
    tripLength: '3–5 days',
    description:
      'Nassau is the colorful capital city of the Bahamas, packed with colonial architecture, world-class dining, vibrant nightlife, and some of the most beautiful beaches in the Caribbean. From the historic forts to the buzzing Junkanoo scene, Nassau delivers an unforgettable island experience.',
  },
  {
    slug: 'exumas',
    name: 'The Exumas',
    tagline: 'Swimming pigs, turquoise sandbars, and the world\'s most pristine waters.',
    dbNames: ['Exuma', 'Exumas', 'The Exumas', 'Great Exuma'],
    heroImage: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-exumas-islands-img-5f7654f77ef66.jpg',
    bestTime: 'December – May',
    vibe: 'Adventure & Nature',
    tripLength: '4–7 days',
    description:
      'The Exumas are an archipelago of 365 cays stretching across breathtaking turquoise waters. Famous for the swimming pigs of Big Major Cay, pristine sandbars, and crystal-clear water that seems almost too perfect to be real. Snorkeling, kayaking, and island-hopping are the main events here.',
  },
  {
    slug: 'eleuthera',
    name: 'Eleuthera',
    tagline: 'Pink sand beaches, Glass Window Bridge, and unhurried island living.',
    dbNames: ['Eleuthera'],
    heroImage: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-eleuthera-islands-img-5f7654ecd18bf.jpg',
    bestTime: 'November – May',
    vibe: 'Off-the-Beaten-Path',
    tripLength: '4–6 days',
    description:
      'Eleuthera is a slender, 100-mile-long island with a wild beauty that feels worlds away from the crowds. The famous pink sand beaches glow at sunrise, the Glass Window Bridge offers a dramatic divide between Atlantic and Caribbean, and the laid-back vibe invites you to truly slow down.',
  },
  {
    slug: 'harbour-island',
    name: 'Harbour Island',
    tagline: 'Golf carts, pink sand, and the most charming village in the Bahamas.',
    dbNames: ['Harbour Island', 'Harbor Island'],
    heroImage: 'https://tempo.cdn.tambourine.com/windsong/media/cache/queenshighway-5f525b6953653-1500x643.jpg',
    bestTime: 'November – April',
    vibe: 'Romantic & Boutique',
    tripLength: '3–5 days',
    description:
      'Harbour Island — affectionately called "Briland" by locals — is famous for its breathtaking 3-mile pink sand beach, colorful colonial cottages, and an intimate, upscale atmosphere. Golf carts rule the streets, and the village of Dunmore Town is filled with boutique shops, lovely restaurants, and a timeless island elegance.',
  },
  {
    slug: 'andros',
    name: 'Andros',
    tagline: 'The untamed wilderness — the Bahamas\' largest and most mysterious island.',
    dbNames: ['Andros'],
    heroImage: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg',
    bestTime: 'December – May',
    vibe: 'Wilderness & Diving',
    tripLength: '5–7 days',
    description:
      'Andros is the largest island in the Bahamas and one of the most biologically diverse places in the Caribbean. Bordering the Great Bahama Bank, the Andros Barrier Reef is the third-largest in the world. Blue holes, bonefishing flats, and vast unexplored forests make this the ultimate adventure destination.',
  },
  {
    slug: 'grand-bahama',
    name: 'Grand Bahama',
    tagline: 'Diving, nature trails, and a city vibe just minutes from Florida.',
    dbNames: ['Grand Bahama', 'Freeport', 'Freeport / Grand Bahama'],
    heroImage: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-eleuthera-islands-img-5f7654ecd18bf.jpg',
    bestTime: 'November – April',
    vibe: 'Diving & Nature',
    tripLength: '3–5 days',
    description:
      'Grand Bahama is home to Freeport, the Bahamas\' second-largest city, and offers a compelling mix of world-class diving, nature reserves, and city conveniences. The island\'s underwater caves and reefs are among the Caribbean\'s finest, and the Lucayan National Park is a natural wonder not to be missed.',
  },
]

interface Attraction {
  id: string
  name: string
  category: string
  island: string | null
  description: string
  image_url: string | null
  tags: string[]
}

interface Deal {
  id: string
  title: string
  deal_type: string
  island: string | null
  resort_name: string | null
  description: string
  price_from_usd: number | null
  price_unit: string | null
  image_url: string | null
  highlights: string[]
  tags: string[]
}

function formatPrice(price: number | null, unit: string | null): string {
  if (!price) return 'Contact for price'
  const units: Record<string, string> = {
    per_night: '/night',
    per_person: '/person',
    per_day: '/day',
    per_charter: '/charter',
    total: ' total',
  }
  return `From $${price.toLocaleString()}${unit ? (units[unit] ?? '') : ''}`
}

async function getIslandAttractions(dbNames: string[]): Promise<Attraction[]> {
  try {
    const supabase = await createClient()
    // Try each db name variant and merge results
    const allResults: Attraction[] = []
    for (const name of dbNames) {
      const { data } = await supabase
        .from('bahamas_attractions')
        .select('id, name, category, island, description, image_url, tags')
        .ilike('island', `%${name}%`)
        .limit(12)
      if (data && data.length > 0) {
        allResults.push(...(data as Attraction[]))
      }
    }
    // Deduplicate by id
    const seen = new Set<string>()
    return allResults.filter(a => {
      if (seen.has(a.id)) return false
      seen.add(a.id)
      return true
    }).slice(0, 12)
  } catch {
    return []
  }
}

async function getIslandDeals(slug: string, dbNames: string[]): Promise<Deal[]> {
  try {
    const supabase = await createClient()
    const allResults: Deal[] = []
    // Try slug and db names
    const searchTerms = [slug, ...dbNames]
    for (const term of searchTerms) {
      const { data } = await supabase
        .from('bahamas_deals')
        .select('id, title, deal_type, island, resort_name, description, price_from_usd, price_unit, image_url, highlights, tags')
        .ilike('island', `%${term}%`)
        .limit(6)
      if (data && data.length > 0) {
        allResults.push(...(data as Deal[]))
      }
    }
    const seen = new Set<string>()
    return allResults.filter(d => {
      if (seen.has(d.id)) return false
      seen.add(d.id)
      return true
    }).slice(0, 6)
  } catch {
    return []
  }
}

export async function generateStaticParams() {
  return ISLAND_CONFIGS.map(island => ({ island: island.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { island: string }
}): Promise<Metadata> {
  const config = ISLAND_CONFIGS.find(i => i.slug === params.island)
  if (!config) return {}

  return {
    title: `${config.name} — Bahamas Travel Guide | Baha Buddy`,
    description: `Plan the perfect trip to ${config.name}, Bahamas. ${config.tagline} Attractions, deals, and local tips.`,
    openGraph: {
      title: `${config.name} Travel Guide | Baha Buddy`,
      description: `Plan your ${config.name} trip — ${config.tagline}`,
      images: [{ url: config.heroImage }],
    },
  }
}

export const dynamic = 'force-dynamic'

const CATEGORY_COLORS: Record<string, string> = {
  Island: 'bg-brand-500/80 text-white',
  Beach: 'bg-gold-500/80 text-white',
  'Water Activity': 'bg-sky-500/80 text-white',
  Culture: 'bg-purple-500/80 text-white',
  Nature: 'bg-emerald-500/80 text-white',
  Dining: 'bg-rose-500/80 text-white',
}

const DEAL_TYPE_BADGE: Record<string, string> = {
  accommodation: 'bg-brand-600/80 text-white',
  tour: 'bg-brand-600/80 text-white',
  package: 'bg-purple-600/80 text-white',
  activity: 'bg-gold-500/80 text-white',
}

export default async function IslandPage({
  params,
}: {
  params: { island: string }
}) {
  const config = ISLAND_CONFIGS.find(i => i.slug === params.island)
  if (!config) notFound()

  const [attractions, deals] = await Promise.all([
    getIslandAttractions(config.dbNames),
    getIslandDeals(config.slug, config.dbNames),
  ])

  const chatUrl = `/dashboard?q=${encodeURIComponent(`Plan a trip to ${config.name} in the Bahamas`)}`

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-900">Baha Buddy</Link>
          <div className="flex items-center gap-4">
            <Link href="/destinations" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
              ← All Destinations
            </Link>
            <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <Image
          src={config.heroImage}
          alt={config.name}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 max-w-6xl mx-auto">
          <nav className="text-white/70 text-sm mb-2">
            <Link href="/destinations" className="hover:text-white transition-colors">Destinations</Link>
            <span className="mx-2">›</span>
            <span className="text-white">{config.name}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{config.name}</h1>
          <p className="text-white/90 text-lg max-w-2xl">{config.tagline}</p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10 bg-brand-50 rounded-2xl p-6">
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Best Time</p>
            <p className="text-sm md:text-base font-semibold text-gray-900">{config.bestTime}</p>
          </div>
          <div className="text-center border-x border-brand-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Vibe</p>
            <p className="text-sm md:text-base font-semibold text-gray-900">{config.vibe}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Avg Trip</p>
            <p className="text-sm md:text-base font-semibold text-gray-900">{config.tripLength}</p>
          </div>
        </div>

        {/* Description */}
        <div className="mb-12">
          <p className="text-gray-600 text-lg leading-relaxed">{config.description}</p>
        </div>

        {/* Attractions */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Things to Do</h2>
            <Link
              href={`/destinations?island=${encodeURIComponent(config.dbNames[0])}`}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              View all →
            </Link>
          </div>

          {attractions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {attractions.map(attraction => {
                const categoryColor = CATEGORY_COLORS[attraction.category] ?? 'bg-gray-600/80 text-white'
                return (
                  <div
                    key={attraction.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col border border-gray-100"
                  >
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
                        <div className="w-full h-full bg-gradient-to-br from-brand-200 to-brand-300 flex items-center justify-center">
                          <span className="text-5xl opacity-50">🏝️</span>
                        </div>
                      )}
                      <div className={`absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 backdrop-blur-sm ${categoryColor}`}>
                        {attraction.category}
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="text-base font-bold text-gray-900 mb-1">{attraction.name}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3 flex-1">
                        {attraction.description}
                      </p>
                      {attraction.tags && attraction.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {attraction.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs bg-brand-50 text-brand-700 rounded-full px-2.5 py-0.5 font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-brand-50 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">🏝️</div>
              <p className="text-gray-600 font-medium">Attractions coming soon</p>
              <p className="text-sm text-gray-400 mt-1">Ask Baha Buddy for personalised {config.name} recommendations.</p>
            </div>
          )}
        </section>

        {/* Deals */}
        {deals.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Current Deals</h2>
              <Link href="/deals" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                All deals →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {deals.map(deal => {
                const badge = DEAL_TYPE_BADGE[deal.deal_type] ?? 'bg-gray-600/80 text-white'
                return (
                  <div
                    key={deal.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col border border-gray-100"
                  >
                    <div className="relative aspect-video overflow-hidden bg-stone-200">
                      {deal.image_url ? (
                        <Image
                          src={deal.image_url}
                          alt={deal.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gold-200 to-gold-300 flex items-center justify-center">
                          <span className="text-5xl opacity-50">🌊</span>
                        </div>
                      )}
                      <div className={`absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 backdrop-blur-sm capitalize ${badge}`}>
                        {deal.deal_type}
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="text-base font-bold text-gray-900 mb-1">{deal.title}</h3>
                      {deal.resort_name && (
                        <p className="text-xs text-gray-400 mb-1">{deal.resort_name}</p>
                      )}
                      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3 flex-1">
                        {deal.description}
                      </p>
                      <p className="text-sm font-bold text-brand-700">
                        {formatPrice(deal.price_from_usd, deal.price_unit)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Ask Baha Buddy CTA */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl p-8 text-center text-white">
          <div className="text-4xl mb-3">🤖</div>
          <h2 className="text-2xl font-bold mb-2">Plan your {config.name} trip with AI</h2>
          <p className="text-brand-100 mb-6 max-w-lg mx-auto">
            Get a personalised day-by-day itinerary, local tips, and booking recommendations from Baha Buddy.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={chatUrl}
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold rounded-xl px-6 py-3 hover:bg-brand-50 transition-colors text-sm"
            >
              💬 Ask Baha Buddy
            </Link>
            <a
              href="https://apps.apple.com/app/baha-buddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/30 text-white font-semibold rounded-xl px-6 py-3 hover:bg-white/20 transition-colors text-sm"
            >
              🍎 Download the App
            </a>
          </div>
        </div>

        {/* Other Islands */}
        <div className="mt-14">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Explore Other Islands</h2>
          <div className="flex flex-wrap gap-3">
            {ISLAND_CONFIGS.filter(i => i.slug !== config.slug).map(island => (
              <Link
                key={island.slug}
                href={`/destinations/${island.slug}`}
                className="bg-gray-50 hover:bg-brand-50 text-gray-700 hover:text-brand-700 text-sm font-medium rounded-full px-4 py-2 transition-colors border border-gray-100 hover:border-brand-200"
              >
                {island.name}
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}
