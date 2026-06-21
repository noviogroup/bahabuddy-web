import Image from 'next/image'
import Link from 'next/link'
import StoreBadgeLinks from '@/components/StoreBadgeLinks'
import { BuddyAvatar } from '@/components/ui'
import { BahaImages } from '@/lib/baha-images'

const QUICK_BRIEF = [
  {
    label: 'You say',
    value: 'Five days, Exuma, food, beaches, one boat day.',
  },
  {
    label: 'Buddy sorts',
    value: 'Right island, best base, trip pace, and what to skip.',
  },
  {
    label: 'The plan becomes',
    value: 'Days, stays, flights, transfers, notes, and readiness.',
  },
  {
    label: 'You travel with',
    value: 'A saved itinerary Buddy can keep adjusting.',
  },
]

const ROUTE_DAYS = [
  {
    day: 'Arrival',
    title: 'Land light',
    note: 'George Town base, short first evening, dinner close to the stay.',
  },
  {
    day: 'Water day',
    title: 'Cays first',
    note: 'Boat day while energy is high, with weather room built in.',
  },
  {
    day: 'Local day',
    title: 'Slow the pace',
    note: 'Beach, lunch, market stop, and one flexible dinner choice.',
  },
  {
    day: 'Last full day',
    title: 'Leave space',
    note: 'No overpacked finale. Keep one backup beach and one easy plan.',
  },
]

const ISLANDS = [
  {
    name: 'Exuma',
    href: '/explore/island/the-exumas',
    image: BahaImages.exumas,
    use: 'Boat days, sandbars, blue-water escapes',
    note: 'Best when the water is the reason for the trip.',
  },
  {
    name: 'Nassau',
    href: '/explore/island/nassau-paradise-island',
    image: BahaImages.nassau,
    use: 'Easy arrival, dining, culture, resorts',
    note: 'Best when convenience matters.',
  },
  {
    name: 'Eleuthera',
    href: '/explore/island/eleuthera-harbour-island',
    image: BahaImages.eleuthera,
    use: 'Pink sand, coves, slower roads',
    note: 'Best when the trip needs quiet.',
  },
  {
    name: 'Bimini',
    href: '/explore/island/bimini',
    image: BahaImages.bimini,
    use: 'Short hops, fishing, diving, beach clubs',
    note: 'Best for quick getaways.',
  },
  {
    name: 'The Abacos',
    href: '/explore/island/abacos',
    image: BahaImages.abacos,
    use: 'Sailing, marinas, cays, island hopping',
    note: 'Best when the boat is the base.',
  },
]

const DEPTH_ROWS = [
  {
    label: 'Base',
    title: 'The stay has to match the island plan.',
    body: 'Buddy looks at arrival airport, transfers, restaurant access, beaches, and the kind of downtime you actually want.',
    href: '/stays',
    cta: 'Browse stays',
  },
  {
    label: 'Days',
    title: 'Activities need sequencing, not stacking.',
    body: 'A boat day, a beach day, and a food stop are better when the order respects weather, travel time, and energy.',
    href: '/explore',
    cta: 'Explore ideas',
  },
  {
    label: 'Readiness',
    title: 'Good plans include the unglamorous details.',
    body: 'Entry requirements, packing, airport choices, inter-island movement, and backup timing live with the itinerary.',
    href: '/how-it-works',
    cta: 'Check travel info',
  },
]

const READY_ITEMS = [
  {
    label: 'Documents',
    value: 'Entry notes stay with the trip.',
  },
  {
    label: 'Movement',
    value: 'Airport, ferry, transfer, and short-hop timing are visible.',
  },
  {
    label: 'Weather',
    value: 'Backup water days are planned before they are needed.',
  },
]

const CONCIERGE_POINTS = [
  'Human-reviewed Bahamas itinerary',
  'Hotel, dining, activity, and transfer suggestions',
  'Travel-document guidance where relevant',
  'Practical notes you can take into the trip',
]

