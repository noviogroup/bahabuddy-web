import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import PlacesBrowser from '@/components/PlacesBrowser'
import { getExplorePlaces } from '@/lib/places'

export const metadata: Metadata = {
  title: 'Browse Bahamas Places | Baha Buddy',
  description:
    'Search and filter 700+ Bahamas islands, beaches, restaurants, hotels, and activities. Find your perfect spot and plan your trip with AI.',
  openGraph: {
    title: 'Browse Bahamas Places — Hotels, Restaurants & Beaches | Baha Buddy',
    description: 'Search and filter places across the Bahamas. Powered by Baha Buddy AI.',
  },
}

export const dynamic = 'force-dynamic'

export default async function PlacesPage() {
  const places = await getExplorePlaces()

  const islandSet = new Set<string>()
  const categorySet = new Set<string>()
  for (const p of places) {
    if (p.island) islandSet.add(p.island)
    if (p.category) categorySet.add(p.category)
  }
  const allIslands = Array.from(islandSet).sort()
  const allCategories = Array.from(categorySet).sort()

  return (
    <>
      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/destinations" className="hover:text-brand-500 transition-colors">Explore</Link>
            <span>/</span>
            <span className="text-gray-700">Places</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Browse Bahamas Places</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {places.length}+ curated places, restaurants, beaches, and activities across the islands.
          </p>
        </div>
      </div>

      <PlacesBrowser places={places} allIslands={allIslands} allCategories={allCategories} />

      <Footer />
      <ChatWidget />
    </>
  )
}
