'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  STAY_COMPACT_SEARCH_CONTROL_CLASS_NAME,
  StaySearchRailCell,
} from '@/components/stays/StaySearchBookingControls'
import BahaDateRangePicker from '@/components/ui/date/BahaDateRangePicker'
import { FALLBACK_IMAGE } from '@/lib/baha-images'

interface RoomRate {
  rateId: string
  roomName: string
  boardName: string
  currency: string
  totalRate: number
  nightlyRate: number
  cancellationPolicy?: string
  imageUrls: string[]
}

interface AvailabilityWidgetProps {
  hotelId: string
  hotelName: string
  initialCheckin?: string
  initialCheckout?: string
  initialAdults?: number
  initialChildren?: number
  initialRooms?: number
  roomImageUrls?: string[]
}

type OpenPanel = 'guests' | 'rooms' | null

function CounterRow({
  label,
  description,
  value,
  valueLabel,
  min,
  max,
  onChange,
}: {
  label: string
  description: string
  value: number
  valueLabel: string
  min: number
  max: number
  onChange: (value: number) => void
}) {
  const actionLabel = label.toLowerCase()

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-night">
          {label}
        </p>
        <p className="mt-0.5 text-xs font-medium text-gray-500">
          {description}
        </p>
      </div>
      <div className="inline-flex shrink-0 items-center gap-3">
        <button
          type="button"
          aria-label={`Decrease ${actionLabel}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-lg font-semibold leading-none text-night shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
        >
          -
        </button>
        <span className="min-w-16 text-center text-sm font-semibold text-night">
          {valueLabel}
        </span>
        <button
          type="button"
          aria-label={`Increase ${actionLabel}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-lg font-semibold leading-none text-night shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function AvailabilityWidget({
  hotelId,
  hotelName,
  initialCheckin,
  initialCheckout,
  initialAdults,
  initialChildren,
  initialRooms,
  roomImageUrls = [],
}: AvailabilityWidgetProps) {
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const initial = initialAvailabilityState({
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
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const fallbackRoomImages = uniqueImageUrls(roomImageUrls)
  const guestLabel = `${adults} ${adults === 1 ? 'adult' : 'adults'}${children > 0 ? `, ${children} ${children === 1 ? 'child' : 'children'}` : ''}`

  const rawNights = checkin && checkout
    ? Math.ceil((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000)
    : 0
  const nights = Number.isFinite(rawNights) && rawNights > 0 ? rawNights : 1
  const hasCompleteDates = Boolean(checkin && checkout)

  useEffect(() => {
    if (!openPanel) return

    function handlePointerDown(event: MouseEvent) {
      if (!controlsRef.current?.contains(event.target as Node)) {
        setOpenPanel(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [openPanel])

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
            imageUrls: normalizeImageUrls(room.image_urls),
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
      <div className="grid gap-5 border-b border-gray-100 bg-brand-50/70 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.4fr)] lg:items-center lg:px-7">
        <div>
          <p className="text-xs font-bold uppercase text-brand-700">
            Rooms and rates
          </p>
          <h2 className="mt-1 text-2xl font-bold text-night">
            Choose your room
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal">
            Compare live room options, cancellation rules, and the total stay price before moving to guest details.
          </p>
        </div>

        {fallbackRoomImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2" aria-label={`${hotelName} property photos`}>
            {fallbackRoomImages.slice(0, 3).map((url, index) => (
              <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-baha-lg bg-stone-100">
                <Image
                  src={url}
                  alt={`${hotelName} property photo ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 30vw, 10rem"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleCheck} className="border-b border-gray-100 px-5 py-5 sm:px-6 lg:px-7">
        <div ref={controlsRef} className="relative z-20 rounded-baha-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(14rem,1.2fr)_minmax(14rem,1fr)_minmax(10rem,0.75fr)_auto]">
            <StaySearchRailCell label="Dates" icon="calendar">
              <BahaDateRangePicker
                start={checkin}
                end={checkout}
                minDate={fmt(new Date())}
                onChange={(nextStart, nextEnd) => {
                  setCheckin(nextStart)
                  setCheckout(nextStart && nextEnd && nextEnd <= nextStart ? nextIsoDate(nextStart) : nextEnd)
                }}
                placeholder="Add dates"
                showNights={false}
                showIcon={false}
                ariaLabel="Choose stay dates"
                className="min-w-0"
                triggerClassName={STAY_COMPACT_SEARCH_CONTROL_CLASS_NAME}
              />
            </StaySearchRailCell>

            <StaySearchRailCell
              label="Guests"
              icon="guests"
              className={openPanel === 'guests' ? 'border-brand-500 ring-4 ring-brand-100' : undefined}
            >
              <div className="relative min-w-0">
                <button
                  type="button"
                  aria-label="Choose guests"
                  aria-haspopup="dialog"
                  aria-expanded={openPanel === 'guests'}
                  onClick={(event) => {
                    event.currentTarget.focus()
                    setOpenPanel((current) => current === 'guests' ? null : 'guests')
                  }}
                  className="flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-none border-0 bg-transparent p-0 text-left text-sm font-medium text-night outline-none transition-colors focus:text-brand-700"
                >
                  <span className="truncate">{guestLabel}</span>
                  <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-transform ${openPanel === 'guests' ? 'rotate-180' : ''}`} aria-hidden="true">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
                      <path d="M5 7.5 10 12l5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
                {openPanel === 'guests' && (
                  <div
                    role="dialog"
                    aria-label="Guest count"
                    className="absolute left-0 z-[90] mt-3 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl shadow-gray-950/10 ring-1 ring-black/5"
                  >
                    <CounterRow
                      label="Adults"
                      description="Age 18+"
                      value={adults}
                      valueLabel={`${adults}`}
                      min={1}
                      max={8}
                      onChange={setAdults}
                    />
                    <div className="border-t border-gray-100" />
                    <CounterRow
                      label="Children"
                      description="Ages 0 to 17"
                      value={children}
                      valueLabel={`${children}`}
                      min={0}
                      max={6}
                      onChange={setChildren}
                    />
                    <button
                      type="button"
                      onClick={() => setOpenPanel(null)}
                      className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </StaySearchRailCell>

            <StaySearchRailCell
              label="Rooms"
              icon="bed"
              className={openPanel === 'rooms' ? 'border-brand-500 ring-4 ring-brand-100' : undefined}
            >
              <div className="relative min-w-0">
                <button
                  type="button"
                  aria-label="Choose rooms"
                  aria-haspopup="dialog"
                  aria-expanded={openPanel === 'rooms'}
                  onClick={(event) => {
                    event.currentTarget.focus()
                    setOpenPanel((current) => current === 'rooms' ? null : 'rooms')
                  }}
                  className="flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-none border-0 bg-transparent p-0 text-left text-sm font-medium text-night outline-none transition-colors focus:text-brand-700"
                >
                  <span className="truncate">
                    {requestedRooms} {requestedRooms === 1 ? 'room' : 'rooms'}
                  </span>
                  <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-transform ${openPanel === 'rooms' ? 'rotate-180' : ''}`} aria-hidden="true">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
                      <path d="M5 7.5 10 12l5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
                {openPanel === 'rooms' && (
                  <div
                    role="dialog"
                    aria-label="Room count"
                    className="absolute right-0 z-[90] mt-3 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl shadow-gray-950/10 ring-1 ring-black/5"
                  >
                    <CounterRow
                      label="Rooms"
                      description="Rate search"
                      value={requestedRooms}
                      valueLabel={`${requestedRooms}`}
                      min={1}
                      max={4}
                      onChange={setRequestedRooms}
                    />
                    <button
                      type="button"
                      onClick={() => setOpenPanel(null)}
                      className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </StaySearchRailCell>

            <button
              type="submit"
              disabled={loading || !hasCompleteDates}
              className="inline-flex h-full min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:min-w-40"
            >

              {loading ? 'Checking...' : 'Check rates'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-charcoal">
          <span className="rounded-full bg-gray-50 px-3 py-1.5 ring-1 ring-gray-200">
            {adults + children} {adults + children === 1 ? 'traveler' : 'travelers'}
          </span>
          {hasCompleteDates && (
            <span className="rounded-full bg-gray-50 px-3 py-1.5 ring-1 ring-gray-200">
              {nights} {nights === 1 ? 'night' : 'nights'}
            </span>
          )}
          <span className="rounded-full bg-gray-50 px-3 py-1.5 ring-1 ring-gray-200">
            {requestedRooms} {requestedRooms === 1 ? 'room' : 'rooms'}
          </span>
        </div>
        {children > 0 && (
          <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">
            Child ages help show accurate room rates and will be checked again before confirmation.
          </p>
        )}
      </form>

      <div className="px-5 py-5 sm:px-6 lg:px-7">
        {error && (
          <div className="rounded-baha-lg border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">{error}</p>
          </div>
        )}

        {rooms === null && !error && (
          <div className="grid gap-4 rounded-baha-xl border border-gray-200 bg-white p-4 md:grid-cols-[minmax(0,0.36fr)_minmax(0,1fr)] md:items-center">
            <div className="relative min-h-44 overflow-hidden rounded-baha-lg bg-stone-100">
              <Image
                src={fallbackRoomImages[0] ?? FALLBACK_IMAGE}
                alt={`${hotelName} property preview`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 24rem"
                unoptimized
              />
            </div>
            <div>
              <p className="text-sm font-bold text-night">Ready when your dates are set</p>
              <p className="mt-2 text-sm leading-6 text-charcoal">
                Run a live check to see room photos, boards, cancellation terms, and totals for this stay.
              </p>
            </div>
          </div>
        )}

        {rooms !== null && rooms.length === 0 && !error && (
          <div className="rounded-baha-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-charcoal">
              No rooms available for these dates. Try different dates or check back later.
            </p>
          </div>
        )}

        {rooms && rooms.length > 0 && (
          <div>
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">
                  Available rooms
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-500">
                  {rooms.length} room{rooms.length !== 1 ? 's' : ''} found. Rates verify again at checkout.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {rooms.map((room, idx) => {
                const roomImage = room.imageUrls[0]

                return (
                  <article
                    key={room.rateId}
                    className="grid overflow-hidden rounded-baha-xl border border-gray-200 bg-white shadow-sm md:grid-cols-[minmax(220px,0.36fr)_minmax(0,1fr)]"
                  >
                    <div className="relative min-h-56 bg-stone-100 md:min-h-full">
                      {roomImage ? (
                        <Image
                          src={roomImage}
                          alt={`${room.roomName} room photo at ${hotelName}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 28rem"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full min-h-56 flex-col justify-center bg-brand-50/70 p-5 text-night">
                          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-700 ring-1 ring-brand-100" aria-hidden="true">
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
                              <path d="M3.5 6.5h13M5 6.5v7.5m10-7.5v7.5M4 11h12M6.5 9.5h3M10.5 9.5h3M4 14h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <p className="mt-4 text-sm font-bold">
                            Room photo coming soon
                          </p>
                          <p className="mt-1 text-xs font-medium leading-5 text-charcoal">
                            This live rate does not include a room-specific image.
                          </p>
                        </div>
                      )}
                      <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-night shadow-sm">
                        Room option {idx + 1}
                      </div>
                      {roomImage && (
                        <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-night shadow-sm">
                          Room photo
                        </div>
                      )}
                    </div>

                    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                      <div>
                        <h3 className="text-lg font-bold text-night">{room.roomName}</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {room.boardName && (
                            <span className="rounded-full bg-gray-50 px-3 py-1.5 text-xs font-bold text-charcoal ring-1 ring-gray-200">
                              {room.boardName}
                            </span>
                          )}
                          {room.cancellationPolicy && (
                            <span className="rounded-full bg-palm/10 px-3 py-1.5 text-xs font-bold text-palm ring-1 ring-palm/20">
                              {room.cancellationPolicy}
                            </span>
                          )}
                        </div>
                        <p className="mt-4 text-sm leading-6 text-charcoal">
                          {requestedRooms} {requestedRooms === 1 ? 'room' : 'rooms'} for {adults + children} {adults + children === 1 ? 'traveler' : 'travelers'} over {nights} {nights === 1 ? 'night' : 'nights'}.
                        </p>
                      </div>

                      <div className="rounded-baha-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-bold uppercase text-gray-500">
                          Total stay
                        </p>
                        <p className="mt-1 text-2xl font-bold text-night">
                          {formatMoney(room.currency, room.totalRate)}
                        </p>
                        <p className="text-xs font-semibold text-gray-500">
                          {formatMoney(room.currency, room.nightlyRate)} per night
                        </p>
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
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2"
                        >
                          Book this room
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function normalizeImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return uniqueImageUrls(value)
}

function uniqueImageUrls(values: unknown[]): string[] {
  const urls = new Set<string>()
  for (const value of values) {
    const url = validImageUrl(value)
    if (url) urls.add(url)
  }
  return Array.from(urls)
}

function validImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const url = value.trim()
  if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) return null
  return url
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
  initialCheckin?: string
  initialCheckout?: string
  initialAdults?: number
  initialChildren?: number
  initialRooms?: number
}) {
  const checkin = isIsoDate(input.initialCheckin) ? input.initialCheckin : ''
  const checkout = isIsoDate(input.initialCheckout) && input.initialCheckout > checkin
    ? input.initialCheckout
    : checkin
      ? nextIsoDate(checkin)
      : ''

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
