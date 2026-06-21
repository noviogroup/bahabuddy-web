import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import {
  TravelSearchField,
  TravelSearchInput,
  TravelSearchTextarea,
} from '@/components/marketplace/TravelSearchFields'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'

export const metadata: Metadata = {
  title: 'Concierge Payment Confirmed',
  robots: { index: false },
}

const offerLabels: Record<string, string> = {
  quick_review: 'Quick Review',
  concierge_trip_plan: 'Concierge Trip Plan',
  full_planning_support: 'Full Planning Support',
}

export default function ConciergeSuccessPage({
  searchParams,
}: {
  searchParams?: { session_id?: string; offer?: string }
}) {
  const offer = searchParams?.offer ? offerLabels[searchParams.offer] ?? 'Concierge Trip Plan' : 'Concierge Trip Plan'

  return (
    <main className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow="Payment confirmed"
        title={`Your ${offer} payment was successful.`}
        subtitle="The next step is to send the travel details needed to prepare your plan. Your Stripe confirmation should also be sent to the email used at checkout."
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/concierge-trip-plan', label: 'Concierge' },
          { label: 'Payment confirmed' },
        ]}
        actions={(
          <>
            <Link href="/dashboard" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-extrabold text-white transition-colors hover:bg-brand-700">
              Dashboard
            </Link>
            <Link href="/concierge-trip-plan" className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50">
              View Concierge
            </Link>
          </>
        )}
      />

      <section className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-baha-xl bg-white border border-gray-200 p-6 lg:p-8 shadow-sm">
          <div className="grid md:grid-cols-[0.8fr_1.2fr] gap-8">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 uppercase tracking-wide">
                <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                Required next step
              </p>
              <h2 className="mt-3 text-3xl font-extrabold text-night">Send your trip details</h2>
              <p className="mt-4 text-charcoal leading-relaxed">
                This form gives the Baha Buddy team the dates, group size, budget, island interests,
                and special notes needed to prepare your itinerary.
              </p>
              <div className="mt-6 rounded-baha-lg bg-gray-50 border border-gray-200 p-4 text-sm text-charcoal">
                Stripe session reference: <span className="font-mono text-xs">{searchParams?.session_id ?? 'Not available'}</span>
              </div>
            </div>

            <form
              name="baha-buddy-paid-concierge-details"
              method="POST"
              action="/concierge-trip-plan/success?submitted=details"
              data-netlify="true"
              className="space-y-4"
            >
              <input type="hidden" name="form-name" value="baha-buddy-paid-concierge-details" />
              <input type="hidden" name="stripe_session_id" value={searchParams?.session_id ?? ''} />
              <input type="hidden" name="offer" value={offer} />

              <div className="grid sm:grid-cols-2 gap-4">
                <TravelSearchField label="Name" hint="Required" htmlFor="paid-concierge-name" className="bg-white">
                  <TravelSearchInput id="paid-concierge-name" name="name" required />
                </TravelSearchField>
                <TravelSearchField label="Email used at checkout" hint="Required" htmlFor="paid-concierge-email" className="bg-white">
                  <TravelSearchInput id="paid-concierge-email" name="email" type="email" required />
                </TravelSearchField>
                <TravelSearchField label="Travel dates" htmlFor="paid-concierge-dates" className="bg-white">
                  <TravelSearchInput id="paid-concierge-dates" name="travel_dates" placeholder="Exact or estimated" />
                </TravelSearchField>
                <TravelSearchField label="Group size" htmlFor="paid-concierge-group" className="bg-white">
                  <TravelSearchInput id="paid-concierge-group" name="group_size" placeholder="2 adults, family of 4" />
                </TravelSearchField>
                <TravelSearchField label="Budget range" htmlFor="paid-concierge-budget" className="bg-white">
                  <TravelSearchInput id="paid-concierge-budget" name="budget_range" placeholder="$1,500-$3,000, luxury, flexible" />
                </TravelSearchField>
                <TravelSearchField label="Preferred islands" htmlFor="paid-concierge-islands" className="bg-white">
                  <TravelSearchInput id="paid-concierge-islands" name="islands" placeholder="Nassau, Exuma, Eleuthera" />
                </TravelSearchField>
              </div>

              <TravelSearchField label="Trip style and notes" htmlFor="paid-concierge-notes" className="bg-white">
                <TravelSearchTextarea
                  id="paid-concierge-notes"
                  name="notes"
                  rows={4}
                  placeholder="Family, honeymoon, luxury, nightlife, adventure, food, accessibility, must-do activities"
                />
              </TravelSearchField>

              <button type="submit" className="w-full rounded-full bg-brand-600 px-6 py-3 text-white font-bold hover:bg-brand-700 transition-colors">
                Submit trip details
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-white font-bold transition-colors hover:bg-brand-700">
            Open dashboard
          </Link>
          <Link href="/" className="inline-flex items-center justify-center rounded-full bg-white border border-gray-300 px-6 py-3 text-night font-bold transition-colors hover:border-gray-400 hover:bg-gray-50">
            Back to homepage
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
