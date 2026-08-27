import HeroSection from '@/components/HeroSection'
import HomepageStorySections from '@/components/home/HomepageStorySections'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import { getIslandHeroSlides } from '@/lib/islands'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Hero slides pulled from `islands` table (DB-driven). HeroSection
  // is a Client Component — it can't await, so the server parent
  // fetches and passes down. getIslandHeroSlides falls back to the
  // static map in islands.ts if the DB is unreachable.
  const supabase = await createClient()
  const [heroSlides, { data: { user } }] = await Promise.all([
    getIslandHeroSlides(),
    supabase.auth.getUser(),
  ])
  const { data: profile } = user
    ? await supabase
        .from('users')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }
  const userDisplayName = getStringValue(profile?.display_name) ?? getAuthDisplayName(user?.user_metadata)

  return (
    <main className="min-h-screen bg-white">
      <HeroSection slides={heroSlides} userEmail={user?.email ?? null} userDisplayName={userDisplayName} />
      <HomepageStorySections />
      <Footer />
      <ChatWidget />
    </main>
  )
}

function getAuthDisplayName(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') return null

  const record = metadata as Record<string, unknown>
  return getStringValue(record.display_name) ?? getStringValue(record.full_name) ?? getStringValue(record.name)
}

function getStringValue(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized || null
}
