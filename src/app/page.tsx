import HeroSection from '@/components/HeroSection'
import HomepageStorySections from '@/components/home/HomepageStorySections'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import { getIslandHeroSlides, getIslandHeroes } from '@/lib/islands'
import { getHomeTopPicks } from '@/lib/top-picks'

// Same page for every visitor: the signed-in greeting is resolved client-side
// in HeroSection, so the HTML can be ISR-cached and refreshed every 5 minutes.
export const revalidate = 300

export default async function HomePage() {
  // Hero slides pulled from `islands` table (DB-driven). HeroSection
  // is a Client Component — it can't await, so the server parent
  // fetches and passes down. getIslandHeroSlides falls back to the
  // static map in islands.ts if the DB is unreachable.
  // Top picks are admin-managed (places.featured); getHomeTopPicks never
  // throws and returns [] so the section keeps its static fallback.
  // Both read public catalog data through the cookie-free client.
  const [heroSlides, destinationImages, topPicks] = await Promise.all([
    getIslandHeroSlides(),
    getIslandHeroes([
      'nassau-paradise-island', 'the-exumas', 'eleuthera-harbour-island',
      'abacos', 'andros', 'grand-bahama', 'bimini', 'long-island',
    ]),
    getHomeTopPicks(),
  ])

  return (
    <main className="min-h-screen bg-white">
      <HeroSection slides={heroSlides} />
      <HomepageStorySections destinationImages={destinationImages} topPicks={topPicks} />
      <Footer />
      <ChatWidget />
    </main>
  )
}
