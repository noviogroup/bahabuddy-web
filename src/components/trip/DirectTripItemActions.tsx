'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TravelSearchField, TravelSearchSelect } from '@/components/marketplace/TravelSearchFields'

type TripOption = {
  id: string
  name: string
}

type ItemType = 'restaurant' | 'activity' | 'transport'
type AuthState = 'loading' | 'guest' | 'ready'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type TimeSlot = 'morning' | 'afternoon' | 'evening'

export interface DirectTripItemActionsProps {
  itemType: ItemType
  sourceId: string
  sourceType: string
  name: string
  island?: string | null
  imageUrl?: string | null
  returnPath: string
  heading?: string
  description?: string
  primaryLabel?: string
  createTripLabel?: string
  savedLabel?: string
  timeSlot?: TimeSlot
  dayNumber?: number
  notes?: string | null
  metadata?: Record<string, unknown>
}

export default function DirectTripItemActions({
  itemType,
  sourceId,
  sourceType,
  name,
  island,
  imageUrl,
  returnPath,
  heading = 'Add to your trip',
  description = 'Save this to a trip without sending a chat prompt.',
  primaryLabel = 'Add to trip',
  createTripLabel = 'Create trip',
  savedLabel = 'Saved to trip',
  timeSlot = 'afternoon',
  dayNumber = 1,
  notes,
  metadata,
}: DirectTripItemActionsProps) {
  const searchParams = useSearchParams()
  const createdTripId = searchParams.get('createdTripId')
  const requestedTripId = searchParams.get('tripId')
  const requestedDayNumber = parseDayNumber(searchParams.get('dayNumber'))
  const requestedTimeSlot = parseTimeSlot(searchParams.get('timeSlot'))
  const effectiveDayNumber = requestedDayNumber ?? dayNumber
  const effectiveTimeSlot = requestedTimeSlot ?? timeSlot

  const [authState, setAuthState] = useState<AuthState>('loading')
  const [trips, setTrips] = useState<TripOption[]>([])
  const [selectedTripId, setSelectedTripId] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const loginHref = `/login?redirect=${encodeURIComponent(returnPath)}`
  const createTripHref = `/dashboard/trips/new?returnTo=${encodeURIComponent(returnPath)}&source=${encodeURIComponent(itemType)}`

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
      const preferredTrip = requestedTripId && options.find((trip) => trip.id === requestedTripId)
        ? requestedTripId
        : createdTripId && options.find((trip) => trip.id === createdTripId)
          ? createdTripId
        : options[0]?.id ?? ''

      setTrips(options)
      setSelectedTripId(preferredTrip)
      setAuthState('ready')

      if (createdTripId && preferredTrip === createdTripId) {
        setMessage('Trip created. Add this item when ready.')
        setSaveState('idle')
      } else if (requestedTripId && preferredTrip === requestedTripId) {
        setMessage(`Timeline slot ready: Day ${effectiveDayNumber} ${effectiveTimeSlot}.`)
        setSaveState('idle')
      }
    }

    loadTrips()

    return () => {
      mounted = false
    }
  }, [createdTripId, effectiveDayNumber, effectiveTimeSlot, requestedTripId])

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
          itemType,
          sourceId,
          sourceType,
          name,
          island,
          dayNumber: effectiveDayNumber,
          timeSlot: effectiveTimeSlot,
          imageUrl,
          notes,
          metadata: {
            sourceSurface: 'web',
            ...metadata,
          },
        }),
      })

      const body = await response.json().catch(() => ({}))
      if (response.status === 401) {
        window.location.href = loginHref
        return
      }
      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : 'Could not save this item.')
      }

      setSaveState('saved')
      setMessage(`${savedLabel} ${selectedTrip?.name ? `in ${selectedTrip.name}` : ''}.`.replace(' .', '.'))
    } catch (error) {
      setSaveState('error')
      setMessage(error instanceof Error ? error.message : 'Could not save this item.')
    }
  }

  return (
    <section
      id="trip-actions"
      aria-label={`${heading} actions`}
      className="overflow-hidden rounded-baha-xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-100 bg-white px-5 py-4">
        <p className="text-xs font-bold uppercase text-gray-500">
          Direct action
        </p>
        <h3 className="mt-1 text-xl font-bold text-night">
          {heading}
        </h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-gray-500">
          {description}
        </p>
      </div>

      <div className="space-y-4 p-5">
        {authState === 'loading' && (
          <div className="rounded-baha-lg border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-500">
            Checking your trip list...
          </div>
        )}

        {authState === 'guest' && (
          <div className="rounded-baha-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-night">
              Sign in to save this to a trip.
            </p>
            <Link
              href={loginHref}
              className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              Sign in to add to trip
            </Link>
          </div>
        )}

        {authState === 'ready' && trips.length === 0 && (
          <div className="rounded-baha-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-night">
              Create a trip before saving this item.
            </p>
            <Link
              href={createTripHref}
              className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-night transition-colors hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              {createTripLabel}
            </Link>
          </div>
        )}

        {authState === 'ready' && trips.length > 0 && (
          <div className="space-y-3">
            <TravelSearchField label="Save to" hint="Choose trip" htmlFor={`${sourceType}-trip-select`}>
              <TravelSearchSelect
                id={`${sourceType}-trip-select`}
                value={selectedTripId}
                onChange={(event) => {
                  setSelectedTripId(event.target.value)
                  setSaveState('idle')
                  setMessage(null)
                }}
              >
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name}
                  </option>
                ))}
              </TravelSearchSelect>
            </TravelSearchField>

            <button
              type="button"
              onClick={addToTrip}
              disabled={!selectedTripId || saveState === 'saving'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2"
            >
              {saveState !== 'saving' && <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />}
              {saveState === 'saving' ? 'Saving...' : primaryLabel}
            </button>

            {saveState === 'saved' && selectedTripId && (
              <Link
                href={`/trip/${encodeURIComponent(selectedTripId)}`}
                className="inline-flex w-full items-center justify-center rounded-full bg-palm px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-palm/90 focus:outline-none focus:ring-2 focus:ring-palm focus:ring-offset-2"
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

function parseDayNumber(value: string | null): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.max(1, Math.trunc(parsed))
}

function parseTimeSlot(value: string | null): TimeSlot | null {
  if (value === 'morning' || value === 'afternoon' || value === 'evening') return value
  return null
}
