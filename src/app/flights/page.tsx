import FlightSearchClient from '@/app/(dashboard)/flights/FlightSearchClient'
import ChatWidget from '@/components/ChatWidget'
import Footer from '@/components/Footer'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'

/**
 * /flights — public front-end flight booking page.
 *
 * Search is public. Booking and saving require auth through the
 * downstream booking route.
 */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Search and book flights | Baha Buddy',
  description:
    'Search live flight options, verify fares, prebook, and book Bahamas flights through Baha Buddy.',
}

export default function PublicFlightsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CompactPageHeader
        eyebrow="Flights"
        title="Search live flights to The Bahamas"
        subtitle="Compare current fares, review airline details, verify the offer, then book into your Baha Buddy trip."
        crumbs={[
          { href: '/', label: 'Home' },
          { label: 'Flights' },
        ]}
      />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <FlightSearchClient />
      </main>

      <Footer />
      <ChatWidget />
    </div>
  )
}
