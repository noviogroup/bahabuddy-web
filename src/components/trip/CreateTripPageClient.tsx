'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ISLAND_CONFIGS, getIslandConfig, getIslandHeroImage } from '@/lib/island-config'
import { BahaImages } from '@/lib/baha-images'
import { createTripAction } from '@/app/actions/create-trip'
import { BahaDateRangePicker } from '@/components/ui'
import { TravelSearchField, TravelSearchTextarea } from '@/components/marketplace/TravelSearchFields'

type Timing = 'flexible' | 'dates'
type SubmitIntent = 'direct' | 'buddy'

const MAX_PREFS = 2000

interface CreateTripPageClientProps {
  returnTo?: string | null
  source?: string | null
  seed?: string | null
  initialDestinationSlug?: string | null
}

function getSafeReturnTo(value?: string | null): string | null {
  if (!value) return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  if (value.startsWith('/api')) return null
  return value
}

function withCreatedTrip(url: string, tripId: string): string {
  const [pathAndQuery, hash] = url.split('#')
  const separator = pathAndQuery.includes('?') ? '&' : '?'
  const nextPath = `${pathAndQuery}${separator}createdTripId=${encodeURIComponent(tripId)}`
  return hash ? `${nextPath}#${hash}` : nextPath
}

export default function CreateTripPageClient({
  returnTo,
  source,
  seed,
  initialDestinationSlug,
}: CreateTripPageClientProps) {
  const router = useRouter()
  const safeReturnTo = useMemo(() => getSafeReturnTo(returnTo), [returnTo])
  const safeInitialDestinationSlug = initialDestinationSlug && getIslandConfig(initialDestinationSlug)
    ? initialDestinationSlug
    : ISLAND_CONFIGS[0]?.slug ?? ''

  const [destinationSlug, setDestinationSlug] = useState(safeInitialDestinationSlug)
  const [timing, setTiming] = useState<Timing>('flexible')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [preferences, setPreferences] = useState((seed ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_PREFS))
  const [submitting, setSubmitting] = useState<SubmitIntent | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedIsland = getIslandConfig(destinationSlug)
  const selectedImage = selectedIsland
    ? getIslandHeroImage(selectedIsland)
    : BahaImages.bahamasLifestyle

  const canSubmit = Boolean(destinationSlug) && !submitting
  const returningFromStay = source === 'stay' || safeReturnTo?.startsWith('/stays/')
  const returningFromEditorial = source === 'guide' || source === 'article'

  async function handleSubmit(intent: SubmitIntent) {
    if (!canSubmit) return

    setSubmitting(intent)
    setError(null)

    try {
      const result = await createTripAction({
        destinationSlug,
        dateStart: timing === 'dates' && dateStart ? dateStart : null,
        dateEnd: timing === 'dates' && dateEnd ? dateEnd : null,
        preferences,
      })

      if (!result.ok || !result.tripId) {
        setError(result.error ?? 'Could not create this trip.')
        setSubmitting(null)
        return
      }

      if (intent === 'buddy') {
        const params = new URLSearchParams()
        params.set('trip', result.tripId)
        if (result.seedQuery) params.set('q', result.seedQuery)
        router.push(`/dashboard/chat?${params.toString()}`)
        return
      }

      if (safeReturnTo) {
        router.push(withCreatedTrip(safeReturnTo, result.tripId))
        return
      }

      router.push(`/trip/${encodeURIComponent(result.tripId)}`)
    } catch (err) {
      console.error('[CreateTripPageClient] submit failed', err)
      setError('Network issue. Try creating the trip again.')
      setSubmitting(null)
    }
  }

  return (
    <div className="min-h-full bg-offwhite">
      <section className="border-b border-brand-100 bg-brand-600 text-white">
        <div className="relative overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
          <div className="relative mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase text-white transition-colors hover:bg-white/20"
              >
                Dashboard
              </Link>
              <h1 className="mt-4 text-3xl font-bold">
                Create a trip
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/85">
                Build the trip record first, then add stays, flights, restaurants, tours, and notes directly.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-white px-3 py-1.5 text-brand-700">Direct planning</span>
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-white ring-1 ring-white/25">Buddy optional</span>
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-white ring-1 ring-white/25">Canonical trip</span>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <section className="rounded-baha-xl border border-sand-200 bg-white shadow-soft">
          <div className="border-b border-sand-200 px-5 py-4 sm:px-6">
            <p className="text-xs font-bold uppercase text-brand-700">
              Trip setup
            </p>
            <h2 className="mt-1 text-2xl font-bold text-night">
              Where are you going?
            </h2>
            <p className="mt-1 text-sm font-semibold text-gray-500">
              Choose an island and timing. You can refine the plan after the trip is created.
            </p>
          </div>

          <div className="space-y-7 p-5 sm:p-6">
            <fieldset>
              <legend className="text-sm font-bold text-night">Destination</legend>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {ISLAND_CONFIGS.map((island) => {
                  const isActive = island.slug === destinationSlug
                  return (
                    <button
                      key={island.slug}
                      type="button"
                      onClick={() => setDestinationSlug(island.slug)}
                      aria-pressed={isActive}
                      className={`group relative min-h-28 overflow-hidden rounded-baha-lg border text-left transition-all focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 ${
                        isActive
                          ? 'border-brand-400 shadow-card ring-2 ring-brand-200'
                          : 'border-sand-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card'
                      }`}
                    >
                      <Image
                        src={getIslandHeroImage(island)}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 50vw, 220px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-night/80 via-night/20 to-transparent" aria-hidden="true" />
                      <span className="absolute inset-x-0 bottom-0 p-3">
                        <span className="block text-sm font-bold leading-tight text-white drop-shadow">
                          {island.name}
                        </span>
                        <span className="mt-1 line-clamp-1 block text-xs font-semibold text-white/80">
                          {island.tagline}
                        </span>
                      </span>
                      {isActive && (
                        <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white shadow-card">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-bold text-night">Timing</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setTiming('flexible')}
                  aria-pressed={timing === 'flexible'}
                  className={`rounded-baha-lg border px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 ${
                    timing === 'flexible'
                      ? 'border-brand-300 bg-brand-50 text-brand-800 ring-2 ring-brand-100'
                      : 'border-sand-200 bg-white text-night hover:border-brand-200'
                  }`}
                >
                  <span className="block text-sm font-bold">Flexible dates</span>
                  <span className="mt-1 block text-xs font-semibold text-gray-500">
                    Good for early planning or open-ended trips.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTiming('dates')}
                  aria-pressed={timing === 'dates'}
                  className={`rounded-baha-lg border px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 ${
                    timing === 'dates'
                      ? 'border-brand-300 bg-brand-50 text-brand-800 ring-2 ring-brand-100'
                      : 'border-sand-200 bg-white text-night hover:border-brand-200'
                  }`}
                >
                  <span className="block text-sm font-bold">Specific dates</span>
                  <span className="mt-1 block text-xs font-semibold text-gray-500">
                    Best for live hotel and flight availability.
                  </span>
                </button>
              </div>

              {timing === 'dates' && (
                <BahaDateRangePicker
                  layout="inline"
                  start={dateStart}
                  end={dateEnd}
                  onChange={(start, end) => {
                    setDateStart(start)
                    setDateEnd(end)
                  }}
                  placeholder="Start date - End date"
                  className="mt-3"
                />
              )}
            </fieldset>

            <fieldset>
              <legend className="sr-only">Trip preferences</legend>
              <TravelSearchField
                label="Trip preferences"
                hint="Optional trip notes"
                htmlFor="trip-preferences"
                className="bg-white"
              >
                <TravelSearchTextarea
                  id="trip-preferences"
                  value={preferences}
                  onChange={(event) => setPreferences(event.target.value.slice(0, MAX_PREFS))}
                  placeholder="Travelers, budget, pace, must-dos, restaurants, accessibility needs, or anything Buddy should know."
                  rows={5}
                />
              </TravelSearchField>
              <p className="mt-1 text-right text-xs font-semibold text-gray-400">
                {preferences.length}/{MAX_PREFS} characters
              </p>
            </fieldset>

            {error && (
              <div
                role="alert"
                className="rounded-baha-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
              >
                {error}
              </div>
            )}

            <div className="space-y-3 border-t border-sand-200 pt-5">
              <p className="text-xs font-semibold text-gray-500">
                Default path: create the trip record now. Open Buddy only when you want conversation after the trip exists.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => handleSubmit('direct')}
                  disabled={!canSubmit}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-card transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2"
                >
                  {submitting === 'direct' ? 'Creating trip...' : 'Create trip'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit('buddy')}
                  disabled={!canSubmit}
                  aria-label="Create trip, then ask Buddy"
                  className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-night transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 sm:flex-none"
                >
                  {submitting === 'buddy' ? 'Creating trip, then opening Buddy...' : 'Create trip, then ask Buddy'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="overflow-hidden rounded-baha-xl border border-sand-200 bg-white shadow-soft">
            <div className="relative h-48 bg-brand-50">
              <Image
                src={selectedImage}
                alt={selectedIsland ? `${selectedIsland.name} in The Bahamas` : 'The Bahamas'}
                fill
                sizes="360px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-night/10 to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-xs font-bold uppercase text-white/75">
                  Selected island
                </p>
                <h3 className="mt-1 text-2xl font-bold text-white">
                  {selectedIsland?.name ?? 'The Bahamas'}
                </h3>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm font-semibold leading-6 text-gray-600">
                {selectedIsland?.tagline ?? 'Start with the island, then build the trip around real places and booking options.'}
              </p>

              <div className="rounded-baha-lg border border-brand-100 bg-brand-50 p-4">
                <p className="text-sm font-bold text-night">After creation</p>
                <ul className="mt-2 space-y-2 text-sm font-semibold text-gray-600">
                  <li>Create a draft trip in Supabase.</li>
                  <li>Add stays, flights, food, and tours directly.</li>
                  <li>Use Buddy when conversation adds planning value.</li>
                </ul>
              </div>

              {returningFromStay && (
                <div className="rounded-baha-lg border border-palm/20 bg-palm/10 p-4">
                  <p className="text-sm font-bold text-palm">Return path ready</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-gray-600">
                    After the trip is created, you will return to the stay page so you can save it without sending a chat prompt.
                  </p>
                </div>
              )}

              {returningFromEditorial && (
                <div className="rounded-baha-lg border border-brand-100 bg-brand-50 p-4">
                  <p className="text-sm font-bold text-brand-700">Guide context ready</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-gray-600">
                    The guide you opened is already in the trip notes. Create the trip first, then use Buddy only if you want help turning it into an itinerary.
                  </p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}
