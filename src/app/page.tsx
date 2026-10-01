import HeroSection from '@/components/HeroSection'
import HomepageStorySections from '@/components/home/HomepageStorySections'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import { getIslandHeroSlides, getIslandHeroes } from '@/lib/islands'

// The homepage no longer reads the session on the server: HeroSection's
// client auth effect fills in the signed-in name (including the
// users.display_name profile column). Without that per-request auth round
// trip the page can be revalidated instead of forced dynamic. NOTE: it only
// becomes truly static once lib/islands.ts reads through the cookie-free
// public client (@/lib/supabase/public) instead of the cookie client.
export const revalidate = 300

export default async function HomePage() {
  // Hero slides pulled from `islands` table (DB-driven). HeroSection
  // is a Client Component — it can't await, so the server parent
  // fetches and passes down. getIslandHeroSlides falls back to the
  // static map in islands.ts if the DB is unreachable.
  const [heroSlides, destinationImages] = await Promise.all([
    getIslandHeroSlides(),
    getIslandHeroes([
      'nassau-paradise-island', 'the-exumas', 'eleuthera-harbour-island',
      'abacos', 'andros', 'grand-bahama', 'bimini', 'long-island',
    ]),
  ])

  return (
    <main className="min-h-screen bg-white">
      <HeroSection slides={heroSlides} />
      <HomepageStorySections destinationImages={destinationImages} />
      <Footer />
      <ChatWidget />
    </main>
  )
}
