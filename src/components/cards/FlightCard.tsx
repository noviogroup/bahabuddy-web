'use client'

/**
 * FlightCard — Duffel-backed flight offer card.
 *
 * Phase 3 redesign vs the old inline version:
 *
 *   - Time-to-time visual hierarchy. Departure / arrival times are the
 *     biggest type after the price, separated by a clear connector line
 *     showing the duration. This is the airline-app pattern users
 *     already recognize.
 *
 *   - Stops indicator is color-coded. "Direct" gets palm-green; 1+ stops
 *     gets amber. Saves the user a re-read.
 *
 *   - Cabin class chip alongside the airline when set. Helps clarify
 *     whether the price tag is economy or business.
 *
 *   - Optional layover detail block. When `layovers` is present, a
 *     compact line lists each connection: "Layover MIA \u00b7 1h 45m". Hidden
 *     by default for direct flights since there's nothing to show.
 *
 *   - Optional baggage badge row. When Duffel ships baggage data into
 *     the card payload, we render carry-on / checked badges so the user
 *     can sanity-check the price tier without opening the offer page.
 *
 *   - Optional Save action. When `onSendMessage` is wired, a small
 *     "Save flight" pill sends a chat message to Buddy. Kept secondary
 *     to the price since Duffel offers expire in ~30 min \u2014 the user
 *     typically books the offer immediately or moves on.
 *
 * Plain CardShell mode. Flight offers are time-sensitive (Duffel offer
 * IDs expire), so there is no stable detail page to link to \u2014 all the
 * decision-supporting information lives inline.
 */

import { CardShell } from './shared'
import type { MouseEvent } from 'react'

// \u2500\u2500\u2500 Types \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export interface FlightLayover {
  /** IATA airport code or display name. */
  airport: string
  /** Pretty-formatted layover duration ("1h 45m"). */
  duration: string
}

export interface FlightCardData {
  /** Pretty route like "MIA \u2192 NAS". */
  route?: string
  airline?: string
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
  /** Optional cabin class label ("Economy", "Business"). */
  cabin_class?: string
  /** Optional ordered list of layovers. */
  layovers?: FlightLayover[]
  /** Optional baggage allowance. */
  baggage?: {
    carry_on?: boolean
    checked?: number
  }
  /** Duffel offer ID \u2014 carried for future "Book this fare" wiring. */
  duffel_offer_id?: string
}

interface Props {
  data: FlightCardData
  /** When set, a "Save flight" pill appears below the times. */
  onSendMessage?: (msg: string) => void
  className?: string
}

// \u2500\u2500\u2500 Helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function stopsToTone(stops: string | undefined): { text: string; classes: string } {
  if (!stops) return { text: '', classes: 'text-gray-500' }
  const isDirect = /direct|nonstop/i.test(stops)
  return {
    text: stops,
    classes: isDirect
      ? 'text-palm-700 bg-palm-50'
      : 'text-gold-700 bg-gold-50',
  }
}

const I = {
  plane: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
    </svg>
  ),
  bag: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  ),
}

// \u2500\u2500\u2500 Component \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export function FlightCard({ data, onSendMessage, className }: Props) {
  const {
    route, airline, departure, arrival, duration, stops,
    price = 0, cabin_class, layovers = [], baggage,
  } = data

  const stopsTone = stopsToTone(stops)
  const stop = (e: MouseEvent<HTMLButtonElement>) => e.stopPropagation()

  return (
    <CardShell mode="plain" className={className}>
      <div className="p-4 space-y-3">
        {/* Airline + cabin chip + price \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
              {I.plane}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{airline ?? 'Flight'}</p>
              {cabin_class && (
                <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded mt-0.5 inline-block uppercase tracking-wide">
                  {cabin_class}
                </span>
              )}
            </div>
          </div>
          {price > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xl font-extrabold text-brand-600 leading-none">${Math.round(price).toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mt-0.5">Total</p>
            </div>
          )}
        </div>

        {/* Time-to-time visual \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {(departure || arrival) && (
          <div className="flex items-center gap-3">
            <div className="text-center min-w-[3.5rem]">
              <p className="text-base font-bold text-gray-900 leading-none">{departure ?? '\u2014'}</p>
              {route && (
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1 font-semibold">
                  {route.split(/[\u2192>]/)[0]?.trim()}
                </p>
              )}
            </div>

            <div className="flex-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" aria-hidden="true" />
              <div className="flex-1 h-px bg-gradient-to-r from-brand-200 via-brand-400 to-brand-200 relative">
                {duration && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 bg-white px-1.5 font-semibold whitespace-nowrap">
                    {duration}
                  </span>
                )}
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" aria-hidden="true" />
            </div>

            <div className="text-center min-w-[3.5rem]">
              <p className="text-base font-bold text-gray-900 leading-none">{arrival ?? '\u2014'}</p>
              {route && (
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1 font-semibold">
                  {route.split(/[\u2192>]/)[1]?.trim()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stops + baggage row \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        <div className="flex items-center gap-2 flex-wrap">
          {stops && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stopsTone.classes}`}>
              {stopsTone.text}
            </span>
          )}
          {baggage?.carry_on && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-palm-700 bg-palm-50 px-2 py-0.5 rounded-full">
              {I.bag}
              Carry-on
            </span>
          )}
          {baggage?.checked && baggage.checked > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-palm-700 bg-palm-50 px-2 py-0.5 rounded-full">
              {I.bag}
              {baggage.checked} checked
            </span>
          )}
        </div>

        {/* Layovers when present \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {layovers.length > 0 && (
          <ul className="text-[11px] text-gray-500 space-y-0.5 border-t border-gray-100 pt-2">
            {layovers.map((l, i) => (
              <li key={i}>
                Layover {l.airport} \u00b7 {l.duration}
              </li>
            ))}
          </ul>
        )}

        {/* Save affordance \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {onSendMessage && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                stop(e)
                onSendMessage(`Save the ${airline ?? 'flight'} flight at ${departure ?? ''} for $${price} to my trip`)
              }}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 px-3 py-1 rounded-full border border-brand-200 hover:bg-brand-50 transition-colors"
            >
              Save flight
            </button>
          </div>
        )}
      </div>
    </CardShell>
  )
}
