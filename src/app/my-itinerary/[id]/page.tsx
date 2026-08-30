import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'

export const metadata: Metadata = {
  title: 'My Cruise Day Itinerary',
  description: 'View your Baha Buddy cruise day plan and continue to the mobile app for Live Guide mode.',
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function MyItineraryPage({ params }: PageProps) {
  const { id } = await params
  const createTripHref = `/dashboard/trips/new?${new URLSearchParams({
    returnTo: `/my-itinerary/${id}`,
    source: 'guided_itinerary',
    seed: `Guided Nassau cruise day itinerary ${id}`,
  }).toString()}`

  return (
    <main className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow="Guided day itinerary"
        title="Your cruise day plan is being prepared."
        subtitle="Keep this reference while Baha Buddy prepares the generated Nassau route, ship-return timing, and mobile Live Guide handoff."
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/nassau-cruise-itineraries', label: 'Guided tours' },
          { label: 'My itinerary' },
        ]}
        actions={(
          <>
            <Link href={createTripHref} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700">
              Create related trip
            </Link>
            <Link href="/nassau-cruise-itineraries" className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50">
              Browse guided days
            </Link>
          </>
        )}
      >
        <div className="flex flex-wrap gap-2 text-xs font-bold text-charcoal">
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
            Order reference {id}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
            Mobile Live Guide handoff
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
            Ship-return buffer
          </span>
        </div>
      </CompactPageHeader>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="rounded-baha-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Current status</p>
            <h2 className="mt-3 text-2xl font-bold text-night">Baha Buddy is preparing the usable trip view.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-charcoal">
              The order is captured, and this web route is reserved for the itinerary handoff. The traveler-facing plan should show stops, timing, walking guidance, and return-to-ship reminders once the generated itinerary is attached.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Attach the plan',
                body: 'Connect the generated route to this reference so the trip shows real stops, timing, notes, and island context.',
              },
              {
                title: 'Open Live Guide',
                body: 'Continue turn-by-turn guided navigation in the mobile app where live location and motion are strongest.',
              },
              {
                title: 'Protect return time',
                body: 'Keep the ship-return buffer visible so the traveler knows when to head back without guessing.',
              },
            ].map((item) => (
              <article key={item.title} className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-night">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-charcoal">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="rounded-baha-xl border border-gray-200 bg-gray-50 p-6">
            <h2 className="text-xl font-bold text-night">What the traveler should see next</h2>
            <div className="mt-4 grid gap-3 text-sm text-charcoal md:grid-cols-2">
              {[
                'Confirmed stops with photos and source details',
                'Walking order, drive segments, and estimated time at each stop',
                'Meal, beach, culture, shopping, and transport notes',
                'A clear action to open the same day in the mobile app',
              ].map((item) => (
                <div key={item} className="rounded-baha-lg border-l-2 border-brand-200 bg-white p-3 ring-1 ring-gray-200">
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Order reference</p>
            <p className="mt-3 break-all text-lg font-bold text-night">{id}</p>
            <p className="mt-3 text-sm leading-6 text-charcoal">
              Use this reference when matching the web handoff to the paid guided itinerary record.
            </p>
          </div>

          <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Next action</p>
            <h2 className="mt-3 text-xl font-bold text-night">Create the trip shell now.</h2>
            <p className="mt-2 text-sm leading-6 text-charcoal">
              This gives the traveler a place to save lodging, flights, and guided stops while the itinerary record is reconciled.
            </p>
            <Link href={createTripHref} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700">
              Create related trip
            </Link>
          </div>

          <div className="rounded-baha-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Support</p>
            <p className="mt-3 text-sm leading-6 text-charcoal">
              Need to adjust the day? Use the guided day library first, then contact support with the order reference if the route needs manual help.
            </p>
            <Link href="/contact" className="mt-4 inline-flex rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50">
              Contact support
            </Link>
          </div>
        </aside>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  )
}
