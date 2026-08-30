'use client'

/**
 * SummaryCard — the trip-totals card Buddy shows when reviewing the plan.
 *
 * Phase 3 redesign vs the old inline version:
 *
 *   - Cost breakdown bar visualizes WHERE the money goes, not just the
 *     total. Stacked horizontal bar segmented by category (flights /
 *     hotel / activities / food / other), with a percentage legend
 *     underneath. Lets the user see at a glance whether the trip is
 *     hotel-heavy, activity-light, etc. before they commit.
 *
 *   - Per-person cost computed from total / travelers. The single most
 *     common follow-up question on any summary is "what's that per
 *     person?" — surface it without making them ask.
 *
 *   - Date range slot. When trip dates are known we render a "Jun 12 –
 *     Jun 19" line under the trip name, giving the brand-gradient header
 *     concrete grounding instead of just a label.
 *
 *   - Book CTA preserved exactly as it worked before — same Stripe
 *     checkout href shape, same gating (tripId + total_cost > 0 +
 *     isStripeConfigured). This card is the single most common entry
 *     point to checkout from chat, so the CTA contract is load-bearing.
 *
 * Like other synthesis cards, this one renders in CardShell `plain`
 * mode — no detail page to link to, no expand state. The card itself
 * IS the data.
 */

import Link from 'next/link'
import { CardShell } from './shared'
import { isStripeConfigured } from '@/lib/stripe/client'

// ─── Types ────────────────────────────────────────────────────────────────

/** Cost-breakdown shape. All fields optional; we render only what's set. */
export interface CostBreakdown {
  flights?: number
  hotel?: number
  activities?: number
  food?: number
  other?: number
}

export interface SummaryCardData {
  trip_name?: string
  /** Render alongside trip name when known. Free-form ("Jun 12 – Jun 19"). */
  date_range?: string
  days?: number
  islands?: string[]
  travelers?: number
  total_cost?: number
  /** Optional breakdown that powers the cost-breakdown bar. */
  cost_breakdown?: CostBreakdown
}

interface Props {
  data: SummaryCardData
  /** When set + total_cost > 0 + Stripe configured, renders the Book CTA. */
  tripId?: string
  className?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────

interface Segment {
  label: string
  amount: number
  /** Tailwind bg-* class for the bar segment. */
  color: string
  textColor: string
}

/**
 * Normalize a CostBreakdown into ordered segments, dropping zero/missing
 * categories. Order is deliberate — hotel is usually the largest line,
 * so it leads visually; food and other trail because they're typically
 * small slivers.
 */
function buildSegments(breakdown: CostBreakdown): Segment[] {
  const all: Segment[] = [
    { label: 'Hotel',      amount: breakdown.hotel ?? 0,      color: 'bg-brand-500',  textColor: 'text-brand-700' },
    { label: 'Flights',    amount: breakdown.flights ?? 0,    color: 'bg-gold-500',   textColor: 'text-gold-700' },
    { label: 'Activities', amount: breakdown.activities ?? 0, color: 'bg-coral-500',  textColor: 'text-coral-700' },
    { label: 'Food',       amount: breakdown.food ?? 0,       color: 'bg-palm-500',   textColor: 'text-palm-700' },
    { label: 'Other',      amount: breakdown.other ?? 0,      color: 'bg-gray-400',   textColor: 'text-gray-700' },
  ]
  return all.filter(s => s.amount > 0)
}

function fmtUSD(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

// ─── Component ────────────────────────────────────────────────────────────

export function SummaryCard({ data, tripId, className }: Props) {
  const tripName = data.trip_name ?? 'Your Trip'
  const dateRange = data.date_range
  const days = data.days ?? 0
  const islands = data.islands ?? []
  const totalCost = data.total_cost ?? 0
  const travelers = data.travelers ?? 1
  const breakdown = data.cost_breakdown ?? {}

  const segments = buildSegments(breakdown)
  const breakdownTotal = segments.reduce((s, x) => s + x.amount, 0)

  // Per-person derives from total / travelers. We trust total_cost over the
  // breakdown sum because Claude may include taxes/fees in the total that
  // aren't broken out by category.
  const perPerson = travelers > 1 && totalCost > 0
    ? Math.round(totalCost / travelers)
    : null

  const showBookCTA = Boolean(tripId) && totalCost > 0 && isStripeConfigured
  const checkoutHref = showBookCTA
    ? `/dashboard/checkout?trip_id=${encodeURIComponent(tripId!)}` +
      `&amount=${Math.round(totalCost * 100)}` +
      `&type=full_trip` +
      `&description=${encodeURIComponent(tripName)}`
    : null

  return (
    <CardShell mode="plain" accent="brand" className={className}>
      {/* Header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-4 py-3">
        <p className="text-brand-100 text-xs font-bold uppercasest">Trip summary</p>
        <p className="text-white font-bold text-lg mt-1 leading-tight">{tripName}</p>
        {dateRange && (
          <p className="text-brand-100 text-xs mt-0.5">{dateRange}</p>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Stats row ────────────────────────────────────────────────── */}
        <div className="flex divide-x divide-gray-100 -mx-1">
          {days > 0 && (
            <div className="flex-1 px-1 text-center">
              <p className="text-xs uppercase text-gray-400 font-semibold">Days</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{days}</p>
            </div>
          )}
          <div className="flex-1 px-1 text-center">
            <p className="text-xs uppercase text-gray-400 font-semibold">Travelers</p>
            <p className="text-base font-bold text-gray-900 mt-0.5">{travelers}</p>
          </div>
          {islands.length > 0 && (
            <div className="flex-1 px-1 text-center">
              <p className="text-xs uppercase text-gray-400 font-semibold">Islands</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{islands.length}</p>
            </div>
          )}
        </div>

        {/* Islands list when we have them — small inline below the stats */}
        {islands.length > 0 && (
          <p className="text-xs text-gray-500 text-center leading-snug">
            {islands.join(' · ')}
          </p>
        )}

        {/* Total + per-person + breakdown bar ──────────────────────── */}
        {totalCost > 0 && (
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-gray-700">Estimated total</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-brand-600 leading-none">{fmtUSD(totalCost)}</span>
                {perPerson != null && (
                  <p className="text-xs text-gray-500 mt-0.5">{fmtUSD(perPerson)} per person</p>
                )}
              </div>
            </div>

            {/* Stacked breakdown bar */}
            {segments.length > 0 && breakdownTotal > 0 && (
              <div>
                <div className="h-2 flex rounded-full overflow-hidden bg-gray-100" role="img" aria-label="Cost breakdown">
                  {segments.map(s => {
                    const pct = (s.amount / breakdownTotal) * 100
                    return (
                      <span
                        key={s.label}
                        className={s.color}
                        style={{ width: `${pct}%` }}
                        title={`${s.label}: ${fmtUSD(s.amount)} (${pct.toFixed(0)}%)`}
                      />
                    )
                  })}
                </div>
                <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
                  {segments.map(s => {
                    const pct = Math.round((s.amount / breakdownTotal) * 100)
                    return (
                      <li key={s.label} className="inline-flex items-center gap-1">
                        <span className="text-gray-600">{s.label}</span>
                        <span className={`font-semibold ${s.textColor}`}>{pct}%</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Book CTA ───────────────────────────────────────────────── */}
        {checkoutHref && (
          <Link
            href={checkoutHref}
            className="flex items-center justify-center gap-2 w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold py-2.5 px-4 rounded-full transition-colors shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            Book this trip
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        )}
      </div>
    </CardShell>
  )
}
