import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import { BahaImages, ISLANDS } from '@/lib/baha-images'
import ImageWithSourcePolicy from '@/components/marketplace/ImageWithSourcePolicy'
import { FilterChip, FilterGroup, ResultFilterPanel } from '@/components/marketplace/ResultFilterPanel'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import { buddyChatHref } from '@/lib/buddy-chat'

export const metadata: Metadata = {
  title: 'Destinations - Explore the Bahamas | Baha Buddy',
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
  { id: '1', name: 'Nassau', category: 'Island', island: 'Nassau', description: 'The vibrant capital city with colorful colonial architecture, world-class dining, and stunning beaches.', image_url: BahaImages.nassau, tags: ['Culture', 'Beaches', 'Shopping'] },
  { id: '2', name: 'Exuma', category: 'Island', island: 'Exuma', description: 'Home to the famous swimming pigs and the world\'s most pristine turquoise waters and sandbars.', image_url: BahaImages.exumas, tags: ['Swimming Pigs', 'Snorkeling', 'Secluded'] },
  { id: '3', name: 'Eleuthera', category: 'Island', island: 'Eleuthera', description: 'Stunning pink sand beaches, Glass Window Bridge, and a laidback island lifestyle away from crowds.', image_url: BahaImages.eleuthera, tags: ['Pink Sand', 'Surfing', 'Off-the-beaten-path'] },
  { id: '4', name: 'Harbour Island', category: 'Island', island: 'Harbour Island', description: 'Famous for its charming pink sand beach and colorful colonial cottages. Golf carts are the main transport.', image_url: BahaImages.bahamasLifestyle, tags: ['Pink Sand', 'Boutique', 'Romantic'] },
  { id: '5', name: 'The Abacos', category: 'Island', island: 'Abacos', description: 'The sailing capital of the Bahamas with charming Loyalist Cays, world-class marinas, and crystal-clear waters.', image_url: BahaImages.abacos, tags: ['Sailing', 'Boating', 'Fishing'] },
  { id: '6', name: 'Paradise Island', category: 'Island', island: 'Paradise Island', description: 'Connected to Nassau by bridge, home to Atlantis Resort, casinos, and stunning white-sand beaches.', image_url: BahaImages.snorkeling, tags: ['Resorts', 'Atlantis', 'Family'] },
  { id: '7', name: 'Bimini', category: 'Island', island: 'Bimini', description: 'The closest Bahamian island to Florida, famous for deep-sea fishing, sharks, and the Road to Atlantis legend.', image_url: BahaImages.bimini, tags: ['Fishing', 'Diving', 'Adventure'] },
  { id: '8', name: 'Long Island', category: 'Island', island: 'Long Island', description: 'Remote and strikingly beautiful, with dramatic cliffs, Dean\'s Blue Hole, and pristine beaches with barely any crowds.', image_url: BahaImages.longIsland, tags: ['Remote', 'Diving', 'Scenic'] },
  { id: '9', name: 'Grand Bahama', category: 'Island', island: 'Grand Bahama', description: 'Home to Freeport and one of the Caribbean\'s top diving destinations with stunning underwater caves and reefs.', image_url: BahaImages.grandBahama, tags: ['Diving', 'Freeport', 'Caves'] },
]

const ALL_CATEGORIES = ['All', 'Island', 'Beach', 'Water Activity', 'Culture', 'Nature', 'Dining']

const ISLAND_SLUG_BY_NAME = new Map(
  ISLANDS.map((island) => [normalizeKey(island.name), island.slug]),
)

const ISLAND_SLUG_ALIASES: Record<string, string> = {
  nassau: 'nassau-paradise-island',
  'new-providence': 'nassau-paradise-island',
  exuma: 'the-exumas',
  exumas: 'the-exumas',
  'the-exumas': 'the-exumas',
  eleuthera: 'eleuthera-harbour-island',
  'harbour-island': 'harbour-island',
  'the-abacos': 'abacos',
  abaco: 'abacos',
  abacos: 'abacos',
}

