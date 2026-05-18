'use client'

/**
 * useTripRealtime — keep the current Trip view in sync with backend changes.
 *
 * Mobile reference: lib/features/trip/providers/trip_provider.dart subscribes
 * to Supabase Realtime channels and emits state updates. On web we lean on
 * Next.js's router.refresh() — when any of the trip's tables change, we
 * re-fetch the server component data without a full navigation.
 *
 * Subscribed tables (all filtered by trip_id):
 *   - trip_activities       — chat AI adds day plans
 *   - trip_flights          — booking flow + AI flight selections
 *   - trip_accommodations   — booking flow + AI hotel selections
 *   - trips                 — status changes (draft → planned → booked)
 *
 * REQUIRES: Each table must be in the `supabase_realtime` publication.
 * If realtime isn't enabled for a table, the subscription silently no-ops —
 * the page still works, it just won't auto-refresh. Enable in SQL:
 *
 *   ALTER PUBLICATION supabase_realtime ADD TABLE
 *     trips, trip_activities, trip_flights, trip_accommodations;
 *
 * Behavior:
 *   - Debounces rapid refreshes (multiple inserts within 500ms = 1 refresh)
 *   - Cleans up channels on unmount or tripId change
 *   - Safe if Realtime isn't enabled — channel just never fires
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface UseTripRealtimeOptions {
  /** When false, the hook becomes a no-op. Lets callers gate by feature flag. */
  enabled?: boolean
  /** Optional callback fired on any change. Defaults to router.refresh(). */
  onChange?: () => void
}

export function useTripRealtime(
  tripId: string,
  { enabled = true, onChange }: UseTripRealtimeOptions = {},
): void {
  const router = useRouter()
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled || !tripId) return
    const supabase = createClient()

    const trigger = () => {
      // Debounce — coalesce bursts of inserts (e.g. AI adding 9 activities at
      // once when saving a 3-day itinerary) into a single refresh.
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => {
        if (onChange) onChange()
        else router.refresh()
      }, 500)
    }

    const channel = supabase
      .channel(`trip-realtime-${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_activities', filter: `trip_id=eq.${tripId}` },
        trigger,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_flights', filter: `trip_id=eq.${tripId}` },
        trigger,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_accommodations', filter: `trip_id=eq.${tripId}` },
        trigger,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        trigger,
      )
      .subscribe()

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      supabase.removeChannel(channel)
    }
  }, [tripId, enabled, onChange, router])
}
