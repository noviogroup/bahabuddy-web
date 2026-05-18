'use client'

/**
 * BookingsList — renders the user's flight + hotel bookings list with
 * a type filter (All / Flights / Hotels).
 *
 * Used by /(dashboard)/profile/bookings/page.tsx.
 *
 * The `Booking` shape is the UI-facing model — flattened, sorted,
 * already enriched with trip names. The page is responsible for
 * deriving it from the DB rows.
 *
 * D.7 note: BookingsList uses text badges (FLT / HTL) for type — no
 * `<img>` tags. If we ever add provider logos (Duffel, Stripe, etc.)
 * those should go through next/image.
 */

import { useState, useMemo } from 'react'
import Link from 'next/link'

export interface Booking {
  id: string
  tripId: string
  tripName: string
  type: 'flight' | 'hotel'
  title: string
  subtitle: string | null
  dates: string | null
  price: number | null
  bookingReference: string | null
}

type TypeFilter = 'all' | 'flight' | 'hotel'

function formatMoney(n: number | null, type: 'flight' | 'hotel'): string | null {
  if (!n) return null
  const formatted = n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  return type === 'hotel' ? `${formatted}/night` : formatted
}

export default function BookingsList({ bookings }: { bookings: Booking[] }) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const filtered = useMemo(() =>
    typeFilter === 'all' ? bookings : bookings.filter(b => b.type === typeFilter),
    [bookings, typeFilter]
  )

  const flightCount = bookings.filter(b => b.type === 'flight').length
  const hotelCount = bookings.filter(b => b.type === 'hotel').length

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">No bookings yet</h2>
        <p className="text-gray-400 text-sm mb-6">
          Add flights and hotels in the Baha Buddy app — they&apos;ll appear here.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Summary + filters */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="text-sm text-gray-500">
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
          {flightCount > 0 && ` · ${flightCount} flight${flightCount !== 1 ? 's' : ''}`}
          {hotelCount > 0 && ` · ${hotelCount} hotel${hotelCount !== 1 ? 's' : ''}`}
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', 'flight', 'hotel'] as TypeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                typeFilter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t === 'all' ? 'All' : t === 'flight' ? 'Flights' : 'Hotels'}
            </button>
          ))}
        </div>
      </div>

      {/* Booking cards */}
      <div className="space-y-3">
        {filtered.map((b) => (
          <div key={`${b.type}-${b.id}`} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold uppercase shrink-0 ${
                b.type === 'flight' ? 'bg-brand-50 text-brand-700' : 'bg-purple-50 text-purple-700'
              }`}>
                {b.type === 'flight' ? 'FLT' : 'HTL'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug">{b.title}</h3>
                  {b.price != null && (
                    <span className="text-sm font-semibold text-green-600 shrink-0">
                      {formatMoney(b.price, b.type)}
                    </span>
                  )}
                </div>

                {b.subtitle && (
                  <p className="text-xs text-gray-500 mt-0.5">{b.subtitle}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  {b.dates && (
                    <span className="text-xs text-gray-500">{b.dates}</span>
                  )}
                  {b.bookingReference && (
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      Ref: {b.bookingReference}
                    </span>
                  )}
                </div>

                {/* Trip link */}
                <div className="mt-2">
                  <Link
                    href={`/trip/${b.tripId}`}
                    className="text-xs text-brand-500 hover:text-brand-700 font-medium"
                  >
                    Trip: {b.tripName} →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
