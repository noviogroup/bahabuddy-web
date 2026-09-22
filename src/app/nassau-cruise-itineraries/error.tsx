'use client'

export default function TourError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div role="alert" className="rounded-baha-xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-night">Tours could not be loaded</h1>
        <p className="mt-3 text-charcoal">Please try again to view the available itineraries.</p>
        <button onClick={reset} className="mt-6 min-h-11 rounded-full bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">Try again</button>
      </div>
    </main>
  )
}
