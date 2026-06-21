'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { TravelSearchSelect } from '@/components/marketplace/TravelSearchFields'

type TripOption = {
  id: string
  name: string
}

export interface StayDetailActionsProps {
  hotelId: string
  hotelName: string
  island?: string | null
  imageUrl?: string | null
  propertyTypeName?: string | null
  starRating?: number | null
  reviewScore?: number | null
}

type AuthState = 'loading' | 'guest' | 'ready'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function StayDetailActions({
  hotelId,
  hotelName,
  island,
  imageUrl,
  propertyTypeName,
  starRating,
  reviewScore,
}: StayDetailActionsProps) {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [trips, setTrips] = useState<TripOption[]>([])
  const [selectedTripId, setSelectedTripId] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const returnPath = `/stays/${encodeURIComponent(hotelId)}#trip-actions`
  const loginHref = `/login?redirect=${encodeURIComponent(returnPath)}`
  const createTripHref = `/dashboard/trips/new?returnTo=${encodeURIComponent(returnPath)}&source=stay`

  useEffect(() => {
    let mounted = true

    async function loadTrips() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!mounted) return
      if (!user) {
        setAuthState('guest')
        return
      }

      const { data, error } = await supabase
        .from('trips')
        .select('id, name')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20)

      if (!mounted) return

      if (error) {
        setAuthState('ready')
        setMessage(error.message)
        setSaveState('error')
        return
      }

      const options = (data ?? []) as TripOption[]
      setTrips(options)
      setSelectedTripId(options[0]?.id ?? '')
      setAuthState('ready')
    }

    loadTrips()

    return () => {
      mounted = false
    }
  }, [])

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? null,
    [selectedTripId, trips],
  )

  async function addToTrip() {
    if (!selectedTripId) return

    setSaveState('saving')
    setMessage(null)

    try {
      const response = await fetch(`/api/trips/${encodeURIComponent(selectedTripId)}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'stay',
          sourceId: hotelId,
          sourceType: 'web_stay_detail',
          name: hotelName,
          island,
          provider: 'liteapi',
          providerHotelId: hotelId,
          imageUrl,
          metadata: {
            sourceSurface: 'web',
            propertyTypeName,
            starRating,
            reviewScore,
          },
        }),
      })

      const body = await response.json().catch(() => ({}))
      if (response.status === 401) {
        window.location.href = loginHref
        return
      }
      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : 'Could not save this stay.')
      }

      setSaveState('saved')
      setMessage(`Saved to ${selectedTrip?.name ?? 'your trip'}.`)
    } catch (error) {
      setSaveState('error')
      setMessage(error instanceof Error ? error.message : 'Could not save this stay.')
    }
  }

  return (
    <section
      id="trip-actions"
      aria-label="Stay trip actions"
      className="overflow-hidden rounded-baha-xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-100 bg-white px-5 py-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">
          Trip actions
        </p>
        <h3 className="mt-1 text-xl font-extrabold tracking-tight text-night">
          Save or check rates
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Add this stay to a trip, then compare live rooms below.
        </p>
      </div>

      <div className="space-y-4 p-5">
        <a
          href="#availability"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2"
        >
          <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
          Check rates
        </a>

        {authState === 'loading' && (
          <div className="rounded-baha-lg border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-500">
            Checking your trip list...
          </div>
        )}

        {authState === 'guest' && (
          <div className="rounded-baha-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-night">
              Sign in to save this stay to a trip.
            </p>
            <Link
              href={loginHref}
              className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              Sign in to add to trip
            </Link>
          </div>
        )}

        {authState === 'ready' && trips.length === 0 && (
          <div className="rounded-baha-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-night">
              Create a trip before saving this stay.
            </p>
            <Link
              href={createTripHref}
              className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-extrabold text-night transition-colors hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              Create trip
            </Link>
          </div>
        )}

        {authState === 'ready' && trips.length > 0 && (
          <div className="space-y-3">
            <label htmlFor="stay-trip-select" className="block">
              <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-[0.14em] text-night">
                Save to
              </span>
              <TravelSearchSelect
                id="stay-trip-select"
                aria-label="Save to"
                value={selectedTripId}
                onChange={(event) => {
                  setSelectedTripId(event.target.value)
                  setSaveState('idle')
                  setMessage(null)
                }}
                className="h-11 rounded-full"
              >
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name}
                  </option>
                ))}
              </TravelSearchSelect>
            </label>

            <button
              type="button"
              onClick={addToTrip}
              disabled={!selectedTripId || saveState === 'saving'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2"
            >
              {saveState !== 'saving' && <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />}
              {saveState === 'saving' ? 'Saving stay...' : 'Add to trip'}
            </button>

            {saveState === 'saved' && selectedTripId && (
              <Link
                href={`/trip/${encodeURIComponent(selectedTripId)}`}
                className="inline-flex w-full items-center justify-center rounded-full bg-palm px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-palm/90 focus:outline-none focus:ring-2 focus:ring-palm focus:ring-offset-2"
              >
                View trip
              </Link>
            )}
          </div>
        )}

        {message && (
          <p
            role={saveState === 'error' ? 'alert' : 'status'}
            className={`rounded-baha-lg px-4 py-3 text-sm font-semibold ${
              saveState === 'error'
                ? 'border border-red-100 bg-red-50 text-red-700'
                : 'border border-palm/20 bg-palm/10 text-palm'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
