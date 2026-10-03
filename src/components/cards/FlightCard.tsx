'use client'

/** Compare flight times, stops, baggage, and total first; expand fare rules on demand. */

import { CardShell } from './shared'
import Image from 'next/image'
import type { MouseEvent, ReactNode } from 'react'
import type { FlightBaggageSummary, FlightCheckoutLeg } from '@/lib/flight-checkout-summary'

// \u2500\u2500\u2500 Types \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export interface FlightLayover {
  /** IATA airport code or display name. */
  airport: string
  /** Pretty-formatted layover duration ("1h 45m"). */
  duration: string
}

export interface FlightCardData {
  /** Pretty route like "MIA to NAS". */
  route?: string
  airline?: string
  airline_code?: string
  flight_number?: string
  flight_numbers?: string[]
  airline_logo_url?: string
  /** Pretty departure time ("8:15 AM"). */
  departure?: string
  /** Pretty arrival time ("11:45 AM"). */
  arrival?: string
  /** Total trip duration ("2h 45m"). */
  duration?: string
  /** "Direct" | "1 stop" | "2 stops" etc. */
  stops?: string
  /** Total fare in USD. */
  price?: number
  /** Provider-supplied fare line items. Zero is a valid value. */
  base_fare?: number
  taxes?: number
  fees?: number
  currency?: string
  passengers?: number
  trip_type?: string
  flight_legs?: FlightCheckoutLeg[]
  aircraft?: string
  aircraft_types?: string[]
  aircraft_codes?: string[]
  /** Optional cabin class label ("Economy", "Business"). */
  cabin_class?: string
  fare_brand?: string
  refundable?: boolean
  changeable?: boolean
  expiration?: string
  /** Optional ordered list of layovers. */
  layovers?: FlightLayover[]
  /** Optional baggage allowance. */
  baggage?: FlightBaggageSummary
}

interface Props {
  data: FlightCardData
  /** When set, a "Save flight" pill appears below the times. */
  onSendMessage?: (msg: string) => void
  /** Direct actions supplied by the parent surface: add to trip, book, verify, etc. */
  actions?: ReactNode
  className?: string
}

// \u2500\u2500\u2500 Helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const I = {
  plane: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
    </svg>
  ),
}

function formatMoney(value: number, currency: string) {
  if (currency.toUpperCase() === 'USD') {
    return `$${Math.round(value).toLocaleString()}`
  }
  return `${currency.toUpperCase()} ${Math.round(value).toLocaleString()}`
}

