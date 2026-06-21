'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import {
  TravelSearchField,
  TravelSearchInput,
  TravelSearchSelect,
} from '@/components/marketplace/TravelSearchFields'

interface RoomRate {
  rateId: string
  roomName: string
  boardName: string
  currency: string
  totalRate: number
  nightlyRate: number
  cancellationPolicy?: string
}

interface AvailabilityWidgetProps {
  hotelId: string
  hotelName: string
  initialCheckin?: string
  initialCheckout?: string
  initialAdults?: number
  initialChildren?: number
  initialRooms?: number
}

export default function AvailabilityWidget({
  hotelId,
  hotelName,
  initialCheckin,
  initialCheckout,
  initialAdults,
  initialChildren,
  initialRooms,
}: AvailabilityWidgetProps) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date()
  dayAfter.setDate(dayAfter.getDate() + 2)

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const initial = initialAvailabilityState({
    fallbackCheckin: fmt(tomorrow),
    fallbackCheckout: fmt(dayAfter),
    initialCheckin,
    initialCheckout,
    initialAdults,
    initialChildren,
    initialRooms,
  })

  const [checkin, setCheckin] = useState(initial.checkin)
  const [checkout, setCheckout] = useState(initial.checkout)
  const [adults, setAdults] = useState(initial.adults)
  const [children, setChildren] = useState(initial.children)
  const [requestedRooms, setRequestedRooms] = useState(initial.rooms)
  const [loading, setLoading] = useState(false)
  const [rooms, setRooms] = useState<RoomRate[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const nights = Math.max(
    1,
    Math.ceil((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000),
  )

  async function handleCheck(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setLoading(true)
    setError(null)
    setRooms(null)

    try {
      const res = await fetch('/api/booking/hotels/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelIds: [hotelId],
          checkin,
          checkout,
          adults,
          children: estimatedChildAges(children),
          rooms: requestedRooms,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Unable to check availability right now.')
        return
      }

      const data = await res.json()
      const firstRate = Array.isArray(data.rates) ? data.rates[0] : null
      const rateNights = Math.max(1, Number(data.nights ?? nights))
      const mappedRooms = Array.isArray(firstRate?.rooms)
        ? firstRate.rooms.map((room: Record<string, unknown>) => ({
            rateId: String(room.rate_id ?? room.offer_id ?? ''),
            roomName: String(room.name ?? 'Room'),
            boardName: String(room.board_type ?? ''),
            currency: String(room.currency ?? 'USD'),
            totalRate: Number(room.total_price ?? 0),
            nightlyRate: Number(room.total_price ?? 0) / rateNights,
            cancellationPolicy: typeof room.cancellation_summary === 'string' ? room.cancellation_summary : undefined,
          })).filter((room: RoomRate) => room.rateId && room.totalRate > 0)
        : []
      setRooms(mappedRooms)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-baha-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-white px-5 py-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">
          Live rates
        </p>
        <h3 className="mt-1 text-xl font-extrabold tracking-tight text-night">
          Check availability
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Search provider rates before continuing to guest details.
        </p>
      </div>

      <form onSubmit={handleCheck} className="p-5">
        <div className="grid grid-cols-1 gap-3">
          <TravelSearchField label="Check-in" hint="Arrival date" htmlFor="checkin">
            <TravelSearchInput
              id="checkin"
              type="date"
              value={checkin}
              min={fmt(new Date())}
              onChange={(e) => {
                setCheckin(e.target.value)
                if (e.target.value >= checkout) {
                  const next = new Date(e.target.value)
                  next.setDate(next.getDate() + 1)
                  setCheckout(fmt(next))
                }
              }}
            />
          </TravelSearchField>
          <TravelSearchField label="Check-out" hint="Departure date" htmlFor="checkout">
            <TravelSearchInput
              id="checkout"
              type="date"
              value={checkout}
              min={checkin}
              onChange={(e) => setCheckout(e.target.value)}
            />
          </TravelSearchField>
          <TravelSearchField label="Adults" hint="Age 18+" htmlFor="adults">
            <TravelSearchSelect
              id="adults"
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'adult' : 'adults'}
                </option>
              ))}
            </TravelSearchSelect>
          </TravelSearchField>
          <TravelSearchField label="Children" hint="Ages verified later" htmlFor="children">
            <TravelSearchSelect
              id="children"
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'child' : 'children'}
                </option>
              ))}
            </TravelSearchSelect>
          </TravelSearchField>
          <TravelSearchField label="Rooms" hint="Provider rate search" htmlFor="requestedRooms">
            <TravelSearchSelect
              id="requestedRooms"
              value={requestedRooms}
              onChange={(e) => setRequestedRooms(Number(e.target.value))}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'room' : 'rooms'}
                </option>
              ))}
            </TravelSearchSelect>
          </TravelSearchField>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-baha-lg border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-charcoal">
          <span>
            {adults + children} {adults + children === 1 ? 'traveler' : 'travelers'}
          </span>
          <span>
            {nights} {nights === 1 ? 'night' : 'nights'}
          </span>
          <span>
            {requestedRooms} {requestedRooms === 1 ? 'room' : 'rooms'}
          </span>
        </div>
        {children > 0 && (
          <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">
            Child ages are estimated for rate lookup and verified again before provider confirmation.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!loading && <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />}
          {loading ? 'Checking rates...' : 'Check rates'}
        </button>
      </form>

      {error && (
        <div className="mx-5 mb-5 rounded-baha-lg border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {rooms !== null && rooms.length === 0 && !error && (
        <div className="mx-5 mb-5 rounded-baha-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-charcoal">
            No rooms available for these dates. Try different dates or check back later.
          </p>
        </div>
      )}

      {rooms && rooms.length > 0 && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gray-500">
                Available rooms
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-500">
                {rooms.length} room{rooms.length !== 1 ? 's' : ''} found. Rates verify again at checkout.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {rooms.map((room, idx) => (
              <article
                key={room.rateId}
                className="rounded-baha-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-sm font-extrabold text-night">{room.roomName}</p>
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      Rate option {idx + 1}
                    </p>
                  </div>

                  {room.boardName && (
                    <p className="rounded-full bg-gray-50 px-3 py-1 text-xs font-bold text-charcoal ring-1 ring-gray-200">
                      {room.boardName}
                    </p>
                  )}

                  {room.cancellationPolicy && (
                    <p className="text-xs font-semibold text-palm">{room.cancellationPolicy}</p>
                  )}

                  <div className="rounded-baha-lg border border-gray-200 bg-white p-3">
                    <p className="text-xs font-bold text-gray-500">
                      Total for {nights} {nights === 1 ? 'night' : 'nights'}
                    </p>
                    <p className="mt-1 text-2xl font-extrabold tracking-tight text-night">
                      {formatMoney(room.currency, room.totalRate)}
                    </p>
                    <p className="text-xs font-semibold text-gray-500">
                      {formatMoney(room.currency, room.nightlyRate)} per night
                    </p>
                  </div>

                  <Link
                    href={buildGuestDetailsHref({
                      hotelId,
                      hotelName,
                      checkin,
                      checkout,
                      adults,
                      children,
                      requestedRooms,
                      room,
                    })}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-brand-700"
                  >
                    <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                    Book this room
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function buildGuestDetailsHref(input: {
  hotelId: string
  hotelName: string
  checkin: string
  checkout: string
  adults: number
  children: number
  requestedRooms: number
  room: RoomRate
}) {
  const params = new URLSearchParams({
    rate_id: input.room.rateId,
    checkin: input.checkin,
    checkout: input.checkout,
    adults: String(input.adults),
    children: String(input.children),
    rooms: String(input.requestedRooms),
    room: input.room.roomName,
    amount: String(Math.round(input.room.totalRate * 100)),
    currency: input.room.currency,
    hotel_name: input.hotelName,
  })
  return `/stays/${encodeURIComponent(input.hotelId)}/guests?${params.toString()}`
}

function initialAvailabilityState(input: {
  fallbackCheckin: string
  fallbackCheckout: string
  initialCheckin?: string
  initialCheckout?: string
  initialAdults?: number
  initialChildren?: number
  initialRooms?: number
}) {
  const checkin = isIsoDate(input.initialCheckin) ? input.initialCheckin : input.fallbackCheckin
  const checkout = isIsoDate(input.initialCheckout) && input.initialCheckout > checkin
    ? input.initialCheckout
    : nextIsoDate(checkin)

  return {
    checkin,
    checkout,
    adults: clampInt(input.initialAdults, 1, 4, 2),
    children: clampInt(input.initialChildren, 0, 4, 0),
    rooms: clampInt(input.initialRooms, 1, 4, 1),
  }
}

function isIsoDate(value: string | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(value as number)))
}

function nextIsoDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().split('T')[0]
}

function estimatedChildAges(count: number): number[] | undefined {
  if (count <= 0) return undefined
  return Array.from({ length: count }, () => 10)
}
