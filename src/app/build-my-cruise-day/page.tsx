import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'

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
    <main className="min-h-screen bg-offwhite">
      <section className="bg-gradient-brand text-white">
        <div className="mx-auto max-w-4xl px-4 py-16 lg:py-20">
          <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
            Personalized cruise day
          </p>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight md:text-6xl">
            Build your Nassau cruise day around your real ship time.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-50">
            Share your arrival, departure, group, and interests. Baha Buddy will use this to prepare a smarter one-day plan.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <form name="baha-buddy-cruise-day-intake" method="POST" data-netlify="true" className="rounded-baha-xl border border-sand-200 bg-white p-6 shadow-card">
          <input type="hidden" name="form-name" value="baha-buddy-cruise-day-intake" />
          <input type="hidden" name="selected_itinerary" value={itinerary} />

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-night">Name</span>
              <input name="name" required className="mt-2 w-full rounded-baha-md border border-sand-200 px-4 py-3" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-night">Email</span>
              <input name="email" type="email" required className="mt-2 w-full rounded-baha-md border border-sand-200 px-4 py-3" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-night">Ship name</span>
              <input name="ship_name" className="mt-2 w-full rounded-baha-md border border-sand-200 px-4 py-3" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-night">Visit date</span>
              <input name="visit_date" type="date" className="mt-2 w-full rounded-baha-md border border-sand-200 px-4 py-3" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-night">Arrival time</span>
              <input name="arrival_time" type="time" className="mt-2 w-full rounded-baha-md border border-sand-200 px-4 py-3" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-night">Departure time</span>
              <input name="departure_time" type="time" className="mt-2 w-full rounded-baha-md border border-sand-200 px-4 py-3" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-night">Group size</span>
              <input name="group_size" type="number" min="1" className="mt-2 w-full rounded-baha-md border border-sand-200 px-4 py-3" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-night">Budget per person</span>
              <input name="budget_per_person" type="number" min="0" className="mt-2 w-full rounded-baha-md border border-sand-200 px-4 py-3" />
            </label>
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-night">What kind of day do you want?</span>
            <textarea name="interests" rows={5} className="mt-2 w-full rounded-baha-md border border-sand-200 px-4 py-3" placeholder="Beach, food, culture, shopping, family-friendly, low walking, premium, budget, etc." />
          </label>

          <button type="submit" className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">
            Submit cruise day details
          </button>
        </form>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  )
}