function formatExpiration(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function routeParts(route: string | undefined): [string | undefined, string | undefined] {
  if (!route) return [undefined, undefined]
  const parts = route
    .split(/\s+to\s+|[\u2192>]/i)
    .map((part) => part.trim())
    .filter(Boolean)
  return [parts[0], parts[1]]
}

// \u2500\u2500\u2500 Component \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export function FlightCard({ data, onSendMessage, actions, className }: Props) {
  const {
    route, airline, departure, arrival, duration, stops,
    flight_legs = [], trip_type, price = 0, currency = 'USD', passengers = 1, cabin_class, fare_brand,
    refundable, changeable, expiration, layovers = [], baggage, airline_code, flight_number, flight_numbers, airline_logo_url,
  } = data
  const flightNumberLabel = flight_number || flight_numbers?.join(' · ')

  const stop = (e: MouseEvent<HTMLButtonElement>) => e.stopPropagation()
  const priceEach = passengers > 1 && price > 0 ? price / passengers : null
  const formattedPrice = formatMoney(price, currency)
  const travelerLabel = `${passengers} traveler${passengers === 1 ? '' : 's'}`
  const baggageLabel = baggage?.carry_on
    ? baggage?.checked && baggage.checked > 0
      ? `Carry-on + ${baggage.checked} checked`
      : 'Carry-on included'
    : baggage?.checked && baggage.checked > 0
      ? `${baggage.checked} checked`
      : 'Check fare rules'
  const fareRulesLabel = typeof refundable === 'boolean'
    ? refundable
      ? changeable ? 'Refundable · changes' : 'Refundable'
      : changeable ? 'No refund · changes' : 'No refund'
    : 'Confirm rules'
  const verificationLabel = expiration
    ? `Verify by ${formatExpiration(expiration)}`
    : 'Verify before payment'
  const legs = flight_legs.length ? flight_legs : [{ route, departure, arrival, duration, stops }]

  const metaItems = [
    { label: 'Fare', value: fare_brand ?? cabin_class ?? 'Confirm', className: 'text-gray-900' },
    {
      label: 'Rules',
      value: fareRulesLabel,
      className: refundable ? 'text-palm-700' : typeof refundable === 'boolean' ? 'text-charcoal' : 'text-gray-900',
    },
  ]

  return (
    <CardShell mode="plain" ariaLabel="Flight booking preview" className={className}>
      <div className="space-y-3 p-4">
        {/* Airline + flight timing + fare action \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        <div className="grid gap-3 lg:grid-cols-[minmax(9rem,10.5rem)_minmax(16rem,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-center gap-3">
            {airline_logo_url ? (
              <Image
                src={airline_logo_url}
                alt={`${airline ?? 'Airline'} logo`}
                width={48}
                height={32}
                unoptimized
                className="shrink-0 object-contain"
                style={{ width: '44px', height: 'auto' }}
              />
            ) : (
              <span className="flex h-8 w-11 shrink-0 items-center justify-center text-charcoal">
                {I.plane}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{airline ?? 'Flight'}</p>
              {route && (
                <p className="mt-0.5 truncate text-xs font-semibold text-gray-500">{route}</p>
              )}
              {(flightNumberLabel || airline_code || cabin_class) && (
                <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-charcoal">
                  {[flightNumberLabel, cabin_class].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            {legs.map((leg, index) => {
              const [originCode, destinationCode] = routeParts(leg.route ?? route)
              return (
                <div key={index}>
                  {legs.length > 1 && <p className="mb-1 text-xs font-medium text-gray-500">{index === 0 ? 'Outbound' : 'Return'} · {leg.route}</p>}
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-night">{leg.departure || 'Time pending'}</p>
                      <p className="text-xs text-gray-600">{originCode}</p>
                    </div>
                    <div className="min-w-16 text-center text-xs text-gray-600">
                      <p>{leg.duration}</p>
                      <div className="my-1 h-px bg-gray-200" />
                      <p>{leg.stops || 'Confirm stops'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold text-night">{leg.arrival || 'Time pending'}</p>
                      <p className="text-xs text-gray-600">{destinationCode}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex w-full flex-wrap items-start justify-between gap-3 lg:w-auto lg:flex-col lg:items-end">
            {price > 0 && (
              <div className="min-w-0 text-left lg:text-right">
                <p className="text-xl font-bold leading-none text-night">{formattedPrice}</p>
                <p className="mt-0.5 text-xs font-medium uppercase text-gray-400">
                  {currency.toUpperCase()} · {passengers > 1 ? `Total for ${passengers}` : 'Total fare'}{trip_type === 'round_trip' ? ' · Round-trip' : ''}
                </p>
                {priceEach && (
                  <p className="mt-0.5 text-xs font-semibold text-gray-500">
                    {formatMoney(priceEach, currency)} each
                  </p>
                )}
              </div>
            )}

            {(actions || onSendMessage) && (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {actions}
                {onSendMessage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      stop(e)
                      onSendMessage(`Help me decide on the ${airline ?? 'flight'} flight at ${departure ?? ''} for ${formattedPrice}`)
                    }}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-xs font-semibold text-charcoal transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-night"
                  >
                    Ask Buddy
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
          <span>{baggageLabel}</span>
          <span>{travelerLabel}</span>
        </div>
        <details className="group/details border-t border-gray-100">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-md text-sm font-semibold text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 [&::-webkit-details-marker]:hidden">
            Fare details <span aria-hidden="true" className="group-open/details:rotate-45">+</span>
          </summary>
        <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs">
          {metaItems.map((item) => (
            <div key={item.label} className="flex min-w-0 items-center gap-1.5">
              <dt className="shrink-0 font-medium text-gray-400">{item.label}</dt>
              <dd className={`font-semibold ${item.className}`} title={item.value}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-medium text-gray-500">
          <span className={expiration ? 'text-charcoal' : 'text-gray-400'}>
            {verificationLabel}
          </span>
        </div>

        {/* Layovers when present \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {layovers.length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
            {layovers.map((l, i) => (
              <li key={i}>
                Layover {l.airport}: {l.duration}
              </li>
            ))}
          </ul>
        )}
        </details>
      </div>
    </CardShell>
  )
}
