import Image from 'next/image'
import Link from 'next/link'
import StoreBadgeLinks from '@/components/StoreBadgeLinks'
import { BuddyAvatar } from '@/components/ui'
import { BahaImages } from '@/lib/baha-images'

const DIFFERENTIATORS = [
  {
    title: 'Bahamas-only intelligence',
    body: 'Buddy plans from curated Bahamas places, islands, stays, tours, restaurants, and travel context.',
  },
  {
    title: 'Planning plus booking',
    body: 'Explore first, then check stays, compare flights, save picks, and book without losing the trip context.',
  },
  {
    title: 'Travels with you',
    body: 'The mobile app carries the itinerary, live guidance, maps, reminders, and Buddy support while you are on island.',
  },
]

const APP_MESSAGES = [
  { who: 'traveler', text: 'Plan 5 days in Exuma with beaches, food, and one boat day.' },
  { who: 'buddy', text: 'I would base you near George Town, add a calm first day, and save the pigs tour for Day 3.' },
]

export default function TravelCompanionSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-brand-50/30 to-white py-20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent" />
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.86fr]">
          <div>
            <p className="text-sm font-bold uppercase text-brand-600">
              Travel Companion
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold text-night">
              More than a booking site. Your Bahamas travel companion.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-charcoal">
              Search stays and flights, compare Bahamas picks, and keep bookings tied to the trip plan.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {DIFFERENTIATORS.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-baha-xl border border-brand-100 bg-white/85 p-5 shadow-soft"
                >
                  <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <h3 className="font-bold text-night">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-card transition-colors hover:bg-brand-700"
              >
                Start planning with Buddy
              </Link>
              <Link
                href="/stays"
                className="inline-flex items-center justify-center rounded-full border border-brand-200 bg-white px-6 py-3 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50"
              >
                Browse travel deals
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-gold-300/40 blur-3xl" />
            <div className="absolute -right-10 bottom-16 h-40 w-40 rounded-full bg-brand-300/40 blur-3xl" />

            <div className="relative rounded-[2.2rem] border border-night/10 bg-night p-3 shadow-2xl">
              <div className="overflow-hidden rounded-[1.7rem] bg-white">
                <div className="relative h-44">
                  <Image
                    src={BahaImages.exumas}
                    alt="Exuma turquoise water in The Bahamas"
                    fill
                    className="object-cover"
                    sizes="360px"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-night/75 via-night/20 to-transparent" />
                  <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-soft">
                      <BuddyAvatar size="xs" state="greeting" />
                      <span className="text-xs font-bold text-brand-700">Baha Buddy</span>
                    </div>
                    <span className="rounded-full bg-gold-400 px-3 py-1 text-xs font-bold uppercase text-night">
                      Live Trip
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-xs font-bold uppercase text-white/75">Exuma Plan</p>
                    <h3 className="mt-1 text-2xl font-bold leading-tight text-white">
                      5 days, built around your pace.
                    </h3>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  {APP_MESSAGES.map((message) => (
                    <div
                      key={message.text}
                      className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-5 ${
                        message.who === 'traveler'
                          ? 'ml-auto bg-brand-600 text-white'
                          : 'bg-buddy-bubble text-night'
                      }`}
                    >
                      {message.text}
                    </div>
                  ))}

                  <div className="rounded-2xl border border-brand-100 bg-brand-50/80 p-3">
                    <p className="text-xs font-bold uppercase text-brand-700">
                      Buddy picked
                    </p>
                    <div className="mt-2 grid grid-cols-[3.25rem_1fr] gap-3">
                      <div className="relative overflow-hidden rounded-xl">
                        <Image
                          src={BahaImages.snorkeling}
                          alt="Bahamas snorkeling"
                          width={80}
                          height={80}
                          className="h-14 w-14 object-cover"
                          unoptimized
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-night">Calm-water snorkel day</p>
                        <p className="mt-0.5 text-xs leading-5 text-gray-600">
                          Fits your family pace and keeps the boat day away from arrival day.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    {['Stay', 'Flight', 'Guide'].map((label) => (
                      <div key={label} className="rounded-xl bg-sand-100 px-2 py-2">
                        <p className="text-xs font-bold uppercase text-brand-700">{label}</p>
                        <p className="mt-0.5 text-xs font-bold text-night">Ready</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <StoreBadgeLinks className="mt-6" height={38} />
          </div>
        </div>
      </div>
    </section>
  )
}
