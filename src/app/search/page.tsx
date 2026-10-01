import type { Metadata } from 'next'

import ChatWidget from '@/components/ChatWidget'
import Footer from '@/components/Footer'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import UnifiedCatalogSearch from '@/components/search/UnifiedCatalogSearch'
import {
  CATALOG_ISLANDS,
  cleanCatalogQuery,
  normalizeCatalogResult,
  parseCatalogFilter,
  parseCatalogIsland,
} from '@/lib/catalog-search'
import { getIslandHeroes, getIslands } from '@/lib/islands'
import { ISLAND_CONFIGS } from '@/lib/island-config'
import { fetchDestinations } from '@/lib/sanity/queries'

export const metadata: Metadata = {
  title: 'Search the Bahamas',
  description: 'Search Baha Buddy for trusted Bahamas islands, beaches, restaurants, stays, tours, deals, and things to do.',
  alternates: { canonical: '/search' },
  openGraph: {
    title: 'Search the Bahamas | Baha Buddy',
    description: 'Find trusted places, stays, food, beaches, tours, and island guides across the Bahamas.',
  },
}

type SearchPageProps = {
  searchParams?: {
    q?: string
    filter?: string
    island?: string
  }
}

const ISLAND_RECORD_ALIASES: Record<string, string> = {
  'the-abacos': 'abacos',
}

export default async function SearchPage({ searchParams = {} }: SearchPageProps) {
  const query = cleanCatalogQuery(searchParams.q)
  const filter = parseCatalogFilter(searchParams.filter) ?? 'all'
  const island = parseCatalogIsland(searchParams.island) ?? ''
  const [islandRecords, sanityDestinations] = await Promise.all([
    getIslands(),
    fetchDestinations(),
  ])
  // /explore/island/[id] only renders for islands with a hardcoded config or
  // a published Sanity destination; everything else 404s. Tiles for other
  // islands fall back to the destinations listing filtered to that island.
  const islandGuideSlugs = new Set<string>([
    ...ISLAND_CONFIGS.map((config) => config.slug),
    ...(sanityDestinations ?? []).flatMap((destination) => [
      destination.islandId,
      destination.slug,
      ...(destination.routeAliases ?? []),
    ]).filter((slug): slug is string => Boolean(slug)),
  ])
  const imageSlugs = CATALOG_ISLANDS.map(
    ({ value }) => ISLAND_RECORD_ALIASES[value] ?? value,
  )
  const islandHeroes = await getIslandHeroes(imageSlugs)
  const islandRecordBySlug = new Map(
    islandRecords.map((record) => [record.slug, record]),
  )

  const defaultResults = CATALOG_ISLANDS.map(({ value, label }) => {
    const sourceSlug = ISLAND_RECORD_ALIASES[value] ?? value
    const record = islandRecordBySlug.get(value) ?? islandRecordBySlug.get(sourceSlug)

    const result = normalizeCatalogResult({
      result_id: value,
      result_type: 'island',
      title: label,
      subtitle: record?.description || `Explore trusted trip-planning guidance for ${label}.`,
      island_slug: value,
      island_name: label,
      category: 'Island guide',
      image_url: record?.heroImageUrl ?? islandHeroes[sourceSlug] ?? null,
      rating: null,
      review_count: null,
      price_from_usd: null,
      route_path: `/islands/${value}`,
      source_table: 'islands',
      score: null,
      is_live_action: false,
    })
    const guideSlug = result.href.startsWith('/explore/island/')
      ? decodeURIComponent(result.href.slice('/explore/island/'.length))
      : null
    return guideSlug && !islandGuideSlugs.has(guideSlug)
      ? { ...result, href: `/destinations?island=${encodeURIComponent(label)}` }
      : result
  })

  return (
    <div className="min-h-screen bg-offwhite">
      <CompactPageHeader
        eyebrow="Baha Buddy search"
        title="Find your Bahamas best"
        subtitle="Search trusted island guides, places, stays, beaches, food, tours, and current deals—then go deeper with Buddy."
        crumbs={[
          { href: '/', label: 'Home' },
          { label: 'Search' },
        ]}
      />
      <main>
        <UnifiedCatalogSearch
          initialQuery={query}
          initialFilter={filter}
          initialIsland={island}
          defaultResults={defaultResults}
        />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
