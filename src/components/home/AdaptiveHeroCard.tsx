'use client'

/**
 * AdaptiveHeroCard — Home Dashboard hero, adapts to user state.
 *
 * UI/UX Spec §5.1 "Adaptive states" table:
 *
 *   New user        → Seasonal feature (e.g. "This month: Junkanoo in Nassau")
 *   Active planner  → "Your trip is taking shape" + progress chip
 *   Booked traveler → Destination photo + countdown to departure
 *
 * Mobile reference: lib/features/home/widgets/hero_card.dart
 *
 * Built on <HeroCard> primitive (already supports image bg, gradient,
 * badge, title, subtitle, CTA). This component is the state machine
 * that chooses which content to feed it.
 */

import { HeroCard } from '@/components/ui'
import { deriveUserState } from '@/lib/derive-user-state'
import { BahaImages } from '@/lib/baha-images'
import type { Trip } from '@/types/database'

export type { UserState } from '@/lib/derive-user-state'

export interface AdaptiveHeroCardProps {
  /** All of the user's trips. Determines which state to render. */
  trips: Trip[]
}

/** Current month name (server-safe — works at build/render time). */
function currentMonth(): string {
  return new Date().toLocaleString('en-US', { month: 'long' })
}

/** Whole days between now and a future ISO date. */
function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export default function AdaptiveHeroCard({ trips }: AdaptiveHeroCardProps) {
  const { state, primaryTrip } = deriveUserState(trips)

  if (state === 'booked' && primaryTrip) {
    const days = primaryTrip.date_start ? daysUntil(primaryTrip.date_start) : null
    return (
      <HeroCard
        imageUrl={primaryTrip.hero_image_url || BahaImages.exumas}
        alt={primaryTrip.name}
        height="h-64 md:h-72"
        badge={days === 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : days != null ? `${days} DAYS AWAY` : 'BOOKED'}
        badgeColor="palm"
        title={primaryTrip.name}
        subtitle={
          primaryTrip.islands && primaryTrip.islands.length > 0
            ? `${primaryTrip.islands.slice(0, 3).join(' · ')}`
            : 'Your Bahamas adventure awaits.'
        }
        ctaLabel="View trip"
        href={`/trip/${primaryTrip.id}`}
        overlay="bottom"
      />
    )
  }

  if (state === 'planner' && primaryTrip) {
    return (
      <HeroCard
        imageUrl={primaryTrip.hero_image_url || BahaImages.bahamasLifestyle}
        alt={primaryTrip.name}
        height="h-64 md:h-72"
        badge="IN PROGRESS"
        badgeColor="brand"
        title="Your trip is taking shape"
        subtitle={`${primaryTrip.name} — pick up where you left off.`}
        ctaLabel="Continue planning"
        href={`/trip/${primaryTrip.id}`}
        overlay="bottom"
      />
    )
  }

  // New user — seasonal feature
  return (
    <HeroCard
      imageUrl={BahaImages.bahamasLifestyle}
      alt="The Bahamas"
      height="h-64 md:h-72"
      badge={`THIS ${currentMonth().toUpperCase()}`}
      badgeColor="gold"
      title="Your perfect Bahamas trip starts with a chat"
      subtitle="Tell Buddy what you're thinking — a vibe, a dream, a rough idea — and watch your plan come together."
      ctaLabel="Start with Buddy"
      href="/dashboard/chat"
      overlay="bottom"
    />
  )
}
