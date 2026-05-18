/**
 * TripStatusBadge — color-coded pill showing the trip's lifecycle status.
 *
 * Mobile reference: status chip in trip_card.dart and the status row in
 * my_trip_screen.dart.
 *
 * Status colors map to the brand palette:
 *   - draft      gray         — still being planned, no bookings yet
 *   - planned    brand-blue   — itinerary firmed up, ready to book
 *   - booked     palm-green   — bookings confirmed, future trip
 *   - active     coral        — currently traveling
 *   - completed  gold         — trip is done
 *
 * Server component — no client-side state. Safe to render inside
 * server pages without 'use client'.
 */

import type { ReactNode } from 'react'

export type TripStatus = 'draft' | 'planned' | 'booked' | 'active' | 'completed'

interface TripStatusBadgeProps {
  status: TripStatus | string | null | undefined
  size?: 'sm' | 'md'
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const STATUS_STYLES: Record<TripStatus, { bg: string; text: string; ring: string; dot: string; label: string }> = {
  draft: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    ring: 'ring-gray-200',
    dot: 'bg-gray-400',
    label: 'Draft',
  },
  planned: {
    bg: 'bg-brand-50',
    text: 'text-brand-700',
    ring: 'ring-brand-200',
    dot: 'bg-brand-500',
    label: 'Planned',
  },
  booked: {
    bg: 'bg-palm-50',
    text: 'text-palm-700',
    ring: 'ring-palm-200',
    dot: 'bg-palm-500',
    label: 'Booked',
  },
  active: {
    bg: 'bg-coral-50',
    text: 'text-coral-700',
    ring: 'ring-coral-200',
    dot: 'bg-coral-500',
    label: 'Active',
  },
  completed: {
    bg: 'bg-gold-50',
    text: 'text-gold-700',
    ring: 'ring-gold-200',
    dot: 'bg-gold-500',
    label: 'Completed',
  },
}

export default function TripStatusBadge({ status, size = 'sm' }: TripStatusBadgeProps): ReactNode {
  // Normalize: accept any string; fall back to 'draft' for unknown values.
  const key = (status ?? 'draft').toString().toLowerCase() as TripStatus
  const style = STATUS_STYLES[key] ?? STATUS_STYLES.draft

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full ring-1 font-semibold',
        style.bg,
        style.text,
        style.ring,
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      )}
    >
      <span
        className={cn('rounded-full', style.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')}
        aria-hidden="true"
      />
      {style.label}
    </span>
  )
}