const MARKETPLACE_LANES = [
  {
    label: 'Stays',
    title: 'Hotels, resorts, villas, homes',
    body: 'Start with star-led Bahamas stay picks, then narrow by island, area, stay type, dates, travelers, amenities, and guest score.',
    href: '/stays?sort=stars',
    action: 'Compare stays',
    image: BahaImages.nassau,
    metric: 'Stay filters',
  },
  {
    label: 'Flights',
    title: 'Live Bahamas fares',
    body: 'Search by city or airport, compare current fares, review airline details, then continue to the booking flow when the fare is ready.',
    href: '/flights',
    action: 'Compare flights',
    image: BahaImages.flight,
    metric: 'Live search',
  },
  {
    label: 'Explore',
    title: 'Islands, food, tours, beaches',
    body: 'Browse public Explore for islands, beaches, restaurants, tours, culture, hotels, and transport without starting in chat.',
    href: '/explore',
    action: 'Open Explore',
    image: BahaImages.junkanoo,
    metric: 'Trip ideas',
  },
  {
    label: 'Concierge',
    title: 'Human-reviewed trip support',
    body: 'Use Concierge when a traveler wants local review across hotels, dining, activities, transfers, and travel-document notes.',
    href: '/concierge-trip-plan',
    action: 'Review Concierge',
    image: BahaImages.exumas,
    metric: 'Trip review',
  },
]

function homepageTripHref(seed: string, returnTo = '/'): string {
  const params = new URLSearchParams()
  params.set('returnTo', returnTo)
  params.set('source', 'homepage')
  params.set('seed', seed.replace(/\s+/g, ' ').trim().slice(0, 600))
  return `/dashboard/trips/new?${params.toString()}`
}

