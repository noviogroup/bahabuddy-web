/**
 * AdaptiveHeroCard — Home Dashboard hero, adapts to user state.
 */

import { HeroCard } from '@/components/ui'
import { deriveUserState } from '@/lib/derive-user-state'
import { resolveStaticDefaultHeaderImage } from '@/lib/default-headers'
import type { Trip } from '@/types/database'

export type { UserState } from '@/lib/derive-user-state'

export interface AdaptiveHeroCardProps {
  trips: Trip[]
}

function currentMonth(): string {
  return new Date().toLocaleString('en-US', { month: 'long' })
}

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export default function AdaptiveHeroCard({ trips }: AdaptiveHeroCardProps) {
  const { state, primaryTrip } = deriveUserState(trips)

  if (state === 'booked' && primaryTrip) {
    const days = primaryTrip.date_start ? daysUntil(primaryTrip.date_start) : null
    const header = resolveStaticDefaultHeaderImage({
      customImageUrl: primaryTrip.hero_image_url,
      island: primaryTrip.islands?.[0],
      category: 'Luxury',
      preferredVariant: 'desktop',
    })

    return (
      <HeroCard
        imageUrl={header.url}
        alt={primaryTrip.hero_image_url ? primaryTrip.name : header.alt}
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
    const header = resolveStaticDefaultHeaderImage({
      customImageUrl: primaryTrip.hero_image_url,
      island: primaryTrip.islands?.[0],
      category: 'Local Gems',
      preferredVariant: 'desktop',
    })

    return (
      <HeroCard
        imageUrl={header.url}
        alt={primaryTrip.hero_image_url ? primaryTrip.name : header.alt}
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

  const header = resolveStaticDefaultHeaderImage({ category: 'Local Gems', preferredVariant: 'desktop' })

  return (
    <HeroCard
      imageUrl={header.url}
      alt={header.alt}
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
