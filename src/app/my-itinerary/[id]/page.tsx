import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'

export const metadata: Metadata = {
  title: 'My Cruise Day Itinerary',
  description: 'View your Baha Buddy cruise day plan and continue to the mobile app for Live Guide mode.',
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function MyItineraryPage({ params }: PageProps) {
  const { id } = await params

  return (
    <main className="min-h-screen bg-offwhite">
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-baha-xl border border-sand-200 bg-white p-8 shadow-card">
          <p className="text-sm font-bold uppercase tracking-wide text-brand-700">My itinerary</p>
          <h1 className="mt-3 text-4xl font-extrabold text-night">Your cruise day plan is being prepared.</h1>
          <p className="mt-4 text-charcoal leading-relaxed">
            Order reference: <span className="font-bold">{id}</span>
          </p>
          <p className="mt-4 text-charcoal leading-relaxed">
            This page is the handoff point for purchased cruise day plans. The next build step is to connect this route to `cruise_day_orders` and render the generated itinerary.
          </p>
          <div className="mt-6 rounded-baha-lg bg-brand-50 p-4 text-sm text-brand-800">
            Full turn-by-turn walking guidance should continue inside the Baha Buddy mobile app once Live Guide mode is enabled.
          </div>
          <Link href="/nassau-cruise-itineraries" className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700">
            Browse more itineraries
          </Link>
        </div>
      </section>
      <Footer />
      <ChatWidget />
    </main>
  )
}
