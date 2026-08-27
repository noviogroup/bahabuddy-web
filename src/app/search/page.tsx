import type { Metadata } from 'next'

import ChatWidget from '@/components/ChatWidget'
import Footer from '@/components/Footer'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'
import UnifiedCatalogSearch from '@/components/search/UnifiedCatalogSearch'
import {
  cleanCatalogQuery,
  parseCatalogFilter,
  parseCatalogIsland,
} from '@/lib/catalog-search'

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

export default function SearchPage({ searchParams = {} }: SearchPageProps) {
  const query = cleanCatalogQuery(searchParams.q)
  const filter = parseCatalogFilter(searchParams.filter) ?? 'all'
  const island = parseCatalogIsland(searchParams.island) ?? ''
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bahabuddy.app'

  const searchStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Baha Buddy',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <div className="min-h-screen bg-offwhite">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(searchStructuredData) }}
      />
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
        />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  )
}
