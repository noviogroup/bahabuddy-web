'use client'

/**
 * HomeCardCarousel — horizontal scrolling cards on Home Dashboard.
 *
 * Mobile reference: lib/features/home/widgets/horizontal_card_carousel.dart
 *
 * Content is state-aware (UI/UX Spec §5.1):
 *
 *   New user → Popular itineraries, signature experiences, quizzes
 *   Planner  → Continue planning, flight options, top hotels
 *   Booked   → Next reservation, weather, packing tips, must-do near hotel
 *
 * Each card either:
 *   - Opens chat with a preloaded prompt (the most common pattern), or
 *   - Navigates to a content page (/explore/island/[slug], /trip/[id]).
 */

import Link from 'next/link'
import Image from 'next/image'
import { BahaImages } from '@/lib/baha-images'
import type { UserState } from '@/lib/derive-user-state'
import type { Trip } from '@/types/database'

interface CarouselCard {
  key: string
  title: string
  subtitle: string
  imageKey: keyof typeof BahaImages
  href: string
  accent?: 'gold' | 'brand' | 'coral' | 'palm'
}

function newUserCards(): CarouselCard[] {
  return [
    { key: 'popular',  title: '5-day island hopping',    subtitle: 'Popular itinerary',  imageKey: 'exumas',         accent: 'brand', href: '/dashboard/chat?q=' + encodeURIComponent('Plan a 5-day island hopping trip') },
    { key: 'pigs',     title: 'Swim with the pigs',      subtitle: 'Big Major Cay',      imageKey: 'swimmingPigs',   accent: 'coral', href: '/dashboard/chat?q=' + encodeURIComponent('Plan a trip to swim with the pigs in Exuma') },
    { key: 'hidden',   title: "Buddy's hidden gem",      subtitle: 'Long Island',        imageKey: 'longIsland',     accent: 'gold',  href: '/dashboard/chat?q=' + encodeURIComponent("Tell me about Long Island as a Bahamas hidden gem") },
    { key: 'quiz',     title: 'Which island fits you?',  subtitle: '2-minute quiz',      imageKey: 'paradiseIsland', accent: 'brand', href: '/explore/quiz' },
    { key: 'snorkel',  title: 'Snorkel the reefs',       subtitle: 'Family snorkeling',  imageKey: 'snorkeling',     accent: 'palm',  href: '/dashboard/chat?q=' + encodeURIComponent('Best snorkeling spots in the Bahamas') },
    { key: 'foodie',   title: 'Where the locals eat',    subtitle: 'Foodie tour',        imageKey: 'nassau',         accent: 'coral', href: '/dashboard/chat?q=' + encodeURIComponent('Where do locals eat in Nassau?') },
  ]
}

function plannerCards(primaryTrip: Trip): CarouselCard[] {
  return [
    { key: 'continue', title: 'Continue your plan',      subtitle: primaryTrip.name,     imageKey: 'bahamasLifestyle', accent: 'brand', href: `/trip/${primaryTrip.id}` },
    { key: 'flights',  title: 'Flights from your city',  subtitle: 'Check options',      imageKey: 'nassau',           accent: 'brand', href: '/dashboard/chat?q=' + encodeURIComponent(`Help me find flights for my ${primaryTrip.name} trip`) },
    { key: 'hotels',   title: 'Top-rated hotels',        subtitle: 'For your dates',     imageKey: 'paradiseIsland',   accent: 'gold',  href: '/dashboard/chat?q=' + encodeURIComponent(`Show me top hotels for ${primaryTrip.name}`) },
    { key: 'addon',    title: 'You might also like',     subtitle: 'Similar experiences',imageKey: 'sunsetSailing',    accent: 'coral', href: '/dashboard/chat?q=' + encodeURIComponent(`Suggest similar experiences to add to ${primaryTrip.name}`) },
    { key: 'budget',   title: 'Track your budget',       subtitle: 'See breakdown',      imageKey: 'beach',            accent: 'palm',  href: `/trip/${primaryTrip.id}` },
    { key: 'share',    title: 'Share with travelers',    subtitle: 'Invite companions',  imageKey: 'longIsland',       accent: 'brand', href: `/trip/${primaryTrip.id}` },
  ]
}

