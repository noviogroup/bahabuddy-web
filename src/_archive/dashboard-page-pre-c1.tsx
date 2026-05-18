import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard'
import {
  GreetingStrip,
  IslandExplorerRow,
  AdaptiveHeroCard,
  QuickActionsRow,
  HomeCardCarousel,
  BuddyPickCard,
  WeatherGlanceCard,
  TravelTipCard,
  MobileChatEntryBar,
} from '@/components/home'
import { deriveUserState } from '@/lib/derive-user-state'
import type { Trip } from '@/types/database'

export const dynamic = 'force-dynamic'

/**
 * /dashboard — Home Dashboard (Phase B rebuild per UI/UX Spec §5.1).
 *
 * Adaptive composition that surfaces the right content for the user's
 * current trip state (new / planner / booked). Server component fetches
 * user + trips, derives state, then renders 8 home sections + optional
 * mobile chat entry bar.
 *
 * Section order matches mobile:
 *   1. GreetingStrip (time-aware, Buddy avatar, notification bell)
 *   2. IslandExplorerRow (9 circular island avatars, horizontal scroll)
 *   3. AdaptiveHeroCard (3-state — seasonal / progress / countdown)
 *   4. QuickActionsRow (4 tiles → chat with preloaded prompts)
 *   5. HomeCardCarousel (state-aware 6 cards)
 *   6. BuddyPickCard (weekly rotating gold editorial pick)
 *   7. WeatherGlanceCard (weather at primary destination)
 *   8. TravelTipCard (daily rotating editorial tip)
 *   9. MobileChatEntryBar (xl:hidden — chat entry on tablet/phone)
 */
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed, display_name')
    .eq('id', user.id)
    .single()
  if (profile && !profile.onboarding_completed) redirect('/onboarding')

  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  const tripList = (trips ?? []) as Trip[]
  const { state, primaryTrip } = deriveUserState(tripList)

  // First-name extraction for greeting
  const displayName = profile?.display_name ?? null
  const firstName = displayName?.split(' ')[0] || user.email?.split('@')[0]

  // Weather card destination — primary trip's first island, else Nassau
  const weatherIsland = primaryTrip?.islands?.[0] || 'Nassau'

  return (
    <DashboardShell
      userEmail={user.email ?? undefined}
      displayName={displayName ?? undefined}
    >
      {/* Centered content column. The max-w keeps the home dashboard
          readable on desktop where the main area is wide (post-sidebar +
          pre-chat panel). On tablet/phone, the main column is wider so
          the same max-w gives a comfortable single-column feel. */}
      <div className="max-w-3xl mx-auto pb-2">
        <GreetingStrip
          name={firstName}
          hasActiveTrip={state !== 'new'}
          unreadCount={0}
        />

        <div className="mb-6">
          <IslandExplorerRow />
        </div>

        <div className="px-5 md:px-6 mb-7">
          <AdaptiveHeroCard trips={tripList} />
        </div>

        <div className="px-5 md:px-6 mb-7">
          <QuickActionsRow />
        </div>

        <div className="mb-7">
          <HomeCardCarousel userState={state} primaryTrip={primaryTrip} />
        </div>

        <div className="mb-7">
          <BuddyPickCard />
        </div>

        <div className="mb-6">
          <WeatherGlanceCard island={weatherIsland} />
        </div>

        <div className="mb-8">
          <TravelTipCard />
        </div>

        <MobileChatEntryBar />
      </div>
    </DashboardShell>
  )
}
