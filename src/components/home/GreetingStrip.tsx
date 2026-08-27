'use client'

/**
 * GreetingStrip — top of Home Dashboard.
 *
 * Composition: Buddy avatar (md, breathing) + time-aware greeting +
 *              subtitle + notification bell with unread badge.
 *
 * Mobile reference: lib/features/home/widgets/greeting_header.dart
 *
 * Greeting copy adapts to time of day; subtitle adapts to whether the
 * user has an active trip (passed in as `hasActiveTrip`).
 */

import { useEffect, useState } from 'react'
import { BuddyAvatar } from '@/components/ui'

export interface GreetingStripProps {
  /** First name or display_name. Falls back to "there". */
  name?: string
  /** Whether the user has any draft/planned/booked trip. */
  hasActiveTrip?: boolean
  /** Unread notification count. Hides bell badge when 0/undefined. */
  unreadCount?: number
  /** Click on the bell. Default: navigate to /profile (notifications surface comes in Phase D). */
  onBellClick?: () => void
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Hey'
}

function getSubtitle(hour: number, hasActiveTrip: boolean): string {
  if (hasActiveTrip) return 'Your trip is looking great.'
  if (hour < 12) return 'Ready to start dreaming?'
  if (hour < 17) return 'Perfect day to plan a getaway.'
  return 'Island vibes are calling.'
}

export default function GreetingStrip({
  name,
  hasActiveTrip = false,
  unreadCount = 0,
  onBellClick,
}: GreetingStripProps) {
  // Render hour on the client to avoid SSR/CSR mismatch
  const [hour, setHour] = useState<number | null>(null)
  useEffect(() => {
    setHour(new Date().getHours())
    // Update once per minute in case the user keeps the page open across noon/evening
    const id = setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => clearInterval(id)
  }, [])

  const safeName = name?.trim() || 'there'
  const greeting = hour === null ? 'Welcome back' : getGreeting(hour)
  const subtitle = hour === null ? 'Glad to see you again.' : getSubtitle(hour, hasActiveTrip)

  return (
    <div className="flex items-center gap-3 px-5 py-4 md:px-6 md:py-5">
      <BuddyAvatar size="md" state="idle" />
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-night leading-tight truncate">
          {greeting}, {safeName}
        </h1>
        <p className="text-sm text-gray-500 leading-tight mt-0.5">{subtitle}</p>
      </div>
      <button
        onClick={onBellClick}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 shadow-soft transition-colors hover:text-night focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-coral-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
