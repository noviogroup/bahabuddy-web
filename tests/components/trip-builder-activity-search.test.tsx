import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
  canonicalPlaceRow,
  createRecordingSupabase,
  hasCall,
  selfTourRow,
  type RecordedQuery,
} from '../fixtures/recording-supabase'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: mocks.createClient,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import TripBuilder from '@/components/TripBuilder'

describe('TripBuilder activity search', () => {
  let queries: RecordedQuery[]
  let rpcCalls: Array<{ name: string; params: Record<string, unknown> }>

  beforeEach(() => {
    const mock = createRecordingSupabase({
      rpc: () => ({ data: [selfTourRow()], error: null }),
      tables: () => ({
        data: [
          canonicalPlaceRow(),
          canonicalPlaceRow({
            id: '99999999-9999-4999-8999-999999999999',
            slug: 'cabbage-beach',
            name: 'Cabbage Beach',
            subcategory: 'public natural beach',
            primary_image_url: null,
          }),
        ],
        error: null,
      }),
    })
    queries = mock.queries
    rpcCalls = mock.rpcCalls
    mocks.createClient.mockReturnValue(mock.client)
  })

  test('lists approved tours plus real canonical attractions for the selected island', async () => {
    render(<TripBuilder />)

    fireEvent.click(screen.getAllByRole('button', { name: '+ Add' })[0])

    expect(await screen.findByText('Fort Fincastle')).toBeInTheDocument()
    expect(screen.getByText('Cabbage Beach')).toBeInTheDocument()
    expect(screen.getByText('Nassau / New Providence Historic & Landmark Guided Tour')).toBeInTheDocument()
    expect(screen.getByText('Beach')).toBeInTheDocument()

    await waitFor(() => expect(queries.length).toBeGreaterThan(0))
    expect(rpcCalls[0]).toMatchObject({
      name: 'get_approved_activity_recommendations',
      params: expect.objectContaining({ p_island_slug: 'nassau-paradise-island' }),
    })
    expect(queries[0].table).toBe('places')
    expect(hasCall(queries[0], 'eq', 'island_id', 'nassau-paradise-island')).toBe(true)
  })
})
