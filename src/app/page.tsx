import { createClient } from '@/lib/supabase/server'
import HeroSection from '@/components/HeroSection'
import TrustBand from '@/components/TrustBand'
import DestinationShowcase from '@/components/DestinationShowcase'
import ExploreSection from '@/components/ExploreSection'
import DealsSection from '@/components/DealsSection'
import AppFeaturesSection from '@/components/AppFeaturesSection'
import TravelCompanionSection from '@/components/TravelCompanionSection'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import ConciergeRevenueBand from '@/components/revenue/ConciergeRevenueBand'
import { getIslandHeroSlides } from '@/lib/islands'

export const dynamic = 'force-dynamic'

async function getAttractions() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bahamas_attractions')
      .select('id, name, category, island, description, image_url, tags')
      .order('created_at', { ascending: false })
      .limit(6)
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

async function getDeals() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bahamas_deals')
      .select('id, title, deal_type, island, resort_name, description, price_from_usd, price_unit, image_url, highlights, tags, valid_through')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6)
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

export default async function HomePage() {
  // Hero slides pulled from `islands` table (DB-driven). HeroSection
  // is a Client Component — it can't await, so the server parent
  // fetches and passes down. getIslandHeroSlides falls back to the
  // static map in islands.ts if the DB is unreachable.
  const [attractions, deals, heroSlides] = await Promise.all([
    getAttractions(),
    getDeals(),
    getIslandHeroSlides(),
  ])

  return (
    <main className="min-h-screen bg-white">
      <HeroSection slides={heroSlides} />
      <TrustBand />
      <TravelCompanionSection />
      <DestinationShowcase attractions={attractions} />
      <ExploreSection />
      <AppFeaturesSection />
      <ConciergeRevenueBand />
      <DealsSection deals={deals} />
      <Footer />
      <ChatWidget />
    </main>
  )
}
