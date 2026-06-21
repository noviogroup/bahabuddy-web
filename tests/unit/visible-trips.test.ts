import { describe, expect, test } from 'vitest'
import { fetchVisibleTrips, sortTripsByUpdatedDesc } from '@/lib/trips/visible-trips'
import type { Trip } from '@/types/database'

type QueryCall = {
  table: string
  columns: string
  eqs: Array<[string, unknown]>
  nots: Array<[string, string, unknown]>
  ins: Array<[string, unknown[]]>
}

function trip(overrides: Partial<Trip>): Trip {
  return {
    id: 'trip-1',
    user_id: 'user-1',
    name: 'Trip',
    status: 'planned',
    date_start: null,
    date_end: null,
    islands: ['Nassau'],
    party_type: 'solo',
    party_size: 1,
    budget_estimate: null,
    budget_actual: null,
    hero_image_url: null,
    created_at: '2026-06-01T12:00:00Z',
    updated_at: '2026-06-01T12:00:00Z',
    ...overrides,
  }
}

function createSupabaseMock({
  ownedTrips = [],
  collaboratorRows = [],
  sharedTrips = [],
  collaboratorError = null,
}: {
  ownedTrips?: Trip[]
  collaboratorRows?: Array<{ trip_id: string | null }>
  sharedTrips?: Trip[]
  collaboratorError?: { message?: string } | null
}) {
  const calls: QueryCall[] = []
  let tripsSelectCount = 0

  const supabase = {
    from(table: string) {
      return {
        select(columns: string) {
          const call: QueryCall = { table, columns, eqs: [], nots: [], ins: [] }
          calls.push(call)
          const result =
            table === 'trips'
              ? { data: tripsSelectCount++ === 0 ? ownedTrips : sharedTrips, error: null }
              : { data: collaboratorRows, error: collaboratorError }

          const builder = {
            eq(column: string, value: unknown) {
              call.eqs.push([column, value])
              return builder
            },
            not(column: string, operator: string, value: unknown) {
              call.nots.push([column, operator, value])
              return builder
            },
            in(column: string, values: unknown[]) {
              call.ins.push([column, values])
              return builder
            },
            then(resolve: (value: typeof result) => unknown, reject?: (error: unknown) => unknown) {
              return Promise.resolve(result).then(resolve, reject)
            },
          }

          return builder
        },
      }
    },
  }

  return { supabase, calls }
}

describe('fetchVisibleTrips', () => {
  test('returns owned trips plus accepted collaborator trips', async () => {
    const owned = trip({ id: 'owned-trip', name: 'Owned trip', updated_at: '2026-06-01T12:00:00Z' })
    const shared = trip({
      id: 'shared-trip',
      user_id: 'owner-2',
      name: 'Shared trip',
      updated_at: '2026-06-02T12:00:00Z',
    })
    const { supabase, calls } = createSupabaseMock({
      ownedTrips: [owned],
      collaboratorRows: [{ trip_id: shared.id }],
      sharedTrips: [shared],
    })

    await expect(fetchVisibleTrips(supabase, 'user-1')).resolves.toEqual([owned, shared])

    expect(calls).toHaveLength(3)
    expect(calls[0]).toMatchObject({ table: 'trips', columns: '*', eqs: [['user_id', 'user-1']] })
    expect(calls[1]).toMatchObject({
      table: 'trip_collaborators',
      columns: 'trip_id',
      eqs: [['user_id', 'user-1']],
      nots: [['accepted_at', 'is', null]],
    })
    expect(calls[2]).toMatchObject({ table: 'trips', columns: '*', ins: [['id', ['shared-trip']]] })
  })

  test('dedupes a trip that appears as both owner and collaborator', async () => {
    const owned = trip({ id: 'trip-a', name: 'Owned version' })
    const sharedDuplicate = trip({ id: 'trip-a', name: 'Shared version' })
    const { supabase } = createSupabaseMock({
      ownedTrips: [owned],
      collaboratorRows: [{ trip_id: 'trip-a' }],
      sharedTrips: [sharedDuplicate],
    })

    await expect(fetchVisibleTrips(supabase, 'user-1')).resolves.toEqual([sharedDuplicate])
  })

  test('does not query trips by ids when there are no accepted collaborators', async () => {
    const owned = trip({ id: 'owned-trip' })
    const { supabase, calls } = createSupabaseMock({ ownedTrips: [owned] })

    await expect(fetchVisibleTrips(supabase, 'user-1')).resolves.toEqual([owned])

    expect(calls.map(call => call.table)).toEqual(['trips', 'trip_collaborators'])
  })

  test('throws instead of silently hiding shared trips when collaborator query fails', async () => {
    const { supabase } = createSupabaseMock({
      collaboratorError: { message: 'permission denied for trip_collaborators' },
    })

    await expect(fetchVisibleTrips(supabase, 'user-1')).rejects.toThrow(
      'load accepted trip collaborator rows: permission denied for trip_collaborators',
    )
  })
})

describe('sortTripsByUpdatedDesc', () => {
  test('sorts newest updated trip first', () => {
    const older = trip({ id: 'older', updated_at: '2026-06-01T12:00:00Z' })
    const newer = trip({ id: 'newer', updated_at: '2026-06-03T12:00:00Z' })

    expect(sortTripsByUpdatedDesc([older, newer]).map(item => item.id)).toEqual(['newer', 'older'])
  })
})
