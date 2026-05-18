import type { Trip } from '@/types/database'

export type UserState = 'new' | 'planner' | 'booked'

/** Compute current user state from their trips list (server + client safe). */
export function deriveUserState(trips: Trip[]): {
  state: UserState
  primaryTrip: Trip | null
} {
  const now = new Date()
  const booked = trips
    .filter(t => t.status === 'booked' && t.date_start && new Date(t.date_start) > now)
    .sort((a, b) => new Date(a.date_start!).getTime() - new Date(b.date_start!).getTime())[0]
  if (booked) return { state: 'booked', primaryTrip: booked }

  const planning = trips
    .filter(t => t.status === 'draft' || t.status === 'planned')
    .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())[0]
  if (planning) return { state: 'planner', primaryTrip: planning }

  return { state: 'new', primaryTrip: null }
}
