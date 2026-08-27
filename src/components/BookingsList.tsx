'use client'

/**
 * BookingsList — renders the user's flight + stay bookings list with
 * a type filter (All / Flights / Stays).
 *
 * Used by /(dashboard)/profile/bookings/page.tsx.
 *
 * The `Booking` shape is the UI-facing model — flattened, sorted,
 * and enriched from canonical bookings plus related trip item rows.
 * The page is responsible for deriving it from the DB rows.
 *
 * D.7 note: BookingsList uses inline SVG type icons and text labels.
 * If we ever add provider logos, those should go through next/image.
 */

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { BookingListItem } from '@/lib/booking-list'

export type Booking = BookingListItem

type TypeFilter = 'all' | 'flight' | 'hotel'

function formatMoney(
  n: number | null,
  currency = 'USD',
  qualifier: Booking['priceQualifier'] = null,
): string | null {
  if (!n) return null
  const formatted = n.toLocaleString('en-US', {
    style: 'currency',
    currency: (currency || 'USD').toUpperCase(),
    maximumFractionDigits: 0,
  })
  return qualifier ? `${formatted} ${qualifier}` : formatted
}

function normalizeStatus(status: string | null | undefined, reference: string | null): string {
  const raw = (status ?? '').toLowerCase()
  if (['confirmed', 'booked', 'ticketed', 'paid', 'success', 'succeeded'].includes(raw)) return 'confirmed'
  if (['failed', 'error'].includes(raw)) return 'failed'
  if (['cancelled', 'canceled'].includes(raw)) return 'cancelled'
  if (raw === 'refunded') return 'refunded'
  if (['pending', 'prebooked'].includes(raw)) return 'pending'
  if (reference) return 'confirmed'
  return 'saved'
}

function statusTone(status: string): string {
  if (status === 'confirmed') return 'bg-palm-50 text-palm-700 ring-palm-200'
  if (status === 'failed' || status === 'cancelled' || status === 'refunded') return 'bg-coral-50 text-coral-800 ring-coral-200'
  if (status === 'pending') return 'bg-gray-50 text-charcoal ring-gray-200'
  return 'bg-gray-50 text-charcoal ring-gray-200'
}

function statusLabel(status: string): string {
  if (status === 'confirmed') return 'Confirmed'
  if (status === 'failed') return 'Needs support'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'refunded') return 'Refunded'
  if (status === 'pending') return 'Pending'
  return 'Saved'
}

function providerLabel(provider: string | null | undefined): string | null {
  if (!provider) return null
  const normalized = provider.toLowerCase()
  if (normalized.includes('liteapi')) return 'Travel partner'
  return provider
}

function typeLabel(type: Booking['type']): string {
  return type === 'flight' ? 'Flight' : 'Stay'
}

function recoveryGuidance(status: string, booking: Booking): {
  title: string
  body: string
  tone: string
  actionLabel: string
  href: string
} | null {
  const href = supportHref(booking, status)

  if (status === 'failed') {
    return {
      title: 'Booking needs support',
      body: 'Do not book again yet. Support should review this booking before you retry.',
      tone: 'border-coral-200 bg-coral-50 text-coral-900',
      actionLabel: 'Contact support',
      href,
    }
  }

  if (status === 'pending') {
    return {
      title: 'Booking confirmation pending',
      body: 'Payment or airline confirmation is still being checked. Keep this booking open and avoid a duplicate purchase.',
      tone: 'border-gray-200 bg-gray-50 text-charcoal',
      actionLabel: 'Ask support to check',
      href,
    }
  }

  if (status === 'cancelled') {
    return {
      title: 'Booking cancelled',
      body: 'This booking is not active. Contact support if the cancellation was unexpected or you need the trip adjusted.',
      tone: 'border-coral-200 bg-coral-50 text-coral-900',
      actionLabel: 'Contact support',
      href,
    }
  }

  if (status === 'refunded') {
    return {
      title: 'Refund recorded',
      body: 'The booking is marked refunded. Keep the reference available if you need a receipt or trip update.',
      tone: 'border-gray-200 bg-gray-50 text-charcoal',
      actionLabel: 'Get support',
      href,
    }
  }

  return null
}