function normalizeKey(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function paramsFrom(values: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value?.trim()) params.set(key, value.trim())
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function islandSlugForDestination(attraction: Attraction): string {
  const candidates = [
    attraction.island,
    attraction.name,
    normalizeKey(attraction.island),
    normalizeKey(attraction.name),
  ].filter(Boolean) as string[]

  for (const value of candidates) {
    const key = normalizeKey(value)
    if (ISLAND_SLUG_ALIASES[key]) return ISLAND_SLUG_ALIASES[key]
    const direct = ISLAND_SLUG_BY_NAME.get(key)
    if (direct) return direct
    if (ISLANDS.some((island) => island.slug === key)) return key
  }

  return normalizeKey(attraction.island || attraction.name)
}

function isIslandDestination(attraction: Attraction): boolean {
  return normalizeKey(attraction.category) === 'island'
}

function CategoryIcon({ category }: { category: string }) {
  const key = normalizeKey(category)
  if (key.includes('beach') || key.includes('water')) return <WaveIcon />
  if (key.includes('dining')) return <DiningIcon />
  if (key.includes('culture')) return <GuideIcon />
  if (key.includes('nature')) return <LeafIcon />
  if (key.includes('island')) return <IslandIcon />
  return <PinIcon />
}

function IslandIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 18c2.2-2 4.5-3 7-3s4.8 1 7 3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15c.2-4.8 1.3-8 4-10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15c-.2-4.7-1.4-7.8-4-10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5c2.4.1 3.8 1.2 4 3.3C13 6.4 14.4 5.3 16 5" />
    </svg>
  )
}

function WaveIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
    </svg>
  )
}

function DiningIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v8M4 3v8M10 3v8M4 11h6l-1 10H5L4 11Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 3v18M14 3h6v8a3 3 0 0 1-3 3" />
    </svg>
  )
}

function GuideIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5v-16Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h7M9 11h7M9 15h4" />
    </svg>
  )
}

function LeafIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 4c-7.7.6-12.8 4.5-14 11 4.7 1.6 10.4-.9 12.5-6.2.6-1.5 1-3.1 1.5-4.8Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 15c3.8-1 6.5-3 8.2-6" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  )
}

function destinationDetailHref(attraction: Attraction): string {
  if (isIslandDestination(attraction)) {
    return `/explore/island/${islandSlugForDestination(attraction)}`
  }
  return `/explore/places/${encodeURIComponent(attraction.id)}`
}

function destinationExploreHref(attraction: Attraction): string {
  if (isIslandDestination(attraction)) {
    return `/explore/places${paramsFrom({ island: attraction.island || attraction.name })}`
  }
  return `/explore/places${paramsFrom({ island: attraction.island, category: attraction.category })}`
}

function destinationAddHref(attraction: Attraction): string {
  const detailHref = destinationDetailHref(attraction)
  if (isIslandDestination(attraction)) {
    return `/dashboard/trips/new${paramsFrom({ returnTo: detailHref, source: 'destination' })}`
  }
  return `${detailHref}#trip-actions`
}

