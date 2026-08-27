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
 * Each card prefers a direct product surface when the app already has one
 * (stays, flights, explore, trip). Buddy remains for open-ended planning.
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

const ISLAND_AIRPORTS: Record<string, string> = {
  nassau: 'NAS',
  'new providence': 'NAS',
  'paradise island': 'NAS',
  exuma: 'EXU',
  exumas: 'EXU',
  'the exumas': 'EXU',
  eleuthera: 'ELH',
  'harbour island': 'ELH',
  'harbor island': 'ELH',
  'grand bahama': 'FPO',
  freeport: 'FPO',
  bimini: 'BIM',
  andros: 'ASD',
  abaco: 'MHH',
  abacos: 'MHH',
  'the abacos': 'MHH',
}

const ISLAND_SLUGS: Record<string, string> = {
  nassau: 'nassau-paradise-island',
  'new providence': 'nassau-paradise-island',
  'paradise island': 'paradise-island',
  exuma: 'the-exumas',
  exumas: 'the-exumas',
  'the exumas': 'the-exumas',
  eleuthera: 'eleuthera-harbour-island',
  'harbour island': 'harbour-island',
  'harbor island': 'harbour-island',
  'grand bahama': 'grand-bahama',
  freeport: 'grand-bahama',
  bimini: 'bimini',
  andros: 'andros',
  abaco: 'abacos',
  abacos: 'abacos',
  'the abacos': 'abacos',
  'long island': 'long-island',
}

function normalizeIsland(value: string | undefined): string {
  return (value ?? '').trim()
}

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function islandAirport(value: string): string {
  return ISLAND_AIRPORTS[normalizedKey(value)] ?? 'NAS'
}

function islandSlug(value: string | undefined): string {
  const key = normalizedKey(value ?? '')
  return ISLAND_SLUGS[key] ?? 'nassau-paradise-island'
}

function withParams(path: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  const qs = query.toString()
  return qs ? `${path}?${qs}` : path
}

function newTripUrl(input: { destination: string; seed: string; source?: string }): string {
  return withParams('/dashboard/trips/new', {
    source: input.source ?? 'home_card',
    destination: input.destination,
    seed: input.seed,
  })
}

function explorePlacesUrl(input: { island?: string; search?: string; category?: string }): string {
  return withParams('/explore/places', input)
}

function tripDateRange(primaryTrip: Trip): { start: string; end: string } {
  return {
    start: primaryTrip.date_start ?? '',
    end: primaryTrip.date_end ?? '',
  }
}

function tripStaysUrl(primaryTrip: Trip): string {
  const island = normalizeIsland(primaryTrip.islands?.[0]) || 'Nassau'
  const { start, end } = tripDateRange(primaryTrip)
  const params = new URLSearchParams()
  params.set('island', island)
  params.set('sort', 'stars')
  if (start) params.set('checkin', start)
  if (end) params.set('checkout', end)
  if (primaryTrip.party_size > 0) params.set('adults', String(Math.min(primaryTrip.party_size, 9)))
  params.set('rooms', '1')
  return `/stays?${params.toString()}`
}

function tripFlightsUrl(primaryTrip: Trip): string {
  const island = normalizeIsland(primaryTrip.islands?.[0]) || 'Nassau'
  const { start, end } = tripDateRange(primaryTrip)
  const params = new URLSearchParams()
  params.set('destination', islandAirport(island))
  params.set('tripType', end ? 'round_trip' : 'one_way')
  if (start) params.set('depart', start)
  if (end) params.set('return', end)
  if (primaryTrip.party_size > 0) params.set('passengers', String(Math.min(primaryTrip.party_size, 9)))
  params.set('cabin', 'economy')
  return `/flights?${params.toString()}`
}

function tripExploreUrl(primaryTrip: Trip): string {
  const island = normalizeIsland(primaryTrip.islands?.[0])
  const params = new URLSearchParams()
  if (island) params.set('island', island)
  params.set('category', 'tours')
  return `/explore/places?${params.toString()}`
}