function PrimaryLink({
  href,
  children,
  variant = 'blue',
}: {
  href: string
  children: React.ReactNode
  variant?: 'blue' | 'white' | 'outline'
}) {
  const className =
    variant === 'white'
      ? 'bg-white text-brand-700 hover:bg-brand-50'
      : variant === 'outline'
        ? 'border border-brand-200 bg-white text-brand-700 hover:border-brand-300 hover:bg-brand-50'
        : 'bg-brand-600 text-white hover:bg-brand-700'

  return (
    <Link
      href={href}
      className={`inline-flex w-fit items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
    >
      {variant !== 'outline' && (
        <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
      )}
      {children}
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-brand-700">
      <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
      {children}
    </p>
  )
}

function DarkSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gold-300">
      <span className="h-2 w-2 rounded-full bg-gold-300" aria-hidden="true" />
      {children}
    </p>
  )
}

function BriefStrip() {
  return (
    <section className="relative z-10 bg-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="-mt-10 overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white text-night shadow-2xl shadow-brand-900/10">
          <div className="grid md:grid-cols-4">
            {QUICK_BRIEF.map((item, index) => (
              <div
                key={item.label}
                className={`p-5 ${index > 0 ? 'border-t border-gray-100 md:border-l md:border-t-0' : ''}`}
              >
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-brand-700">
                  <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-charcoal">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function MarketplaceLanes() {
  return (
    <section aria-labelledby="homepage-marketplace-title" className="bg-white py-14 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <SectionLabel>Bookable Bahamas trip parts</SectionLabel>
            <h2 id="homepage-marketplace-title" className="mt-3 text-3xl font-extrabold leading-tight text-night md:text-5xl">
              Everything starts as a real trip action.
            </h2>
          </div>
          <p className="max-w-sm text-sm font-semibold leading-6 text-charcoal md:text-right">
            Public visitors can explore first. Saving, checkout, booking, and trip changes wait until sign-in.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {MARKETPLACE_LANES.map((lane) => (
            <Link
              key={lane.label}
              href={lane.href}
              className="group overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <div className="relative h-40 overflow-hidden">
                <Image
                  src={lane.image}
                  alt={`${lane.label} in The Bahamas`}
                  fill
                  loading="eager"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 1024px) 50vw, 260px"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-night/70 via-night/10 to-transparent" />
                <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-brand-700 shadow-soft">
                  {lane.metric}
                </div>
              </div>
              <div className="p-5">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-brand-700">
                  <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                  {lane.label}
                </p>
                <h3 className="mt-2 text-xl font-extrabold leading-tight text-night">
                  {lane.title}
                </h3>
                <p className="mt-3 min-h-24 text-sm font-semibold leading-6 text-charcoal">
                  {lane.body}
                </p>
                <span className="mt-4 inline-flex rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-extrabold text-night transition-colors group-hover:border-brand-200 group-hover:bg-brand-50 group-hover:text-brand-700">
                  {lane.action}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function BuddyNotebook() {
  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
          <div className="grid gap-0 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="bg-offwhite p-6 md:p-8 lg:p-10">
              <SectionLabel>Buddy field notes</SectionLabel>
              <h2 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight text-night md:text-5xl">
                Better Bahamas trips come from better decisions.
              </h2>
              <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-charcoal md:text-lg md:leading-8">
                Baha Buddy turns a plain request into island fit, trip pace, day order, backup timing, and practical next steps.
              </p>

              <div className="mt-6 rounded-3xl border border-gold-200 bg-white p-5 shadow-soft">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-gold-800">
                  Traveler said
                </p>
                <p className="mt-2 text-2xl font-extrabold leading-tight text-night">
                  Five days in Exuma. Great food. One boat day. Not rushed.
                </p>
                <div className="mt-4 grid gap-2 text-sm font-bold text-charcoal sm:grid-cols-2">
                  <span className="rounded-full bg-offwhite px-3 py-2">Exuma fits the brief</span>
                  <span className="rounded-full bg-offwhite px-3 py-2">Boat day goes early</span>
                  <span className="rounded-full bg-offwhite px-3 py-2">Dinner stays close</span>
                  <span className="rounded-full bg-offwhite px-3 py-2">Backup beach stays ready</span>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <PrimaryLink
                  href={homepageTripHref('Five days in Exuma with great food, one boat day, beaches, and a relaxed pace.')}
                >
                  Start this trip
                </PrimaryLink>
                <PrimaryLink href="/destinations" variant="outline">Compare islands</PrimaryLink>
              </div>
            </div>

            <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative min-h-[20rem] overflow-hidden rounded-3xl lg:min-h-full">
                <Image
                  src={BahaImages.exumas}
                  alt="Exuma turquoise water in The Bahamas"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 420px"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-night/20 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-white/75">
                    Buddy reads this as
                  </p>
                  <p className="mt-2 text-2xl font-extrabold leading-tight">
                    Water-led, mid-pace, food-forward
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-soft">
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-gray-100 bg-offwhite px-4 py-3">
                  <BuddyAvatar size="sm" state="thinking" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-700">
                      Route logic
                    </p>
                    <p className="text-sm font-extrabold text-night">Built around weather and pace</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {ROUTE_DAYS.map((item, index) => (
                    <div key={item.day} className="grid grid-cols-[2.25rem_1fr] gap-3 rounded-2xl border border-gray-100 bg-white p-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-black text-brand-700">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-700">{item.day}</p>
                        <h3 className="mt-1 font-extrabold text-night">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-charcoal">{item.note}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-palm-100 bg-palm-50 px-4 py-3">
                  <p className="text-sm font-extrabold leading-6 text-palm-800">
                    The value is not more options. It is knowing which option belongs in the trip.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function IslandMosaic() {
  const [feature, ...supporting] = ISLANDS

  return (
    <section className="bg-offwhite py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <SectionLabel>Choose the island first</SectionLabel>
            <h2 className="mt-3 text-4xl font-extrabold leading-tight text-night md:text-5xl">
              Bahamas planning changes island by island.
            </h2>
          </div>
          <p className="max-w-sm text-base leading-7 text-charcoal">
            The right answer for Nassau can be the wrong answer for Exuma. Buddy starts with that difference.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Link
            href={feature.href}
            className="group relative min-h-[30rem] overflow-hidden rounded-[1.75rem] bg-night text-white shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <Image
              src={feature.image}
              alt={`${feature.name}, Bahamas`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 680px"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <p className="text-xs font-black uppercase text-white/75">Buddy often starts here</p>
              <h3 className="mt-2 text-4xl font-extrabold">{feature.name}</h3>
              <p className="mt-3 max-w-lg text-lg font-semibold leading-8 text-white/85">{feature.use}</p>
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-extrabold text-brand-700">
                <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                Explore {feature.name}
              </p>
            </div>
          </Link>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {supporting.map((island) => (
              <Link
                key={island.name}
                href={island.href}
                className="group grid min-h-[9.25rem] grid-cols-[7.5rem_1fr] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-soft transition-all hover:border-brand-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <div className="relative">
                  <Image
                    src={island.image}
                    alt={`${island.name}, Bahamas`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="120px"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs font-black uppercase text-gray-500">{island.name}</p>
                  <h3 className="mt-1 text-base font-extrabold leading-snug text-night">{island.use}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{island.note}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function PlanningDepth() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 lg:grid-cols-[0.76fr_1fr] lg:items-start">
          <div className="max-w-xl">
            <SectionLabel>What Buddy is actually doing</SectionLabel>
            <h2 className="mt-3 text-4xl font-extrabold leading-tight text-night md:text-5xl">
              The itinerary is the interface.
            </h2>
            <p className="mt-5 text-lg leading-8 text-charcoal">
              Instead of making travelers bounce between searches, Buddy keeps each choice connected to the trip it belongs to.
            </p>

            <div className="mt-8 rounded-3xl border border-gold-200 bg-sand-50 p-5 shadow-soft">
              <p className="text-sm font-black uppercase text-gold-800">
                Plain English input
              </p>
              <p className="mt-2 text-2xl font-extrabold leading-tight text-night">
                We want a honeymoon that feels polished, but not packed.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-card">
            {DEPTH_ROWS.map((row, index) => (
              <Link
                key={row.label}
                href={row.href}
                className={`group grid gap-4 p-5 transition-colors hover:bg-brand-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 sm:grid-cols-[7rem_1fr_auto] sm:items-center md:p-6 ${
                  index > 0 ? 'border-t border-gray-200' : ''
                }`}
              >
                <p className="text-xs font-black uppercase text-brand-700">{row.label}</p>
                <div>
                  <h3 className="text-xl font-extrabold leading-tight text-night">{row.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-charcoal">{row.body}</p>
                </div>
                <span className="inline-flex w-fit rounded-full border border-brand-200 px-4 py-2 text-sm font-extrabold text-brand-700 transition-colors group-hover:border-brand-300 group-hover:bg-white">
                  {row.cta}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ConciergeReadiness() {
  return (
    <section className="bg-gradient-brand py-20 text-white md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <DarkSectionLabel>Travel readiness</DarkSectionLabel>
            <h2 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight md:text-5xl">
              Buddy plans the fun. The details still matter.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
              Bahamas trips can involve passports, airport choices, ferries, short hops, weather calls, and island-specific logistics. Keep those details with the plan instead of in scattered tabs.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink href="/how-it-works" variant="white">View travel info</PrimaryLink>
              <PrimaryLink href="/concierge-trip-plan" variant="outline">Get concierge review</PrimaryLink>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-white/20 bg-white/12 shadow-card backdrop-blur">
            <div className="relative h-48">
              <Image
                src={BahaImages.nassau}
                alt="Nassau waterfront and Bahamas travel"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 480px"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-night/70 via-night/15 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
                <BuddyAvatar size="sm" state="presenting" />
                <div>
                  <p className="text-xs font-black uppercase text-white/70">Departure brief</p>
                  <h3 className="text-xl font-extrabold">Ready before you land.</h3>
                </div>
              </div>
            </div>
            <div className="divide-y divide-white/10">
              {READY_ITEMS.map((item) => (
                <div key={item.label} className="grid gap-2 px-5 py-4 sm:grid-cols-[7rem_1fr]">
                  <p className="text-xs font-black uppercase text-gold-300">{item.label}</p>
                  <p className="text-sm font-semibold leading-6 text-white/80">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 px-5 py-5">
              <p className="text-xs font-black uppercase text-white/65">Concierge upgrade</p>
              <ul className="mt-4 grid gap-3">
                {CONCIERGE_POINTS.map((point) => (
                  <li key={point} className="flex gap-3 text-sm font-semibold leading-6 text-white/80">
                    <span className="mt-2 h-2 w-2 shrink-0 bg-gold-300" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function AppPocketBand() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 rounded-[1.75rem] border border-gray-200 bg-offwhite p-5 shadow-sm md:grid-cols-[0.95fr_1.05fr] md:p-8 lg:p-10">
          <div>
            <SectionLabel>Your Bahamas, in your pocket</SectionLabel>
            <h2 className="mt-3 max-w-xl text-4xl font-extrabold leading-tight text-night md:text-5xl">
              Plan on the web. Travel with Buddy in the app.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-charcoal">
              Save the itinerary, bring your trip timeline, and keep Buddy nearby for island questions while you travel.
            </p>
            <StoreBadgeLinks className="mt-7 justify-start" height={42} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative min-h-[17rem] overflow-hidden rounded-3xl bg-night text-white">
              <Image
                src={BahaImages.exumas}
                alt="Exuma water and Bahamas trip planning"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 320px"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-night/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs font-black uppercase text-white/75">Saved trip</p>
                <p className="mt-1 text-2xl font-extrabold">Exuma in 5 days</p>
              </div>
            </div>
            <div className="grid content-center gap-3">
              {['Itinerary ready', 'Stays saved', 'Travel reminders set', 'Buddy chat open'].map((item) => (
                <div key={item} className="border border-gray-200 bg-white px-4 py-4 text-sm font-extrabold text-night shadow-soft">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function HomepageStorySections() {
  return (
    <>
      <BriefStrip />
      <MarketplaceLanes />
      <BuddyNotebook />
      <IslandMosaic />
      <PlanningDepth />
      <ConciergeReadiness />
      <AppPocketBand />
    </>
  )
}
