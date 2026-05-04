import { createClient } from '@/lib/supabase/server'
import HeroSection from '@/components/HeroSection'
import DestinationShowcase from '@/components/DestinationShowcase'
import ExploreSection from '@/components/ExploreSection'
import DealsSection from '@/components/DealsSection'
import AppFeaturesSection from '@/components/AppFeaturesSection'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'

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
      .select('id, title, deal_type, island, resort_name, description, price_from_usd, price_unit, image_url, highlights, tags')
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
  const [attractions, deals] = await Promise.all([getAttractions(), getDeals()])

  return (
    <main className="min-h-screen bg-white">
      <HeroSection />
      <DestinationShowcase attractions={attractions} />
      <ExploreSection />
      <AppFeaturesSection />
      <DealsSection deals={deals} />
      <Footer />
      <ChatWidget />
    </main>
  )
}