function newUserCards(): CarouselCard[] {
  return [
    { key: 'popular',  title: '5-day island hopping',    subtitle: 'Popular itinerary',  imageKey: 'exumas',         accent: 'brand', href: newTripUrl({ destination: 'the-exumas', seed: '5-day island hopping with stays, flights, food, beaches, and a relaxed pace.' }) },
    { key: 'pigs',     title: 'Swim with the pigs',      subtitle: 'Big Major Cay',      imageKey: 'swimmingPigs',   accent: 'coral', href: explorePlacesUrl({ island: 'the-exumas', search: 'swimming pigs Big Major Cay', category: 'Activity' }) },
    { key: 'hidden',   title: "Buddy's hidden gem",      subtitle: 'Long Island',        imageKey: 'longIsland',     accent: 'gold',  href: '/explore/island/long-island' },
    { key: 'quiz',     title: 'Which island fits you?',  subtitle: '2-minute quiz',      imageKey: 'paradiseIsland', accent: 'brand', href: '/explore/quiz' },
    { key: 'snorkel',  title: 'Snorkel the reefs',       subtitle: 'Family snorkeling',  imageKey: 'snorkeling',     accent: 'palm',  href: explorePlacesUrl({ search: 'snorkeling reefs family', category: 'Water Activity' }) },
    { key: 'foodie',   title: 'Where the locals eat',    subtitle: 'Foodie tour',        imageKey: 'nassau',         accent: 'coral', href: '/restaurants?island=Nassau&cuisine=Bahamian' },
  ]
}

function plannerCards(primaryTrip: Trip): CarouselCard[] {
  return [
    { key: 'continue', title: 'Continue your plan',      subtitle: primaryTrip.name,     imageKey: 'bahamasLifestyle', accent: 'brand', href: `/trip/${primaryTrip.id}` },
    { key: 'flights',  title: 'Flights from your city',  subtitle: 'Check options',      imageKey: 'nassau',           accent: 'brand', href: tripFlightsUrl(primaryTrip) },
    { key: 'hotels',   title: 'Top-rated hotels',        subtitle: 'For your dates',     imageKey: 'paradiseIsland',   accent: 'gold',  href: tripStaysUrl(primaryTrip) },
    { key: 'addon',    title: 'You might also like',     subtitle: 'Similar experiences',imageKey: 'sunsetSailing',    accent: 'coral', href: tripExploreUrl(primaryTrip) },
    { key: 'budget',   title: 'Track your budget',       subtitle: 'See breakdown',      imageKey: 'beach',            accent: 'palm',  href: `/trip/${primaryTrip.id}` },
    { key: 'share',    title: 'Share with travelers',    subtitle: 'Invite companions',  imageKey: 'longIsland',       accent: 'brand', href: `/trip/${primaryTrip.id}` },
  ]
}

function bookedCards(primaryTrip: Trip): CarouselCard[] {
  const island = normalizeIsland(primaryTrip.islands?.[0])
  const islandParam = island ? islandSlug(island) : undefined
  return [
    { key: 'next',     title: 'Your next reservation',   subtitle: 'Check-in details',     imageKey: 'paradiseIsland', accent: 'brand', href: `/trip/${primaryTrip.id}` },
    { key: 'weather',  title: '7-day forecast',          subtitle: 'For your destination',  imageKey: 'beach',          accent: 'gold',  href: '/dashboard#weather' },
    { key: 'pack',     title: 'What to pack',            subtitle: 'Smart checklist',       imageKey: 'bahamasLifestyle', accent: 'palm', href: '/dashboard/chat?q=' + encodeURIComponent(`What should I pack for my ${primaryTrip.name} trip?`) },
    { key: 'nearby',   title: 'Must-do near your hotel', subtitle: 'Local picks',           imageKey: 'sunsetSailing',  accent: 'coral', href: explorePlacesUrl({ island: islandParam, search: 'nearby tours beaches culture', category: 'Activity' }) },
    { key: 'eat',      title: 'Where to eat',            subtitle: 'Restaurants nearby',     imageKey: 'nassau',         accent: 'brand', href: withParams('/restaurants', { island: island || 'Nassau' }) },
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
      <h2 className="text-base font-bold text-night mb-3 px-5 md:px-6">{heading}</h2>
      <div
        className="flex gap-3 md:gap-4 px-5 md:px-6 overflow-x-auto pb-3 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
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
                  <span className="text-xs font-bold uppercaser text-gray-500">{card.subtitle}</span>
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