function supportHref(booking: Booking, status: string): string {
  const subject = encodeURIComponent(`Baha Buddy booking support: ${booking.bookingReference ?? booking.id}`)
  const body = encodeURIComponent([
    `Booking ID: ${booking.id}`,
    `Trip: ${booking.tripName}`,
    `Product: ${typeLabel(booking.type)}`,
    `Status: ${status}`,
    `Payment status: ${booking.paymentStatus ?? 'not set'}`,
    `Booking status: ${booking.providerStatus ?? 'not set'}`,
    `Reference: ${booking.bookingReference ?? 'pending'}`,
  ].join('\n'))
  return `mailto:support@bahabuddy.com?subject=${subject}&body=${body}`
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
          Confirmed stays and flights will appear here after checkout.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/stays"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
            Browse stays
          </Link>
          <Link
            href="/flights"
            className="inline-flex rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-night transition-colors hover:border-gray-400 hover:bg-gray-50"
          >
            Compare flights
          </Link>
        </div>
      </div>
    )
  }

  const confirmedCount = bookings.filter(b => normalizeStatus(b.status, b.bookingReference) === 'confirmed').length
  const reviewCount = bookings.filter(b => ['failed', 'pending'].includes(normalizeStatus(b.status, b.bookingReference))).length

  return (
    <div>
      {/* Summary + filters */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="text-sm text-gray-500">
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
          {flightCount > 0 && ` · ${flightCount} flight${flightCount !== 1 ? 's' : ''}`}
          {hotelCount > 0 && ` · ${hotelCount} stay${hotelCount !== 1 ? 's' : ''}`}
          {confirmedCount > 0 && ` · ${confirmedCount} confirmed`}
          {reviewCount > 0 && ` · ${reviewCount} need review`}
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
              {t === 'all' ? 'All' : t === 'flight' ? 'Flights' : 'Stays'}
            </button>
          ))}
        </div>
      </div>

      {/* Booking cards */}
      <div className="space-y-3">
        {filtered.map((b) => {
          const status = normalizeStatus(b.status, b.bookingReference)
          const price = formatMoney(b.price, b.currency ?? 'USD', b.priceQualifier ?? (b.type === 'hotel' ? 'per night' : null))
          const provider = providerLabel(b.provider)
          const recovery = recoveryGuidance(status, b)

          return (
            <div key={`${b.type}-${b.id}`} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-soft">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  b.type === 'flight' ? 'bg-gray-100 text-night' : 'bg-gray-100 text-charcoal'
                }`}>
                  {b.type === 'flight' ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16l7-3V7a2 2 0 0 1 4 0v6l7 3v2l-7-2v3l2 1.5V22l-4-1-4 1v-1.5L10 19v-3l-7 2v-2Z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 11V6a2 2 0 0 1 2-2h7a3 3 0 0 1 3 3v4M4 11h16a2 2 0 0 1 2 2v5M4 11v7m0 0h18m-18 0v2m18-2v2" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase text-gray-400">
                          {typeLabel(b.type)}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ring-1 ${statusTone(status)}`}>
                          {statusLabel(status)}
                        </span>
                      </div>
                      <h3 className="mt-1 font-bold text-gray-900 text-sm leading-snug">{b.title}</h3>
                    </div>
                    {price && (
                      <span className="text-sm font-semibold text-palm-700 shrink-0 text-right">
                        {price}
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

                  <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-3">
                    <BookingFact label="Payment" value={b.paymentStatus ?? (status === 'confirmed' ? 'paid' : status)} />
                    <BookingFact label="Provider" value={b.providerStatus ?? status} />
                    <BookingFact label="Source" value={b.sourceSurface ?? provider ?? 'Trip'} />
                  </div>

                  {recovery && (
                    <div className={`mt-3 rounded-2xl border p-3 ${recovery.tone}`}>
                      <p className="text-xs font-bold uppercase">
                        {recovery.title}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 opacity-85">
                        {recovery.body}
                      </p>
                      <a
                        href={recovery.href}
                        className="mt-2 inline-flex text-xs font-bold underline underline-offset-4"
                      >
                        {recovery.actionLabel}
                      </a>
                    </div>
                  )}

                  {/* Trip link */}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/trip/${b.tripId}`}
                      className="text-xs font-semibold text-night hover:text-gray-700"
                    >
                      View trip: {b.tripName}
                    </Link>
                    {provider && (
                      <span className="text-xs text-gray-400">
                        Provider: {provider}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BookingFact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <p className="text-xs font-bold uppercase text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 truncate font-semibold capitalize text-gray-700">
        {value || 'Not set'}
      </p>
    </div>
  )
}