function bookedCards(primaryTrip: Trip): CarouselCard[] {
  return [
    { key: 'next',     title: 'Your next reservation',   subtitle: 'Check-in details',     imageKey: 'paradiseIsland', accent: 'brand', href: `/trip/${primaryTrip.id}` },
    { key: 'weather',  title: '7-day forecast',          subtitle: 'For your destination',  imageKey: 'beach',          accent: 'gold',  href: '/dashboard/chat?q=' + encodeURIComponent(`What's the weather forecast for my ${primaryTrip.name} trip?`) },
    { key: 'pack',     title: 'What to pack',            subtitle: 'Smart checklist',       imageKey: 'bahamasLifestyle', accent: 'palm', href: '/dashboard/chat?q=' + encodeURIComponent(`What should I pack for my ${primaryTrip.name} trip?`) },
    { key: 'nearby',   title: 'Must-do near your hotel', subtitle: 'Local picks',           imageKey: 'sunsetSailing',  accent: 'coral', href: '/dashboard/chat?q=' + encodeURIComponent(`What should I do near my hotel on ${primaryTrip.name}?`) },
    { key: 'eat',      title: 'Where to eat',            subtitle: 'Restaurants nearby',     imageKey: 'nassau',         accent: 'brand', href: '/dashboard/chat?q=' + encodeURIComponent(`Best restaurants for my ${primaryTrip.name} trip`) },
    { key: 'tips',     title: 'Pro tips from Buddy',     subtitle: 'Insider knowledge',      imageKey: 'longIsland',     accent: 'gold',  href: '/dashboard/chat?q=' + encodeURIComponent(`Any insider tips for ${primaryTrip.name}?`) },
  ]
}

const ACCENT_RING: Record<NonNullable<CarouselCard['accent']>, string> = {
  brand: 'group-hover:ring-brand-400',
  gold:  'group-hover:ring-gold-400',
  coral: 'group-hover:ring-coral-400',
  palm:  'group-hover:ring-palm-400',
}

const ACCENT_DOT: Record<NonNullable<CarouselCard['accent']>, string> = {
  brand: 'bg-brand-500',
  gold:  'bg-gold-500',
  coral: 'bg-coral-500',
  palm:  'bg-palm-500',
}

export interface HomeCardCarouselProps {
  userState: UserState
  primaryTrip: Trip | null
  title?: string
}

export default function HomeCardCarousel({
  userState,
  primaryTrip,
  title,
}: HomeCardCarouselProps) {
  const cards =
    userState === 'booked' && primaryTrip ? bookedCards(primaryTrip)
    : userState === 'planner' && primaryTrip ? plannerCards(primaryTrip)
    : newUserCards()

  const heading = title ?? (
    userState === 'booked'  ? 'Your trip essentials'
    : userState === 'planner' ? 'Keep planning'
    : 'Explore the Bahamas'
  )

  return (
    <section aria-label={heading}>
      <h2 className="text-base md:text-lg font-bold text-night mb-3 px-5 md:px-6">{heading}</h2>
      <div
        className="flex gap-3 md:gap-4 px-5 md:px-6 overflow-x-auto pb-3 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
        {cards.map(card => {
          const accent = card.accent ?? 'brand'
          return (
            <Link
              key={card.key}
              href={card.href}
              className={`group shrink-0 w-44 md:w-52 snap-start rounded-baha-lg overflow-hidden bg-white shadow-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 ring-2 ring-transparent ${ACCENT_RING[accent]}`}
            >
              <div className="relative w-full h-28 md:h-32 bg-brand-50">
                <Image
                  src={BahaImages[card.imageKey]}
                  alt={card.title}
                  fill
                  sizes="(max-width: 768px) 176px, 208px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${ACCENT_DOT[accent]}`} aria-hidden="true" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{card.subtitle}</span>
                </div>
                <p className="text-sm font-bold text-night leading-tight line-clamp-2">{card.title}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
