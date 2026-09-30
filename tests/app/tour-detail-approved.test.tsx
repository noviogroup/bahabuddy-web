import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import TourDetailPage from '@/app/tours/[id]/page'
import { createRecordingSupabase, selfTourRow } from '../fixtures/recording-supabase'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('not found')
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
}))

vi.mock('@/components/Footer', () => ({
  default: () => <footer>Marketplace footer</footer>,
}))

vi.mock('@/components/ChatWidget', () => ({
  default: () => null,
}))

vi.mock('@/components/TrackView', () => ({
  default: () => null,
}))

vi.mock('@/components/tours/TourGetCta', () => ({
  default: (props: { tourId: string; priceCents: number }) => (
    <div data-testid="tour-cta" data-tour-id={props.tourId} data-price={props.priceCents} />
  ),
}))

const INTERNAL_COPY = /source-approved|approved source|source gate|passes .* review|coordinate, route/i

function useApprovedRows(rows: Record<string, unknown>[]) {
  const recording = createRecordingSupabase({
    rpc: (_name, params) => ({
      data: params.p_activity_id
        ? rows.filter((row) => row.activity_id === params.p_activity_id)
        : rows,
      error: null,
    }),
  })
  mocks.createClient.mockResolvedValue(recording.client)
  return recording
}

describe('TourDetailPage approved lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('resolves an activity id with one exact RPC lookup and plain traveler copy', async () => {
    const tour = selfTourRow()
    const { rpcCalls } = useApprovedRows([tour])

    const { container } = render(await TourDetailPage({ params: { id: tour.activity_id } }))

    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0].params).toMatchObject({ p_activity_id: tour.activity_id })
    expect(screen.getByRole('heading', { level: 1, name: tour.name })).toBeInTheDocument()
    expect(screen.getByText('Self-guided tour')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tour details' })).toBeInTheDocument()
    expect(screen.getAllByText('Not listed').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Route map not available yet' })).toBeInTheDocument()
    expect(container).not.toHaveTextContent(INTERNAL_COPY)
  })

  test('still resolves older links that carry the self_tours record id', async () => {
    // Other approved rows sort ahead of the tour; the full page must be read.
    const others = Array.from({ length: 30 }, (_, index) => selfTourRow({
      activity_id: `24600000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      source_layer: 'places',
      source_record_id: `other-${index}`,
      name: `Activity ${index}`,
    }))
    const tour = selfTourRow()
    const { rpcCalls } = useApprovedRows([...others, tour])

    render(await TourDetailPage({ params: { id: tour.source_record_id } }))

    expect(screen.getByRole('heading', { level: 1, name: tour.name })).toBeInTheDocument()
    expect(rpcCalls.at(-1)?.params).toMatchObject({ p_limit: 100 })
  })

  test('does not render a non-tour activity as a tour', async () => {
    const activity = selfTourRow({ source_layer: 'places' })
    useApprovedRows([activity])

    await expect(TourDetailPage({ params: { id: activity.activity_id } })).rejects.toThrow('not found')
  })

  test('catalog links render price, preview stops and the get-tour CTA', async () => {
    const tourId = '24600000-0000-4000-8000-0000000009aa'
    const recording = createRecordingSupabase({
      rpc: () => ({ data: [], error: null }),
      tables: (query) => {
        if (query.table === 'v_self_guided_catalog') {
          return {
            data: [{
              id: tourId,
              kind: 'island_route',
              source_table: 'self_tours',
              title: 'Exuma Cays Drive',
              island: 'exuma',
              duration_minutes: 240,
              price_cents: 499,
              currency: 'USD',
              cover_image_url: null,
              stop_count: 6,
              preview_stop_count: 2,
              cruise_friendly: false,
              featured: false,
            }],
            error: null,
          }
        }
        if (query.table === 'tour_stops') {
          return {
            data: [
              { id: 's1', sequence: 1, name: 'Georgetown Market', description: 'Start here.', duration_sec: 600 },
              { id: 's2', sequence: 2, name: 'Tropic of Cancer Beach', description: null, duration_sec: null },
            ],
            error: null,
          }
        }
        return { data: [], error: null }
      },
    })
    mocks.createClient.mockResolvedValue(recording.client)

    render(await TourDetailPage({ params: { id: tourId } }))

    expect(screen.getByRole('heading', { level: 1, name: 'Exuma Cays Drive' })).toBeInTheDocument()
    expect(screen.getByText('$4.99')).toBeInTheDocument()
    expect(screen.getByText('4 hr')).toBeInTheDocument()
    expect(screen.getByText('6 stops')).toBeInTheDocument()
    expect(screen.getByTestId('tour-cta')).toHaveAttribute('data-tour-id', tourId)
    expect(screen.getByRole('heading', { name: 'Preview the first stops' })).toBeInTheDocument()
    expect(screen.getByText('Georgetown Market')).toBeInTheDocument()
    expect(screen.getByText(/4 more stops/)).toBeInTheDocument()
    const stopsQuery = recording.queries.find((query) => query.table === 'tour_stops')
    expect(stopsQuery?.calls).toContainEqual({ method: 'lte', args: ['sequence', 2] })
  })
})
