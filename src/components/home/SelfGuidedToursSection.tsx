import Link from 'next/link'
import TourCover from '@/components/guided-day/TourCover'

export default function SelfGuidedToursSection() {
  return (
    <section aria-labelledby="self-guided-heading" className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="grid overflow-hidden rounded-baha-xl border border-gray-200 bg-white md:grid-cols-2">
        <div className="self-center">
          <TourCover
            src="/assets/tours/nassau-new-providence-tour-ai-illustration.webp"
            title="Nassau heritage and waterfront"
            illustration
            sizes="(max-width: 767px) 100vw, 50vw"
          />
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <p className="text-xs font-bold uppercase text-brand-700">Self-guided tours</p>
          <h2 id="self-guided-heading" className="mt-3 text-3xl font-bold leading-tight text-night">A little guidance. Your own pace.</h2>
          <p className="mt-4 text-base leading-7 text-charcoal">
            Explore Nassau with a plan you can make your own. See the stops, check the time you need, and choose what fits your day.
          </p>
          <Link href="/nassau-cruise-itineraries" className="mt-6 inline-flex min-h-11 self-start items-center justify-center rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
            Explore self-guided tours
          </Link>
          <p className="mt-4 text-xs leading-5 text-gray-600">Destination artwork is illustrative. Check each itinerary for its actual stops and transport needs.</p>
        </div>
      </div>
    </section>
  )
}
