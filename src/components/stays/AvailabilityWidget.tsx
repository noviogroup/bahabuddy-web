'use client'

import { useState } from 'react'

interface RoomRate {
  roomName: string
  boardName: string
  currency: string
  totalRate: number
  nightlyRate: number
  cancellationPolicy?: string
  bookingUrl?: string
}

interface AvailabilityWidgetProps {
  hotelId: string
  hotelName: string
}

export default function AvailabilityWidget({ hotelId, hotelName }: AvailabilityWidgetProps) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date()
  dayAfter.setDate(dayAfter.getDate() + 2)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const [checkin, setCheckin] = useState(fmt(tomorrow))
  const [checkout, setCheckout] = useState(fmt(dayAfter))
  const [adults, setAdults] = useState(2)
  const [loading, setLoading] = useState(false)
  const [rooms, setRooms] = useState<RoomRate[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCheck() {
    setLoading(true)
    setError(null)
    setRooms(null)

    try {
      const res = await fetch('/api/hotel-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId, checkin, checkout, adults }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Unable to check availability right now.')
        return
      }

      const data = await res.json()
      setRooms(data.rooms ?? [])
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Check Availability</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label htmlFor="checkin" className="block text-xs text-gray-500 font-medium mb-1">
            Check-in
          </label>
          <input
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
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="checkout" className="block text-xs text-gray-500 font-medium mb-1">
            Check-out
          </label>
          <input
            id="checkout"
            type="date"
            value={checkout}
            min={checkin}
            onChange={(e) => setCheckout(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="adults" className="block text-xs text-gray-500 font-medium mb-1">
            Guests
          </label>
          <select
            id="adults"
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'guest' : 'guests'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleCheck}
        disabled={loading}
        className="w-full bg-brand-600 text-white font-semibold rounded-xl px-6 py-3 text-sm hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Checking...' : 'Check Availability'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {rooms !== null && rooms.length === 0 && !error && (
        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-sm text-amber-700">
            No rooms available for these dates. Try different dates or check back later.
          </p>
        </div>
      )}

      {rooms && rooms.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-gray-500 font-medium">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
          </p>
          {rooms.map((room, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl p-4 border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <p className="text-sm font-bold text-gray-900">{room.roomName}</p>
                {room.boardName && (
                  <p className="text-xs text-gray-500 mt-0.5">{room.boardName}</p>
                )}
                {room.cancellationPolicy && (
                  <p className="text-xs text-emerald-600 mt-0.5">{room.cancellationPolicy}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {room.currency} {room.totalRate.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {room.currency} {room.nightlyRate.toFixed(0)}/night
                  </p>
                </div>
                {room.bookingUrl ? (
                  <a
                    href={room.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-brand-600 text-white text-sm font-semibold rounded-xl px-4 py-2 hover:bg-brand-700 transition-colors whitespace-nowrap"
                  >
                    Book
                  </a>
                ) : (
                  <a
                    href={`/dashboard?q=Book+${encodeURIComponent(hotelName)}+${checkin}+to+${checkout}`}
                    className="bg-brand-600 text-white text-sm font-semibold rounded-xl px-4 py-2 hover:bg-brand-700 transition-colors whitespace-nowrap"
                  >
                    Book
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
