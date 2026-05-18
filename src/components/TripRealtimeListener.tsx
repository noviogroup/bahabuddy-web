'use client'

/**
 * TripRealtimeListener — invisible mountable component that wires
 * useTripRealtime() into a server-component-rendered Trip page.
 *
 * Mount this anywhere inside the trip view's render tree. When backend
 * changes happen (chat AI adds an activity, booking webhook updates a
 * flight, etc.), the page re-fetches its server data automatically.
 *
 * Usage:
 *   // In /trip/[id]/page.tsx (server component):
 *   <TripRealtimeListener tripId={trip.id} />
 */

import { useTripRealtime } from '@/hooks/useTripRealtime'

export interface TripRealtimeListenerProps {
  tripId: string
}

export default function TripRealtimeListener({ tripId }: TripRealtimeListenerProps) {
  useTripRealtime(tripId)
  return null
}
