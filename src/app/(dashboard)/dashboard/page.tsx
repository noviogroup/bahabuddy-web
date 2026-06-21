import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  GreetingStrip,
  IslandExplorerRow,
  AdaptiveHeroCard,
  HeroSearchPanel,
  HomeCardCarousel,
  BuddyPickCard,
  WeatherGlanceCard,
  TravelTipCard,
  MobileChatEntryBar,
} from '@/components/home'
import CreateTripCTA from '@/components/trip/CreateTripCTA'
import { deriveUserState } from '@/lib/derive-user-state'
import type { Trip } from '@/types/database'

export const dynamic = 'force-dynamic'

/**
 * /dashboard — Home Dashboard (Phase B content, C.1 layout).
 *
 * Adaptive composition that surfaces the right content for the user's
 * current trip state (new / planner / booked). Server component fetches
 * user + trips, derives state, then renders 8 home sections + optional
 * mobile chat entry bar.
 *
 * Shell wrapping: handled by src/app/(dashboard)/layout.tsx — this page
 * returns just the content. Pre-C.1 this file imported <DashboardShell>
 * directly; that's gone now.
 *
 * Auth + onboarding gate: handled by the layout. By the time this page
 * runs, we know there's a user and they've completed onboarding.
 *
 * Section order matches mobile:
 *   1. GreetingStrip (time-aware, Buddy avatar, notification bell)
 *   2. IslandExplorerRow (9 circular island avatars, horizontal scroll)
 *   3. AdaptiveHeroCard (3-state — seasonal / progress / countdown)
 *   4. HeroSearchPanel (Expedia-style direct-intent search — 4 categories)
 *   5. HomeCardCarousel (state-aware 6 cards)
 *   6. BuddyPickCard (weekly rotating gold editorial pick)
 *   7. WeatherGlanceCard (weather at primary destination)
 *   8. TravelTipCard (daily rotating editorial tip)
 *   9. MobileChatEntryBar (xl:hidden — chat entry on tablet/phone)
 *
 * The Phase B `QuickActionsRow` (4 chat-mediated quick prompts) and the
 * inline "Or search directly" Flights/Hotels grid have been folded into
 * `HeroSearchPanel`. One unified primary action surface — pills choose
 * the category (Plan a Trip / Stays / Flights / Things to Do), and a
 * structured form drives the user into direct trip creation or pre-filled
 * native search pages (/stays, /flights, /explore/places). Buddy remains
 * available through explicit secondary chat controls.
 */
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Defensive: layout already guards this, but keep for type safety.
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  const tripList = (trips ?? []) as Trip[]
  const { state, primaryTrip } = deriveUserState(tripList)

  const displayName = profile?.display_name ?? null
  const firstName = displayName?.split(' ')[0] || user.email?.split('@')[0]

  const weatherIsland = primaryTrip?.islands?.[0] || 'Nassau'

  return (
    <div className="max-w-3xl mx-auto pb-2">
      <GreetingStrip
        name={firstName}
        hasActiveTrip={state !== 'new'}
        unreadCount={0}
      />

      <div className="mb-6">
        <IslandExplorerRow />
      </div>

      <div className="px-5 md:px-6 mb-5">
        <CreateTripCTA tripCount={tripList.length} />
      </div>

      <div className="px-5 md:px-6 mb-7">
        <AdaptiveHeroCard trips={tripList} />
      </div>

      <div className="px-5 md:px-6 mb-7">
        <HeroSearchPanel />
      </div>

      <div className="mb-7">
        <HomeCardCarousel userState={state} primaryTrip={primaryTrip} />
      </div>

      <div className="mb-7">
        <BuddyPickCard />
      </div>

      <div id="weather" className="mb-6">
        <WeatherGlanceCard island={weatherIsland} />
      </div>

      <div className="mb-8">
        <TravelTipCard />
      </div>

      <MobileChatEntryBar />
    </div>
  )
}
