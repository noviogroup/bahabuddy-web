import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
        <QuickActionsRow />
      </div>

      {/*
        Direct-search row — links straight to /flights and /hotels for
        users who'd rather drive the search themselves than chat. Sits
        right under QuickActionsRow (the chat-mediated affordance) so
        the two are visually paired. Mobile reference is forthcoming —
        web is leading on this surface.
      */}
      <div className="px-5 md:px-6 mb-7">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Or search directly
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/flights"
            className="group flex items-center gap-3 bg-white rounded-baha-lg border border-gray-200 shadow-soft hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 p-4"
          >
            <span className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 group-hover:bg-brand-500 group-hover:text-white flex items-center justify-center transition-colors duration-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16l7-3v-5a2 2 0 014 0v5l7 3v2l-7-2v3l2 1.5V20l-4-1-4 1v-1.5L10 17v-3l-7 2v-2z" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-night">Flights</p>
              <p className="text-xs text-gray-500 truncate">Live Duffel prices</p>
            </div>
          </Link>
          <Link
            href="/hotels"
            className="group flex items-center gap-3 bg-white rounded-baha-lg border border-gray-200 shadow-soft hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 p-4"
          >
            <span className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 group-hover:bg-brand-500 group-hover:text-white flex items-center justify-center transition-colors duration-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V8a1 1 0 011-1h16a1 1 0 011 1v13M3 21h18M9 21V10m6 11V10M7 13h2m6 0h2M7 16h2m6 0h2" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-night">Hotels</p>
              <p className="text-xs text-gray-500 truncate">Browse curated stays</p>
            </div>
          </Link>
        </div>
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
  )
}
