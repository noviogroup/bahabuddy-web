import Image from 'next/image'
import FlightSearchClient from '@/app/(dashboard)/flights/FlightSearchClient'
import { BahaImages } from '@/lib/baha-images'

/**
 * /flights — public front-end flight booking page.
 *
 * This page is visible on the front end. It uses Baha Buddy API routes so the
 * live booking provider key remains server-side.
 */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Search and book flights | Baha Buddy',
  description:
    'Search live flight options, verify rates, prebook, and book flights through Baha Buddy.',
}

export default function PublicFlightsPage() {
  return (
    <main className="min-h-screen bg-offwhite">
      <section className="relative overflow-hidden text-white">
        <Image
          src={BahaImages.nassau}
          alt="Nassau, Bahamas from the air"
          fill
          priority
          className="object-cover"
          sizes="100vw"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/90 via-brand-700/75 to-night/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(245,183,49,0.34),transparent_32%)]" />
        <div className="relative mx-auto grid max-w-6xl items-end gap-8 px-4 py-16 md:grid-cols-[1fr_0.72fr] md:py-20">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-gold-200">
              Live Bahamas Flights
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
              Compare fares, then let Buddy fit the flight into your trip.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/85">
              Browse live LiteAPI offers to Nassau, Exuma, Eleuthera, Bimini, Freeport, and the Abacos. Search is public; booking and saving require your traveler account.
            </p>
          </div>

          <div className="rounded-baha-xl border border-white/20 bg-white/10 p-5 backdrop-blur-md">
            <p className="text-xs font-extrabold uppercase tracking-wide text-gold-200">
              How it works
            </p>
            <div className="mt-4 space-y-3">
              {[
                'Pull live fares from the provider.',
                'Review airline, stops, baggage, cabin, and price expiry.',
                'Verify the fare before payment, then book into your trip.',
              ].map((item, index) => (
                <div key={item} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-400 text-sm font-extrabold text-night">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm font-semibold leading-6 text-white/90">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <FlightSearchClient />
      </section>
    </main>
  )
}
