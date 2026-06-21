import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import {
  TravelSearchField,
  TravelSearchInput,
  TravelSearchTextarea,
} from '@/components/marketplace/TravelSearchFields'
import CompactPageHeader from '@/components/marketplace/CompactPageHeader'

export const metadata: Metadata = {
  title: 'Build My Cruise Day',
  description: 'Submit your Nassau cruise details so Baha Buddy can prepare a personalized day plan.',
}

type PageProps = {
  searchParams?: Promise<{ itinerary?: string }>
}

export default async function BuildMyCruiseDayPage({ searchParams }: PageProps) {
  const params = await searchParams
  const itinerary = params?.itinerary || ''

  return (
    <main className="min-h-screen bg-white">
      <CompactPageHeader
        eyebrow="Personalized cruise day"
        title="Build your Nassau cruise day around your real ship time."
        subtitle="Share your arrival, departure, group, and interests. Baha Buddy will use this to prepare a smarter one-day plan."
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/nassau-cruise-itineraries', label: 'Guided tours' },
          { label: 'Build my cruise day' },
        ]}
      />

      <section className="mx-auto max-w-4xl px-4 py-10">
        <form name="baha-buddy-cruise-day-intake" method="POST" data-netlify="true" className="rounded-baha-xl border border-gray-200 bg-white p-6 shadow-sm">
          <input type="hidden" name="form-name" value="baha-buddy-cruise-day-intake" />
          <input type="hidden" name="selected_itinerary" value={itinerary} />

          <div className="grid gap-5 md:grid-cols-2">
            <TravelSearchField label="Name" hint="Required" htmlFor="cruise-day-name" className="bg-white">
              <TravelSearchInput id="cruise-day-name" name="name" required />
            </TravelSearchField>
            <TravelSearchField label="Email" hint="Required" htmlFor="cruise-day-email" className="bg-white">
              <TravelSearchInput id="cruise-day-email" name="email" type="email" required />
            </TravelSearchField>
            <TravelSearchField label="Ship name" htmlFor="cruise-day-ship" className="bg-white">
              <TravelSearchInput id="cruise-day-ship" name="ship_name" />
            </TravelSearchField>
            <TravelSearchField label="Visit date" htmlFor="cruise-day-visit-date" className="bg-white">
              <TravelSearchInput id="cruise-day-visit-date" name="visit_date" type="date" />
            </TravelSearchField>
            <TravelSearchField label="Arrival time" htmlFor="cruise-day-arrival" className="bg-white">
              <TravelSearchInput id="cruise-day-arrival" name="arrival_time" type="time" />
            </TravelSearchField>
            <TravelSearchField label="Departure time" htmlFor="cruise-day-departure" className="bg-white">
              <TravelSearchInput id="cruise-day-departure" name="departure_time" type="time" />
            </TravelSearchField>
            <TravelSearchField label="Group size" htmlFor="cruise-day-group-size" className="bg-white">
              <TravelSearchInput id="cruise-day-group-size" name="group_size" type="number" min="1" />
            </TravelSearchField>
            <TravelSearchField label="Budget per person" htmlFor="cruise-day-budget" className="bg-white">
              <TravelSearchInput id="cruise-day-budget" name="budget_per_person" type="number" min="0" />
            </TravelSearchField>
          </div>

          <TravelSearchField label="What kind of day do you want?" htmlFor="cruise-day-interests" className="mt-5 bg-white">
            <TravelSearchTextarea
              id="cruise-day-interests"
              name="interests"
              rows={5}
              placeholder="Beach, food, culture, shopping, family-friendly, low walking, premium, budget"
            />
          </TravelSearchField>

          <button type="submit" className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-brand-600 px-5 py-3 font-bold text-white transition-colors hover:bg-brand-700">
            Submit cruise day details
          </button>
        </form>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  )
}
