import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import PlacesBrowser, { type Place } from '@/components/PlacesBrowser'

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

const FALLBACK_PLACES: Place[] = [
  { id: '1', name: 'Nassau Fish Fry', category: 'Dining', island: 'Nassau', description: "Arawak Cay's famous strip of outdoor restaurants — the best conch salad and local Bahamian food in Nassau.", image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg', tags: ['Local food', 'Conch', 'Nightlife'] },
  { id: '2', name: 'Swimming Pigs Beach', category: 'Activity', island: 'Exuma', description: 'Big Major Cay — where wild pigs swim out to greet boats. The most famous and photogenic experience in the Bahamas.', image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-exumas-islands-img-5f7654f77ef66.jpg', tags: ['Wildlife', 'Boat trip', 'Photography'] },
  { id: '3', name: "Pink Sands Beach", category: 'Beach', island: 'Harbour Island', description: "Three miles of world-famous pink sand — the colour comes from microscopic coral insects. Consistently ranked among the world's best beaches.", image_url: 'https://tempo.cdn.tambourine.com/windsong/media/cache/queenshighway-5f525b6953653-1500x643.jpg', tags: ['Pink sand', 'Swimming', 'Romantic'] },
  { id: '4', name: "Dean's Blue Hole", category: 'Activity', island: 'Long Island', description: "The world's deepest known blue hole at 663 feet. A surreal, perfectly circular pool of brilliant blue in a limestone bay.", image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-eleuthera-islands-img-5f7654ecd18bf.jpg', tags: ['Diving', 'Snorkeling', 'Unique'] },
  { id: '5', name: 'Atlantis Resort', category: 'Hotel', island: 'Nassau', description: "The iconic mega-resort on Paradise Island — waterpark, casino, multiple beaches, and the famous Aquaventure water rides.", image_url: 'https://tempo.cdn.tambourine.com/windsong/media/cache/exumacaylands-5f5033a0c216a-1500x643.jpg', tags: ['Resort', 'Family', 'Casino'] },
  { id: '6', name: 'Glass Window Bridge', category: 'Nature', island: 'Eleuthera', description: "A narrow land bridge where the deep Atlantic Ocean meets the calm turquoise Bight of Eleuthera — a dramatic natural sight.", image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-eleuthera-islands-img-5f7654ecd18bf.jpg', tags: ['Scenic', 'Photo spot', 'Nature'] },
  { id: '7', name: 'Compass Point Beach Resort', category: 'Hotel', island: 'Nassau', description: "Iconic colourful huts overlooking Love Beach — a quirky, intimate boutique resort a short drive from Nassau.", image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg', tags: ['Boutique', 'Colorful', 'Romantic'] },
  { id: '8', name: 'Exuma Cays Land and Sea Park', category: 'Nature', island: 'Exuma', description: 'The Western Hemisphere\'s first land and sea park — 176 square miles of pristine reefs, sandbars, and sea life.', image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-exumas-islands-img-5f7654f77ef66.jpg', tags: ['Marine park', 'Snorkeling', 'Remote'] },
  { id: '9', name: 'Fort Charlotte', category: 'Culture', island: 'Nassau', description: "Nassau's largest fort, built in 1788 — panoramic harbour views, drawbridge, dungeons, and fascinating colonial history.", image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg', tags: ['History', 'Views', 'Walking tour'] },
  { id: '10', name: 'Graycliff Restaurant', category: 'Restaurant', island: 'Nassau', description: "Award-winning fine dining in a 250-year-old Georgian colonial mansion — one of the Caribbean's best wine cellars and cigar factory.", image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg', tags: ['Fine dining', 'Wine', 'Historic'] },
  { id: '11', name: 'Andros Barrier Reef', category: 'Water Activity', island: 'Andros', description: "The third-largest barrier reef in the world — extraordinary wall dives, blue holes, and some of the least-dived water in the Caribbean.", image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg', tags: ['Diving', 'Snorkeling', 'Reef'] },
  { id: '12', name: 'Bimini Big Game Club Resort', category: 'Hotel', island: 'Bimini', description: "The legendary deep-sea fishing club where Hemingway wrote parts of The Old Man and the Sea. World-class marina and sport fishing.", image_url: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-exumas-islands-img-5f7654f77ef66.jpg', tags: ['Fishing', 'Historic', 'Marina'] },
]

async function getPlaces(): Promise<Place[] | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bahamas_attractions')
      .select('id, name, category, island, description, image_url, tags')
      .order('name', { ascending: true })
      .limit(200)
    if (error || !data) return null
    return data as Place[]
  } catch {
    return null
  }
}

export default async function PlacesPage() {
  const dbPlaces = await getPlaces()
  const places = dbPlaces && dbPlaces.length > 0 ? dbPlaces : FALLBACK_PLACES

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
          <h1 className="text-2xl font-extrabold text-gray-900">Browse Bahamas Places</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {places.length}+ beaches, hotels, restaurants, and activities across the islands.
          </p>
        </div>
      </div>

      <PlacesBrowser places={places} allIslands={allIslands} allCategories={allCategories} />

      <Footer />
      <ChatWidget />
    </>
  )
}
