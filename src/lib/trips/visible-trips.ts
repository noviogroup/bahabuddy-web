import type { Trip } from '@/types/database'

type QueryResult<T> = PromiseLike<{ data: T | null; error: { message?: string } | null }>

type QueryBuilder<T> = QueryResult<T> & {
  eq(column: string, value: unknown): QueryBuilder<T>
  not(column: string, operator: string, value: unknown): QueryBuilder<T>
  in(column: string, values: unknown[]): QueryBuilder<T>
}

type SupabaseTripClient = {
  from(table: string): {
    select(columns: string): QueryBuilder<unknown[]>
  }
}

type TripQuery = QueryResult<Trip[]>
type CollaboratorQuery = QueryResult<Array<{ trip_id: string | null }>>

/**
 * Trips a traveler should see in app surfaces:
 * owned trips plus trips where they are an accepted collaborator.
 */
export async function fetchVisibleTrips(
  supabase: unknown,
  userId: string,
): Promise<Trip[]> {
  const client = supabase as SupabaseTripClient

  const ownedTrips = await expectRows<Trip[]>(
    'load owned trips',
    client
      .from('trips')
      .select('*')
      .eq('user_id', userId) as unknown as TripQuery,
  )

  const collaboratorRows = await expectRows<Array<{ trip_id: string | null }>>(
    'load accepted trip collaborator rows',
    client
      .from('trip_collaborators')
      .select('trip_id')
      .eq('user_id', userId)
      .not('accepted_at', 'is', null) as unknown as CollaboratorQuery,
  )

  const sharedTripIds = Array.from(
    new Set(
      collaboratorRows
        .map(row => row.trip_id)
        .filter((tripId): tripId is string => Boolean(tripId)),
    ),
  )

  if (sharedTripIds.length === 0) {
    return dedupeTrips(ownedTrips)
  }

  const sharedTrips = await expectRows<Trip[]>(
    'load accepted shared trips',
    client
      .from('trips')
      .select('*')
      .in('id', sharedTripIds) as unknown as TripQuery,
  )

  return dedupeTrips([...ownedTrips, ...sharedTrips])
}

export function sortTripsByUpdatedDesc(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => {
    const aUpdated = new Date(a.updated_at ?? a.created_at ?? 0).getTime()
    const bUpdated = new Date(b.updated_at ?? b.created_at ?? 0).getTime()
    return bUpdated - aUpdated
  })
}

async function expectRows<T extends unknown[]>(
  label: string,
  query: QueryResult<T>,
): Promise<T> {
  const { data, error } = await query
  if (error) {
    throw new Error(`${label}: ${error.message ?? 'Supabase query failed'}`)
  }
  return data ?? ([] as unknown as T)
}

function dedupeTrips(trips: Trip[]): Trip[] {
  const byId = new Map<string, Trip>()
  for (const trip of trips) {
    byId.set(trip.id, trip)
  }
  return Array.from(byId.values())
}