function destinationAskBuddyHref(attraction: Attraction): string {
  const prompt = [
    `Help me plan around ${attraction.name}`,
    attraction.island ? `Island: ${attraction.island}` : '',
    `Category: ${attraction.category}`,
  ].filter(Boolean).join('. ')
  return buddyChatHref(prompt)
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
  const hasLiveAttractions = Boolean(dbAttractions?.length)
  const usingFallbackAttractions = !hasLiveAttractions
  const allAttractions: Attraction[] = hasLiveAttractions ? dbAttractions! : FALLBACK_ATTRACTIONS

  const requestedCategory = searchParams.category ?? 'All'
  const activeCategory = ALL_CATEGORIES.includes(requestedCategory) ? requestedCategory : 'All'
  const activeIsland = searchParams.island ?? ''

  const islandSet = new Set(allAttractions.map(a => a.island).filter(Boolean) as string[])
  const allIslands = Array.from(islandSet).sort()

  const filtered = allAttractions.filter(a => {
    const matchCategory = activeCategory === 'All' || a.category === activeCategory
    const matchIsland = !activeIsland || a.island === activeIsland
    return matchCategory && matchIsland
  })

  function buildFilterUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = {
      category: activeCategory,
      island: activeIsland,
      ...overrides,
    }
    for (const [key, value] of Object.entries(merged)) {
      if (value && value !== 'All') params.set(key, value)
    }
    const qs = params.toString()
    return qs ? `/destinations?${qs}` : '/destinations'
  }

  const activeFilters = [
    activeCategory !== 'All' ? { label: 'Category', value: activeCategory, href: buildFilterUrl({ category: undefined }) } : null,
    activeIsland ? { label: 'Island', value: activeIsland, href: buildFilterUrl({ island: undefined }) } : null,
  ].filter((item): item is { label: string; value: string; href: string } => Boolean(item))

  const renderFilterControls = () => (
    <>
      <FilterGroup label="Category" description="Choose the kind of place or experience.">
        {ALL_CATEGORIES.map((category) => (
          <FilterChip
            key={category}
            href={buildFilterUrl({ category: category === 'All' ? undefined : category })}
            active={activeCategory === category}
            tone={category === 'Beach' ? 'gold' : 'brand'}
          >
            {category}
          </FilterChip>
        ))}
      </FilterGroup>

      {allIslands.length > 0 && (
        <FilterGroup label="Island" description="Filter destinations by island.">
          <FilterChip href={buildFilterUrl({ island: undefined })} active={!activeIsland}>
            All islands
          </FilterChip>
          {allIslands.map((island) => (
            <FilterChip
              key={island}
              href={buildFilterUrl({ island })}
              active={activeIsland === island}
            >
              {island}
            </FilterChip>
          ))}
        </FilterGroup>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow="Explore the Bahamas"
        title={activeIsland ? `Discover ${activeIsland}` : '700+ Islands to Discover'}
        subtitle="From Nassau's buzz to hidden sandbars, find your perfect Bahamas escape."
        crumbs={[
          { href: '/', label: 'Home' },
          { label: 'Destinations' },
        ]}
        actions={(
          <>
            <Link href="/explore" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-brand-700">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-gold-400 align-middle" aria-hidden="true" />
              Open Explore
            </Link>
            <Link href={buddyChatHref('Help me choose a Bahamas destination')} className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-extrabold text-night hover:border-gray-400 hover:bg-gray-50">
              Ask Buddy
            </Link>
          </>
        )}
      />

      <main className="max-w-6xl mx-auto px-4 py-10">
        <ResultFilterPanel
          ariaLabel="Filter destinations"
          eyebrow="Filter destinations"
          title={`${filtered.length} destination${filtered.length !== 1 ? 's' : ''} found`}
          description="Narrow places by category and island while keeping the cards and actions visible."
          activeFilters={activeFilters}
          clearHref="/destinations"
          emptyLabel="Showing all destinations"
          mobileSummary="Filter destinations"
          desktopGridClassName="md:grid-cols-2"
        >
          {renderFilterControls()}
        </ResultFilterPanel>

        <div className="mb-6">
          <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
            Results
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-500">
            {filtered.length} destination{filtered.length !== 1 ? 's' : ''}
            {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
            {activeIsland ? ` on ${activeIsland}` : ''}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600">No destinations found</p>
            <p className="text-sm mt-1">Try a different filter or island.</p>
            <Link href="/destinations" className="inline-block mt-4 text-night hover:text-gray-700 text-sm font-medium">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(attraction => {
              const detailHref = destinationDetailHref(attraction)
              const exploreHref = destinationExploreHref(attraction)
              const addHref = destinationAddHref(attraction)
              const askBuddyHref = destinationAskBuddyHref(attraction)
              const addLabel = isIslandDestination(attraction) ? 'Start trip' : 'Add to trip'

              return (
                <article
                  key={attraction.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ImageWithSourcePolicy
                    src={attraction.image_url}
                    alt={attraction.name}
                    title={attraction.name}
                    eyebrow={attraction.category}
                    description="Destination details are available. Place image is not available yet."
                    className="aspect-video"
                    imageClassName="object-cover group-hover:scale-105 transition-transform duration-500"
                    tone="neutral"
                    priority={usingFallbackAttractions}
                  >
                    <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-night backdrop-blur-sm">
                      <span className="text-gold-500" aria-hidden="true">
                        <CategoryIcon category={attraction.category} />
                      </span>
                      {attraction.category}
                    </div>
                  </ImageWithSourcePolicy>

                  <div className="p-5 flex flex-col flex-1">
                    {attraction.island && (
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                        <span className="text-gold-500" aria-hidden="true">
                          <PinIcon />
                        </span>
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
                          <span key={tag} className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-charcoal">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <Link
                        href={detailHref}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-center text-xs font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
                      >
                        View details
                      </Link>
                      <Link
                        href={addHref}
                        className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-3 py-2.5 text-center text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                      >
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                        {addLabel}
                      </Link>
                      <Link
                        href={exploreHref}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-center text-xs font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
                      >
                        Explore places
                      </Link>
                      <Link
                        href={askBuddyHref}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-center text-xs font-semibold text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-night"
                      >
                        Ask Buddy
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <div className="mt-16 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h2 className="mb-2 text-2xl font-bold text-night">Ready to plan your Bahamas trip?</h2>
          <p className="mb-6 text-gray-600">Download Baha Buddy and get AI-powered itineraries in seconds.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://apps.apple.com/app/baha-buddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
              Download on iOS
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.noviogroup.bahabuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
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
