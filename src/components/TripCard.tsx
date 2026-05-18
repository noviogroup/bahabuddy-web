/**
 * TripCard — clickable card summarizing one trip.
 *
 * Used on the /trip index page (C.3). Also a candidate for surfacing
 * recent trips on the home dashboard in a future polish pass.
 *
 * Server component — no client interactivity needed. The whole card is
 * wrapped in a Link, and hover effects are pure CSS.
 *
 * D.7: hero image migrated to next/image with `fill` + `sizes` for
 * automatic responsive delivery + WebP/AVIF transcoding.
 *
 * Mobile reference: the trip preview cards on the home tab of mobile.
 */

import Image from 'next/image'
import Link from 'next/link'
import type { Trip } from '@/types/database'
import TripStatusBadge, { type TripStatus } from './TripStatusBadge'

interface TripCardProps {
  trip: Trip
}

function fmtRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'No dates yet'
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (start && end) {
    const startYear = new Date(start).getFullYear()
    const endYear = new Date(end).getFullYear()
    const yearSuffix = startYear !== new Date().getFullYear() || endYear !== startYear
      ? `, ${endYear}`
      : ''
    return `${fmt(start)} → ${fmt(end)}${yearSuffix}`
  }
  return fmt(start ?? end!)
}

function dayCount(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 0) return null
  return Math.max(1, Math.ceil(ms / 86_400_000) + 1)
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr).getTime()
  const diff = target - Date.now()
  if (diff <= 0) return null
  return Math.ceil(diff / 86_400_000)
}

export default function TripCard({ trip }: TripCardProps) {
  const days = dayCount(trip.date_start, trip.date_end)
  const countdown = daysUntil(trip.date_start)
  const isCompleted = trip.status === 'completed'

  return (
    <Link
      href={`/trip/${trip.id}`}
      className="group block bg-white rounded-baha-lg border border-gray-200 overflow-hidden shadow-soft hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
    >
      {/* Hero */}
      <div className="relative h-48 overflow-hidden bg-brand-100">
        {trip.hero_image_url ? (
          <Image
            src={trip.hero_image_url}
            alt={trip.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center ${
              isCompleted
                ? 'bg-gradient-to-br from-gold-300 to-gold-500'
                : 'bg-gradient-to-br from-brand-400 to-brand-600'
            }`}
          >
          </div>
        )}

        {/* Status badge overlay (top-left) */}
        <div className="absolute top-3 left-3 z-10">
          <TripStatusBadge status={trip.status as TripStatus} />
        </div>

        {/* Countdown chip (top-right) — only if upcoming */}
        {countdown !== null && (
          <div className="absolute top-3 right-3 z-10 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 text-white text-xs font-semibold">
            {countdown === 1 ? 'Tomorrow' : `${countdown} days`}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-bold text-night text-base leading-tight truncate group-hover:text-brand-700 transition-colors">
          {trip.name}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {fmtRange(trip.date_start, trip.date_end)}
          {days ? ` · ${days} ${days === 1 ? 'day' : 'days'}` : ''}
        </p>

        {/* Islands */}
        {trip.islands && trip.islands.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {trip.islands.slice(0, 3).map(island => (
              <span
                key={island}
                className="bg-brand-50 text-brand-700 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-brand-200"
              >
                {island}
              </span>
            ))}
            {trip.islands.length > 3 && (
              <span className="text-[11px] text-gray-400 font-medium px-2 py-0.5">
                +{trip.islands.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            {trip.party_size} {trip.party_type ?? 'traveler'}
            {(trip.party_size ?? 1) !== 1 && trip.party_type !== 'couple' && trip.party_type !== 'family' && trip.party_type !== 'friends' ? 's' : ''}
          </span>
          {trip.budget_estimate && (
            <span className="text-xs font-semibold text-brand-600">
              ${trip.budget_estimate.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
