import HeroSection from '@/components/HeroSection'
import HomepageStorySections from '@/components/home/HomepageStorySections'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import { getIslandHeroSlides } from '@/lib/islands'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Hero slides pulled from `islands` table (DB-driven). HeroSection
  // is a Client Component — it can't await, so the server parent
  // fetches and passes down. getIslandHeroSlides falls back to the
  // static map in islands.ts if the DB is unreachable.
  const heroSlides = await getIslandHeroSlides()

  return (
    <main className="min-h-screen bg-white">
      <HeroSection slides={heroSlides} />
      <HomepageStorySections />
      <Footer />
      <ChatWidget />
    </main>
  )
}
